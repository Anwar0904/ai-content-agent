import { access, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { validateImageBuffer } from "@/services/assets/assetStorage";
import { probeMedia, type MediaProbe } from "@/services/video/ffmpeg";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export function getMediaStorageRoot(): string {
  return resolve(/* turbopackIgnore: true */ process.cwd(), process.env.MEDIA_STORAGE_PATH || "./public/generated-assets");
}

export function resolveStoredMediaPath(browserPath: string): string {
  if (!browserPath.startsWith("/generated-assets/")) throw new Error("Media path is outside generated storage.");
  const root = getMediaStorageRoot();
  const absolute = resolve(process.cwd(), "public", browserPath.slice(1));
  const relativePath = relative(root, absolute);
  if (relativePath.startsWith("..") || relativePath.includes("..")) throw new Error("Media path is outside generated storage.");
  return absolute;
}

export async function validateSceneImage(browserPath: string): Promise<string> {
  const path = resolveStoredMediaPath(browserPath);
  if (!IMAGE_EXTENSIONS.has(path.slice(path.lastIndexOf(".")).toLowerCase())) throw new Error("Scene image format is unsupported.");
  const buffer = await readFileBuffer(path);
  const mimeType = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  validateImageBuffer(buffer, mimeType);
  return path;
}

async function readFileBuffer(filePath: string): Promise<Buffer> {
  const file = await import("node:fs/promises");
  return file.readFile(filePath);
}

export async function validateFinalVideo(filePath: string): Promise<MediaProbe> {
  const fileStats = await stat(filePath);
  if (!fileStats.size) throw new Error("Rendered video is empty.");
  const probe = await probeMedia(filePath);
  const video = probe.streams.find((stream) => stream.codecType === "video");
  const audio = probe.streams.find((stream) => stream.codecType === "audio");
  if (!video || video.codecName !== "h264" || video.width !== 1080 || video.height !== 1920) throw new Error("Rendered video has invalid video properties.");
  if (!audio || audio.codecName !== "aac") throw new Error("Rendered video has invalid audio properties.");
  return probe;
}

export async function ensureDirectory(directory: string) {
  const file = await import("node:fs/promises");
  await file.mkdir(directory, { recursive: true });
}

export async function ensureFileExists(filePath: string) {
  await access(filePath);
}

export function finalVideoPath(campaignId: string, videoId: string): { filesystemPath: string; browserPath: string } {
  const directory = join(getMediaStorageRoot(), "campaigns", campaignId, "videos", videoId);
  return { filesystemPath: join(directory, "final.mp4"), browserPath: `/generated-assets/campaigns/${campaignId}/videos/${videoId}/final.mp4` };
}
