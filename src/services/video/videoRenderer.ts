import {
  createHash,
} from "node:crypto";
import {
  copyFile,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  extname,
  join,
} from "node:path";
import {
  tmpdir,
} from "node:os";

import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { generateSpeech } from "@/services/ai/tts/ttsGenerator";
import {
  FfmpegProcessError,
  probeMedia,
  runFfmpeg,
  runFfprobe,
} from "@/services/video/ffmpeg";
import {
  ensureDirectory,
  finalVideoPath,
  getTtsCacheRoot,
  validateFinalVideo,
  validateSceneImage,
} from "@/services/video/mediaValidation";
import { RenderError } from "@/services/video/renderError";
import { buildAssSubtitles } from "@/services/video/subtitleGenerator";
import { calculateSceneTimingsFromNarration } from "@/services/video/timing";
import {
  buildTemplateSceneFilter,
  validateVideoTemplate,
} from "@/templates/registry";

function concatLine(
  filePath: string,
): string {
  return `file '${filePath.replace(
    /'/g,
    "'\\''",
  )}'`;
}

export interface RenderedVideo {
  videoPath: string;
  duration: number;
}

function normalizeNarration(
  text: string,
): string {
  return text
    .replace(/\s+/g, " ")
    .trim();
}

function buildFullNarration(
  scenes: Array<{
    narration: string;
  }>,
): string {
  return scenes
    .map((scene) =>
      normalizeNarration(
        scene.narration,
      ),
    )
    .filter(Boolean)
    .map((text) => {
      /*
       * Preserve natural sentence separation between scenes.
       */
      if (
        /[.!?]$/.test(
          text,
        )
      ) {
        return text;
      }

      return `${text}.`;
    })
    .join(" ");
}

function narrationCacheIdentity(
  narration: string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      [
        process.env.TTS_MODEL ||
        "gemini-3.8-flash-lite-tts",

        process.env.TTS_VOICE ||
        "Kore",

        narration,
      ].join(":"),
    )
    .digest("hex");
}

function narrationCachePath(
  videoId: string,
  narration: string,
): string {
  const identity =
    narrationCacheIdentity(
      narration,
    ).slice(0, 24);

  return join(
    getTtsCacheRoot(),
    videoId,
    `${identity}.wav`,
  );
}

async function getCachedNarration(
  videoId: string,
  narration: string,
): Promise<
  | {
    path: string;
    duration: number;
  }
  | undefined
> {
  const path =
    narrationCachePath(
      videoId,
      narration,
    );

  try {
    const probe =
      await probeMedia(path);

    const hasAudio =
      probe.streams.some(
        (stream) =>
          stream.codecType ===
          "audio",
      );

    if (!hasAudio) {
      throw new Error(
        "Cached narration contains no audio stream.",
      );
    }

    console.info(
      "TTS narration cache hit",
      {
        videoId,
      },
    );

    return {
      path,
      duration:
        probe.duration,
    };
  } catch {
    await rm(
      path,
      {
        force: true,
      },
    ).catch(
      () => undefined,
    );

    console.info(
      "TTS narration cache miss",
      {
        videoId,
      },
    );

    return undefined;
  }
}

function getHttpStatus(
  error: unknown,
): number | undefined {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return undefined;
  }

  if (
    "status" in error &&
    typeof error.status ===
    "number"
  ) {
    return error.status;
  }

  return undefined;
}

async function sleep(
  milliseconds: number,
): Promise<void> {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

/**
 * This is deliberately bounded.
 *
 * It does NOT repeatedly hammer Gemini.
 *
 * One initial call + one delayed retry only when the provider
 * explicitly responds with 429.
 */
async function generateNarrationWithQuotaProtection(
  narration: string,
) {
  const MAX_ATTEMPTS = 2;

  for (
    let attempt = 1;
    attempt <=
    MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await generateSpeech({
        text: narration,
      });
    } catch (error) {
      const status =
        getHttpStatus(error);

      const retryable =
        status === 429;

      if (
        !retryable ||
        attempt >=
        MAX_ATTEMPTS
      ) {
        throw error;
      }

      /*
       * Low-RPM protection:
       *
       * With a 5 RPM limit, calls should not be fired back-to-back.
       * Since this renderer now needs only one normal TTS call per
       * video, this delay is only used after an actual 429.
       */
      await sleep(
        15_000,
      );
    }
  }

  throw new Error(
    "Narration generation failed.",
  );
}

async function prepareNarration({
  videoId,
  narration,
  workspace,
}: {
  videoId: string;
  narration: string;
  workspace: string;
}): Promise<{
  audioPath: string;
  duration: number;
}> {
  const cached =
    await getCachedNarration(
      videoId,
      narration,
    );

  const workspaceAudio =
    join(
      workspace,
      "narration.wav",
    );

  if (cached) {
    await copyFile(
      cached.path,
      workspaceAudio,
    );

    return {
      audioPath:
        workspaceAudio,

      duration:
        cached.duration,
    };
  }

  const speech =
    await generateNarrationWithQuotaProtection(
      narration,
    );

  const cachePath =
    narrationCachePath(
      videoId,
      narration,
    );

  await ensureDirectory(
    dirname(cachePath),
  );

  const temporaryCachePath =
    `${cachePath}.tmp-${process.pid}`;

  try {
    await writeFile(
      temporaryCachePath,
      speech.buffer,
      {
        flag: "wx",
      },
    );

    /*
     * Verify provider audio before making it a reusable cache entry.
     */
    const probe =
      await probeMedia(
        temporaryCachePath,
      );

    const hasAudio =
      probe.streams.some(
        (stream) =>
          stream.codecType ===
          "audio",
      );

    if (!hasAudio) {
      throw new Error(
        "Gemini TTS returned no audio.",
      );
    }

    await rename(
      temporaryCachePath,
      cachePath,
    );
  } finally {
    await rm(
      temporaryCachePath,
      {
        force: true,
      },
    ).catch(
      () => undefined,
    );
  }

  await copyFile(
    cachePath,
    workspaceAudio,
  );

  const probe =
    await probeMedia(
      workspaceAudio,
    );

  return {
    audioPath:
      workspaceAudio,

    duration:
      probe.duration,
  };
}

export async function renderVideo(
  videoId: string,
): Promise<RenderedVideo> {
  let stage =
    "loading video";

  let workspace:
    | string
    | undefined;

  try {
    await connectDB();

    const video =
      await Video.findById(
        videoId,
      ).lean();

    if (!video) {
      throw new Error(
        "Video not found.",
      );
    }

    if (
      !video.scenes?.length
    ) {
      throw new Error(
        "Video has no scenes to render.",
      );
    }

    if (
      video.scenes.some(
        (scene) =>
          !scene.narration?.trim() ||
          !scene.assetPath,
      )
    ) {
      throw new Error(
        "Every scene needs narration and an image asset.",
      );
    }

    await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          status:
            "rendering",
        },
      },
    );

    stage =
      "validating scenes and template";

    const uniqueOrders =
      new Set(
        video.scenes.map(
          (scene) =>
            scene.order,
        ),
      );

    if (
      uniqueOrders.size !==
      video.scenes.length ||
      video.scenes.some(
        (scene) =>
          !Number.isInteger(
            scene.order,
          ) ||
          scene.order < 0,
      )
    ) {
      throw new Error(
        "Scene orders must be unique non-negative integers.",
      );
    }

    const templateId =
      validateVideoTemplate(
        video,
      );

    const orderedScenes =
      [...video.scenes].sort(
        (left, right) =>
          left.order -
          right.order,
      );

    stage =
      "checking FFmpeg and FFprobe";

    await Promise.all([
      runFfmpeg([
        "-version",
      ]),

      runFfprobe([
        "-version",
      ]),
    ]);

    stage =
      "validating scene images";

    const sourceImages:
      string[] = [];

    for (
      const scene of
      orderedScenes
    ) {
      sourceImages.push(
        await validateSceneImage(
          scene.assetPath!,
        ),
      );
    }

    stage =
      "creating temporary workspace";

    workspace =
      await mkdtemp(
        join(
          tmpdir(),
          "ai-content-agent-render-",
        ),
      );

    /*
     * ================================================================
     * QUOTA-SAVING CHANGE
     *
     * Build ONE narration request for the entire video.
     * ================================================================
     */

    stage =
      "building narration";

    const narration =
      buildFullNarration(
        orderedScenes,
      );

    if (!narration) {
      throw new Error(
        "Video has no scenes to render.",
      );
    }

    stage =
      "preparing narration audio";

    const narrationAudio =
      await prepareNarration({
        videoId,
        narration,
        workspace,
      });

    /*
     * Approximate each scene's timing from the full narration.
     */
    stage =
      "calculating scene timings";

    const timings =
      calculateSceneTimingsFromNarration(
        {
          scenes:
            orderedScenes,

          totalAudioDuration:
            narrationAudio.duration,
        },
      );

    stage =
      "building subtitles";

    const subtitlesPath =
      join(
        workspace,
        "subtitles.ass",
      );

    await writeFile(
      subtitlesPath,
      buildAssSubtitles(
        orderedScenes,
        timings,
      ),
      "utf8",
    );

    /*
     * ================================================================
     * RENDER VISUAL-ONLY SCENE SEGMENTS
     * ================================================================
     */
const segmentPaths: string[] = [];

for (
  let index = 0;
  index < orderedScenes.length;
  index += 1
) {
  const scene =
    orderedScenes[index];

  const sourceImage =
    sourceImages[index];

  const imagePath =
    join(
      workspace,
      `scene-${String(
        scene.order,
      ).padStart(
        2,
        "0",
      )}${extname(
        sourceImage,
      ).toLowerCase()}`,
    );

  await copyFile(
    sourceImage,
    imagePath,
  );

  stage =
    `encoding visual for scene ${scene.order}`;

  const templateFilter =
    buildTemplateSceneFilter({
      templateId,

      video: {
        hook:
          video.hook,

        title:
          video.title,
      },

      scene,

      isOpeningScene:
        index === 0,
    });

  /*
   * IMPORTANT:
   *
   * This is being passed to -vf, therefore it must be a
   * SIMPLE filter chain.
   *
   * Do NOT add [0:v] or [v] labels here.
   */
  const baseFilter = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "setsar=1",
  ].join(",");

  const fullFilter =
    templateFilter
      ? `${baseFilter},${templateFilter}`
      : baseFilter;

  const segmentPath =
    join(
      workspace,
      `segment-${String(
        index + 1,
      ).padStart(
        2,
        "0",
      )}.mp4`,
    );

  const commonArgs = [
    "-y",

    "-loop",
    "1",

    "-i",
    imagePath,

    "-t",
    String(
      timings[index]
        .visualDuration,
    ),

    "-r",
    "30",

    "-an",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "23",

    "-pix_fmt",
    "yuv420p",
  ];

  try {
    /*
     * First attempt:
     * render using the selected visual template.
     */
    await runFfmpeg([
      ...commonArgs,

      "-vf",
      fullFilter,

      segmentPath,
    ]);
  } catch (error) {
    /*
     * A template effect should NEVER make the entire video
     * impossible to render.
     *
     * If FFmpeg rejects a template-specific filter, fall back
     * to a clean 1080x1920 scene.
     */
    if (
      error instanceof
      FfmpegProcessError &&
      templateFilter
    ) {
      console.warn(
        "Template filter failed; retrying scene with base visual filter",
        {
          videoId,
          scene:
            scene.order,
          templateId,
          stderr:
            error.stderr.slice(
              -1500,
            ),
        },
      );

      stage =
        `encoding fallback visual for scene ${scene.order}`;

      await runFfmpeg([
        ...commonArgs,

        "-vf",
        baseFilter,

        segmentPath,
      ]);
    } else {
      throw error;
    }
  }

  segmentPaths.push(
    segmentPath,
  );
}

    /*
     * ================================================================
     * CONCAT VISUALS
     * ================================================================
     */

    stage =
      "joining scene visuals";

    const concatList =
      join(
        workspace,
        "concat.txt",
      );

    await writeFile(
      concatList,
      `${segmentPaths
        .map(concatLine)
        .join("\n")}\n`,
      "utf8",
    );

    const visualsPath =
      join(
        workspace,
        "visuals.mp4",
      );

    await runFfmpeg([
      "-y",

      "-f",
      "concat",

      "-safe",
      "0",

      "-i",
      concatList,

      "-c",
      "copy",

      visualsPath,
    ]);

    /*
     * ================================================================
     * FINAL PASS:
     *
     * visual video
     * +
     * one narration audio
     * +
     * subtitles
     * ================================================================
     */

    stage =
      "combining narration and subtitles";

    const temporaryFinalPath =
      join(
        workspace,
        "temporary-final.mp4",
      );

    /*
     * Escape ASS path for FFmpeg's subtitles filter.
     */
    const escapedSubtitlePath =
      subtitlesPath
        .replace(
          /\\/g,
          "/",
        )
        .replace(
          /:/g,
          "\\:",
        )
        .replace(
          /'/g,
          "\\'",
        );

    await runFfmpeg([
      "-y",

      "-i",
      visualsPath,

      "-i",
      narrationAudio.audioPath,

      "-vf",
      `subtitles='${escapedSubtitlePath}'`,

      "-map",
      "0:v:0",

      "-map",
      "1:a:0",

      "-t",
      String(
        narrationAudio.duration,
      ),

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "23",

      "-pix_fmt",
      "yuv420p",

      "-c:a",
      "aac",

      "-b:a",
      "128k",

      "-ar",
      "48000",

      "-movflags",
      "+faststart",

      temporaryFinalPath,
    ]);

    stage =
      "validating final MP4";

    const probe =
      await validateFinalVideo(
        temporaryFinalPath,
      );

    stage =
      "saving final MP4";

    const output =
      finalVideoPath(
        video.campaignId.toString(),
        videoId,
      );

    await ensureDirectory(
      dirname(
        output.filesystemPath,
      ),
    );

    const destinationTemp =
      `${output.filesystemPath}.tmp-${process.pid}`;

    try {
      await copyFile(
        temporaryFinalPath,
        destinationTemp,
      );

      await rename(
        destinationTemp,
        output.filesystemPath,
      );
    } finally {
      await rm(
        destinationTemp,
        {
          force: true,
        },
      ).catch(
        () => undefined,
      );
    }

    stage =
      "persisting video";

    await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          videoPath:
            output.browserPath,

          status:
            "review",
        },
      },
    );

    return {
      videoPath:
        output.browserPath,

      duration:
        probe.duration,
    };
  } catch (error) {
    await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          status:
            "failed",
        },
      },
    ).catch(
      () => undefined,
    );

    throw new RenderError(
      stage,
      error,
    );
  } finally {
    if (workspace) {
      await rm(
        workspace,
        {
          recursive: true,
          force: true,
        },
      ).catch(
        () => undefined,
      );
    }
  }
}