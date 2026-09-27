import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const MIME_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };

function storageRoot(): string {
  const configured = process.env.MEDIA_STORAGE_PATH || "./public/generated-assets";
  return resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function hasImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer.length) return false;
  if (mimeType === "image/svg+xml") return buffer.toString("utf8", 0, 256).includes("<svg");
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (mimeType === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export function validateImageBuffer(buffer: Buffer, mimeType: string): void {
  if (!MIME_EXTENSIONS[mimeType] || !hasImageSignature(buffer, mimeType)) throw new Error("Asset is not valid image data.");
}

export async function createAssetRun(campaignId: string, videoId: string, runId: string) {
  const runDirectory = join(storageRoot(), "campaigns", campaignId, "videos", videoId, `.run-${runId}`);
  await mkdir(runDirectory, { recursive: true });
  return runDirectory;
}

export async function writeRunAsset(runDirectory: string, order: number, buffer: Buffer, mimeType: string): Promise<string> {
  validateImageBuffer(buffer, mimeType);
  const extension = MIME_EXTENSIONS[mimeType];
  const filePath = join(runDirectory, `scene-${String(order).padStart(2, "0")}.${extension}`);
  await writeFile(filePath, buffer, { flag: "wx" });
  return filePath;
}

export async function promoteAssetRun(runDirectory: string, campaignId: string, videoId: string, orders: number[]) {
  const finalDirectory = join(storageRoot(), "campaigns", campaignId, "videos", videoId);
  await mkdir(finalDirectory, { recursive: true });
  const paths = new Map<number, string>();
  for (const order of orders) {
    const files = ["png", "jpg", "webp", "svg"].map((extension) => join(runDirectory, `scene-${String(order).padStart(2, "0")}.${extension}`));
    const source = await firstExisting(files);
    if (!source) throw new Error("Prepared asset is missing.");
    const destination = join(finalDirectory, basename(source));
    await rename(source, destination);
    paths.set(order, `/${relative(join(process.cwd(), "public"), destination).replace(/\\/g, "/")}`);
  }
  await rm(runDirectory, { recursive: true, force: true });
  return paths;
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    try { await readFile(path); return path; } catch { /* continue */ }
  }
  return undefined;
}

export async function cleanupAssetRun(runDirectory: string) {
  await rm(runDirectory, { recursive: true, force: true });
}
