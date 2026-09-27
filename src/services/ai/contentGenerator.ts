import Campaign from "@/models/Campaign";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { buildContentGenerationSystemPrompt, buildContentGenerationUserPrompt } from "@/services/ai/promptTemplates";
import {
  contentGenerationResponseSchema,
  type ContentGenerationResponse,
  type GeneratedVideo,
} from "@/services/ai/schemas";

export interface ContentGenerationInput {
  topic: string;
  audience: string;
  videoCount: number;
  style: string;
  durationMin: number;
  durationMax: number;
}

export interface GeneratedVideoRecord {
  title: string;
  hook: string;
  script: string;
  duration: number;
  caption: string;
  hashtags: string[];
  scenes: unknown[];
}

interface ProviderRequestPayload {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  response_format?: { type: "json_object" };
}

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const baseUrl = process.env.AI_BASE_URL;
  const provider = process.env.AI_PROVIDER || "openai";

  if (!apiKey || !model || !baseUrl) {
    return null;
  }

  return { apiKey, model, provider, baseUrl };
}

function sanitizeJsonCandidate(candidate: unknown): unknown {
  if (typeof candidate !== "string") {
    return candidate;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return candidate;
  }

  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    return candidate;
  }
}

async function callProvider(input: ContentGenerationInput): Promise<unknown> {
  const aiConfig = getAiConfig();

  if (!aiConfig) {
    throw new Error("AI generation is not configured on this server.");
  }

  const requestBody: ProviderRequestPayload = {
    model: aiConfig.model,
    messages: [
      { role: "system", content: buildContentGenerationSystemPrompt() },
      { role: "user", content: buildContentGenerationUserPrompt(input) },
    ],
    response_format: { type: "json_object" },
  };

  const response = await fetch(`${aiConfig.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    let details = "AI provider request failed.";
    try {
      const errorBody = await response.json();
      if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
        const errorValue = errorBody.error;
        if (errorValue && typeof errorValue === "object" && "message" in errorValue) {
          details = typeof errorValue.message === "string" ? errorValue.message : details;
        }
      }
    } catch {
      details = `AI provider request failed with status ${response.status}.`;
    }

    throw new Error(details);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("AI provider returned an invalid response payload.");
  }

  return sanitizeJsonCandidate(content);
}

function validateGeneratedVideo(target: GeneratedVideo, campaign: { durationMin: number; durationMax: number; videoCount: number }): GeneratedVideo {
  if (!target.title?.trim() || target.title.trim().length < 2) {
    throw new Error("Every generated video must include a meaningful title.");
  }

  if (!target.hook?.trim()) {
    throw new Error("Every generated video must include a hook.");
  }

  if (!target.script?.trim()) {
    throw new Error("Every generated video must include a script.");
  }

  if (!target.caption?.trim()) {
    throw new Error("Every generated video must include a caption.");
  }

  if (!Array.isArray(target.hashtags) || target.hashtags.length < 3 || target.hashtags.length > 8) {
    throw new Error("Each generated video must include 3–8 relevant hashtags.");
  }

  if (!Array.isArray(target.scenes) || target.scenes.length !== 0) {
    throw new Error("Day 5 generation must leave scenes empty.");
  }

  if (!Number.isInteger(target.duration) || target.duration < campaign.durationMin || target.duration > campaign.durationMax) {
    throw new Error(`Video duration must fall within ${campaign.durationMin}–${campaign.durationMax} seconds.`);
  }

  const duplicateTitles = target.title.trim().toLowerCase();
  if (!duplicateTitles) {
    throw new Error("Video titles must be meaningful and distinct.");
  }

  return target;
}

function ensureBusinessRules(result: ContentGenerationResponse, campaign: { durationMin: number; durationMax: number; videoCount: number }) {
  if (!Array.isArray(result.videos) || result.videos.length !== campaign.videoCount) {
    throw new Error("Generated video count does not match the campaign requirement.");
  }

  const titles = new Set<string>();
  const hooks = new Set<string>();
  const scripts = new Set<string>();

  result.videos.forEach((video) => {
    const candidate = video as GeneratedVideo;
    const validated = validateGeneratedVideo(candidate, campaign);
    const normalizedTitle = validated.title.trim().toLowerCase();
    const normalizedHook = validated.hook.trim().toLowerCase();
    const normalizedScript = validated.script.trim().toLowerCase();

    if (titles.has(normalizedTitle) || hooks.has(normalizedHook) || scripts.has(normalizedScript)) {
      throw new Error("Generated videos contain duplicate or near-identical content.");
    }

    titles.add(normalizedTitle);
    hooks.add(normalizedHook);
    scripts.add(normalizedScript);
  });
}

export async function generateContent(input: ContentGenerationInput): Promise<GeneratedVideo[]> {
  const response = await callProvider(input);
  const parsed = contentGenerationResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new Error("The AI returned invalid structured video content.");
  }

  const campaignInput = {
    durationMin: input.durationMin,
    durationMax: input.durationMax,
    videoCount: input.videoCount,
  };

  ensureBusinessRules(parsed.data, campaignInput);

  return parsed.data.videos;
}

export async function saveGeneratedVideosForCampaign(campaignId: string, videos: GeneratedVideo[]) {
  await connectDB();

  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const payload: Array<{
    campaignId: string;
    title: string;
    hook: string;
    script: string;
    caption: string;
    hashtags: string[];
    scenes: never[];
    status: "draft";
  }> = videos.map((video) => ({
    campaignId,
    title: video.title,
    hook: video.hook,
    script: video.script,
    caption: video.caption,
    hashtags: video.hashtags,
    scenes: [],
    status: "draft",
  }));

  const createdIds: string[] = [];

  try {
    for (const item of payload) {
      const document = await Video.create(item);
      createdIds.push(document._id.toString());
    }
  } catch (error) {
    if (createdIds.length > 0) {
      await Video.deleteMany({ _id: { $in: createdIds } });
    }
    throw error;
  }

  const createdDocs = await Video.find({ _id: { $in: createdIds } }).lean();

  return createdDocs.map((document) => ({
    id: document._id.toString(),
    campaignId: document.campaignId.toString(),
    title: document.title,
    hook: document.hook,
    script: document.script,
    caption: document.caption,
    hashtags: document.hashtags,
    scenes: document.scenes,
    status: document.status,
    createdAt: document.createdAt,
  }));
}

export type { ContentGenerationResponse, GeneratedVideo };
