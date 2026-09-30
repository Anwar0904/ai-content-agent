import { readFile, stat } from "node:fs/promises";
import { getServerEnv } from "@/lib/env";
import { resolveStoredMediaPath } from "@/services/video/mediaValidation";
import type { MockPublishRequest, MockPublishResult, SocialPublisher } from "./mockPublisher";

type MetaPage = {
  id?: unknown;
  name?: unknown;
  access_token?: unknown;
  tasks?: unknown;
};

type MetaResponse = {
  data?: unknown;
  error?: { message?: unknown; code?: unknown };
  success?: unknown;
  video_id?: unknown;
  upload_url?: unknown;
};

function sanitizeMetaMessage(message: string): string {
  return message
    .replace(/access[_ ]?token\s*[:=]\s*\S+/gi, "access_token=[redacted]")
    .replace(/authorization\s*[:=]\s*\S+/gi, "authorization=[redacted]")
    .replace(/https?:\/\/\S+/gi, "[url redacted]");
}

async function readMetaResponse(response: Response, failure: string): Promise<MetaResponse> {
  const payload = (await response.json().catch(() => null)) as MetaResponse | null;
  if (!response.ok || payload?.error) {
    const message = typeof payload?.error?.message === "string" ? sanitizeMetaMessage(payload.error.message) : "Meta returned an invalid response.";
    const code = typeof payload?.error?.code === "number" ? ` (code ${payload.error.code})` : "";
    throw new Error(`${failure} ${message}${code}`);
  }
  return payload ?? {};
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

export class FacebookPublisher implements SocialPublisher {
  async publish(request: MockPublishRequest): Promise<MockPublishResult> {
    if (!request.videoPath) throw new Error("Facebook publishing requires a rendered video.");

    const env = getServerEnv();
    const userToken = env.META_USER_ACCESS_TOKEN;
    const pageId = env.META_FACEBOOK_PAGE_ID;
    if (!userToken || !pageId) throw new Error("Facebook publishing configuration is incomplete.");

    const filePath = resolveStoredMediaPath(request.videoPath);
    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats?.isFile() || !fileStats.size) throw new Error("Facebook publishing requires an existing rendered MP4.");

    const version = env.META_GRAPH_API_VERSION || "v26.0";
    const graphBase = `https://graph.facebook.com/${version}`;
    const pageResponse = await fetch(`${graphBase}/me/accounts?fields=name,access_token,tasks`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const pagePayload = await readMetaResponse(pageResponse, "Facebook Page lookup failed.");
    const pages = Array.isArray(pagePayload.data) ? pagePayload.data as MetaPage[] : [];
    const page = pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new Error("Configured Facebook Page is not accessible by the current Meta user.");
    const pageToken = requiredString(page.access_token, "Facebook Page access token was not returned.");

    const startResponse = await fetch(`${graphBase}/${pageId}/video_reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start" }),
    });
    const startPayload = await readMetaResponse(startResponse, "Facebook Reel upload initialization failed.");
    const videoId = requiredString(startPayload.video_id, "Facebook Reel upload initialization returned no video ID.");
    const uploadUrl = requiredString(startPayload.upload_url, "Facebook Reel upload initialization returned no upload URL.");

    const videoBuffer = await readFile(filePath);
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${pageToken}`,
        "Content-Type": "application/octet-stream",
        offset: "0",
        file_size: String(videoBuffer.byteLength),
      },
      body: new Uint8Array(videoBuffer),
    });
    await readMetaResponse(uploadResponse, "Facebook video upload failed.");

    const finishBody: Record<string, string> = {
      video_id: videoId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
    };
    if (request.title) finishBody.title = request.title;
    if (request.caption) finishBody.description = request.caption;

    const finishResponse = await fetch(`${graphBase}/${pageId}/video_reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(finishBody),
    });
    const finishPayload = await readMetaResponse(finishResponse, "Facebook Reel publish finalization failed.");
    if (finishPayload.success !== true) throw new Error("Facebook Reel publish finalization failed: Meta did not confirm success.");

    return {
      success: true,
      platform: "facebook",
      externalPostId: videoId,
      publishedAt: new Date(),
    };
  }
}
