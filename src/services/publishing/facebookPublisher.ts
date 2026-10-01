import { readFile, stat } from "node:fs/promises";
import { getServerEnv } from "@/lib/env";
import { getFacebookPageAccessToken } from "@/app/api/social-accounts/facebook/pagesService";
import { resolveStoredMediaPath } from "@/services/video/mediaValidation";
import type { MockPublishRequest, MockPublishResult, SocialPublisher } from "./mockPublisher";

type MetaResponse = {
  data?: unknown;
  error?: { message?: unknown; code?: unknown };
  success?: unknown;
  video_id?: unknown;
  upload_url?: unknown;
};

function safeNetworkCause(error: unknown): string {
  const fields = new Set<string>();
  function visit(value: unknown, depth: number) {
    if (!value || typeof value !== "object" || depth > 3) return;
    const cause = value as Record<string, unknown>;
    if (typeof cause.code === "string" && /^(?:E[A-Z0-9_]{2,40}|UND_ERR_[A-Z_]{1,40}|ERR_[A-Z_]{1,40}|CERT_[A-Z_]{1,40}|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE)$/.test(cause.code)) fields.add(`code=${cause.code}`);
    if (typeof cause.errno === "number" && Number.isSafeInteger(cause.errno)) fields.add(`errno=${cause.errno}`);
    if (typeof cause.syscall === "string" && ["connect", "read", "write", "getaddrinfo", "queryA", "queryAAAA", "querySrv"].includes(cause.syscall)) fields.add(`syscall=${cause.syscall}`);
    if (typeof cause.hostname === "string" && /^(?:[a-z0-9-]+\.)*facebook\.com$/i.test(cause.hostname)) fields.add(`hostname=${cause.hostname}`);
    visit(cause.cause, depth + 1);
    if (Array.isArray(cause.errors)) cause.errors.slice(0, 4).forEach((item) => visit(item, depth + 1));
  }
  visit(error, 0);
  return [...fields].join(" ") || "Network request failed (no safe cause available).";
}

async function facebookFetch(url: string, init: RequestInit, stage: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    // Never attach the original error: it may contain credentials or a request URL.
    throw new Error(`${stage} request failed: ${safeNetworkCause(error)}`);
  }
}

function sanitizeMetaMessage(message: string, secrets: string[]): string {
  for (const secret of secrets) {
    if (secret) message = message.split(secret).join("[redacted]");
  }
  return message
    .replace(/\b(?:Bearer|OAuth)\s+\S+/gi, "[credential redacted]")
    .replace(/\bEA[A-Za-z0-9]{20,}\b/g, "[credential redacted]")
    .replace(/access[_ ]?token\s*[:=]\s*\S+/gi, "access_token=[redacted]")
    .replace(/authorization\s*[:=]\s*\S+/gi, "authorization=[redacted]")
    .replace(/https?:\/\/\S+/gi, "[url redacted]");
}

async function readMetaResponse(response: Response, failure: string, secrets: string[]): Promise<MetaResponse> {
  let payload: MetaResponse | null;
  try {
    payload = await response.json() as MetaResponse | null;
  } catch (error) {
    throw new Error(`${failure} HTTP ${response.status}; response body unavailable or not JSON. ${safeNetworkCause(error)}`);
  }
  if (!response.ok || !payload || typeof payload !== "object" || Array.isArray(payload) || payload.error) {
    const message = typeof payload?.error?.message === "string" ? sanitizeMetaMessage(payload.error.message, secrets) : "Meta returned an invalid response.";
    const code = typeof payload?.error?.code === "number" ? ` (code ${payload.error.code})` : "";
    throw new Error(`${failure} HTTP ${response.status}; ${message}${code}`);
  }
  return payload;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

export class FacebookPublisher implements SocialPublisher {
  async publish(request: MockPublishRequest): Promise<MockPublishResult> {
    if (!request.videoPath) throw new Error("Facebook publishing requires a rendered video.");

    const env = getServerEnv();
    const pageId = request.accountId;
    if (!pageId || !/^\d+$/.test(pageId)) throw new Error("A valid connected Facebook Page is required.");

    const filePath = resolveStoredMediaPath(request.videoPath);
    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats?.isFile() || !fileStats.size) throw new Error("Facebook publishing requires an existing rendered MP4.");

    const version = env.META_GRAPH_API_VERSION || "v26.0";
    if (!/^v\d+\.\d+$/.test(version)) throw new Error("Facebook publishing configuration is incomplete.");
    const graphBase = `https://graph.facebook.com/${version}`;
    const pageToken = await getFacebookPageAccessToken(pageId);

    const startResponse = await facebookFetch(`${graphBase}/${pageId}/video_reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start" }),
    }, "Facebook Reel upload initialization");
    const startPayload = await readMetaResponse(startResponse, "Facebook Reel upload initialization request failed:", [pageToken]);
    const videoId = requiredString(startPayload.video_id, "Facebook Reel upload initialization returned no video ID.");
    const uploadUrl = new URL(requiredString(startPayload.upload_url, "Facebook Reel upload initialization returned no upload URL."));
    if (uploadUrl.protocol !== "https:" || !/(^|\.)facebook\.com$/i.test(uploadUrl.hostname)) {
      throw new Error("Facebook returned an untrusted video upload address.");
    }

    const videoBuffer = await readFile(filePath);
    const uploadResponse = await facebookFetch(uploadUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `OAuth ${pageToken}`,
        "Content-Type": "application/octet-stream",
        offset: "0",
        file_size: String(videoBuffer.byteLength),
      },
      body: new Uint8Array(videoBuffer),
    }, "Facebook Reel binary upload");
    const uploadPayload = await readMetaResponse(uploadResponse, "Facebook Reel binary upload request failed:", [pageToken]);
    if (uploadPayload.success !== true) throw new Error("Facebook Reel binary upload request failed: Meta did not confirm success.");

    const finishBody: Record<string, string> = {
      video_id: videoId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
    };
    if (request.title) finishBody.title = request.title;
    if (request.caption) finishBody.description = request.caption;

    const finishResponse = await facebookFetch(`${graphBase}/${pageId}/video_reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(finishBody),
    }, "Facebook Reel finalization");
    const finishPayload = await readMetaResponse(finishResponse, "Facebook Reel finalization request failed:", [pageToken]);
    if (finishPayload.success !== true) throw new Error("Facebook Reel publish finalization failed: Meta did not confirm success.");

    return {
      success: true,
      platform: "facebook",
      externalPostId: videoId,
      publishedAt: new Date(),
    };
  }
}
