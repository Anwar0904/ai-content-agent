import {
  access,
  mkdir,
  readFile,
  stat,
} from "node:fs/promises";
import {
  extname,
  join,
  relative,
  resolve,
} from "node:path";

import { validateImageBuffer } from "@/services/assets/assetStorage";
import {
  probeMedia,
  type MediaProbe,
} from "@/services/video/ffmpeg";

const GENERATED_MEDIA_PREFIX =
  "/generated-assets/";

const IMAGE_EXTENSIONS =
  new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ]);

export function getMediaStorageRoot(): string {
  return resolve(
    process.cwd(),
    process.env
      .MEDIA_STORAGE_PATH ||
      "./public/generated-assets",
  );
}

export function getTtsCacheRoot(): string {
  return resolve(
    process.cwd(),
    process.env.TTS_CACHE_PATH ||
      "./.cache/ai-content-agent/tts",
  );
}

export function resolveStoredMediaPath(
  browserPath: string,
): string {
  if (
    !browserPath.startsWith(
      GENERATED_MEDIA_PREFIX,
    )
  ) {
    throw new Error(
      "Media path is outside generated storage.",
    );
  }

  const root =
    getMediaStorageRoot();

  const relativeBrowserPath =
    browserPath.slice(
      GENERATED_MEDIA_PREFIX.length,
    );

  const absolute = resolve(
    root,
    relativeBrowserPath,
  );

  const relativePath =
    relative(
      root,
      absolute,
    );

  if (
    !relativePath ||
    relativePath.startsWith(
      "..",
    ) ||
    relativePath.includes(
      `..${process.platform === "win32" ? "\\" : "/"}`,
    )
  ) {
    throw new Error(
      "Media path is outside generated storage.",
    );
  }

  return absolute;
}

export async function validateSceneImage(
  browserPath: string,
): Promise<string> {
  const path =
    resolveStoredMediaPath(
      browserPath,
    );

  const extension =
    extname(path).toLowerCase();

  if (
    !IMAGE_EXTENSIONS.has(
      extension,
    )
  ) {
    throw new Error(
      "Scene image format is unsupported.",
    );
  }

  const buffer =
    await readFile(path);

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  validateImageBuffer(
    buffer,
    mimeType,
  );

  return path;
}

export async function validateFinalVideo(
  filePath: string,
): Promise<MediaProbe> {
  const fileStats =
    await stat(filePath);

  if (
    !fileStats.isFile() ||
    fileStats.size <= 0
  ) {
    throw new Error(
      "Rendered video is empty.",
    );
  }

  const probe =
    await probeMedia(filePath);

  const video =
    probe.streams.find(
      (stream) =>
        stream.codecType ===
        "video",
    );

  const audio =
    probe.streams.find(
      (stream) =>
        stream.codecType ===
        "audio",
    );

  if (
    !video ||
    video.codecName !==
      "h264" ||
    video.width !== 1080 ||
    video.height !== 1920
  ) {
    throw new Error(
      "Rendered video has invalid video properties.",
    );
  }

  if (
    !audio ||
    audio.codecName !==
      "aac"
  ) {
    throw new Error(
      "Rendered video has invalid audio properties.",
    );
  }

  return probe;
}

export async function ensureDirectory(
  directory: string,
): Promise<void> {
  await mkdir(
    directory,
    {
      recursive: true,
    },
  );
}

export async function ensureFileExists(
  filePath: string,
): Promise<void> {
  await access(filePath);
}

export function finalVideoPath(
  campaignId: string,
  videoId: string,
): {
  filesystemPath: string;
  browserPath: string;
} {
  const directory =
    join(
      getMediaStorageRoot(),
      "campaigns",
      campaignId,
      "videos",
      videoId,
    );

  return {
    filesystemPath:
      join(
        directory,
        "final.mp4",
      ),

    browserPath:
      `/generated-assets/campaigns/${campaignId}/videos/${videoId}/final.mp4`,
  };
}