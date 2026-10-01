import { copyFile, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { RenderError } from "./renderError";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { generateSpeech } from "@/services/ai/tts/ttsGenerator";
import { probeMedia, runFfmpeg, runFfprobe } from "@/services/video/ffmpeg";
import { buildAssSubtitles } from "@/services/video/subtitleGenerator";
import { calculateSceneTimings } from "@/services/video/timing";
import { ensureDirectory, finalVideoPath, validateFinalVideo, validateSceneImage } from "@/services/video/mediaValidation";
import { buildTemplateSceneFilter, validateVideoTemplate } from "@/templates/registry";

function concatLine(filePath: string): string {
  return `file '${filePath.replace(/'/g, "'\\''")}'`;
}

export interface RenderedVideo {
  videoPath: string;
  duration: number;
}

function audioCachePath(videoId: string, sceneOrder: number, narration: string): string {
  const identity = createHash("sha256")
    .update(`${process.env.TTS_MODEL || "gemini-3.8-flash-lite-tts"}:${process.env.TTS_VOICE || "Kore"}:${narration}`)
    .digest("hex")
    .slice(0, 12);
  return join(tmpdir(), "ai-content-agent", "video-renders", videoId, "audio", `scene-${String(sceneOrder).padStart(2, "0")}-${identity}.wav`);
}

async function getCachedAudio(videoId: string, sceneOrder: number, narration: string): Promise<{ path: string; duration: number } | undefined> {
  const path = audioCachePath(videoId, sceneOrder, narration);
  try {
    const probe = await probeMedia(path);
    if (!probe.streams.some((stream) => stream.codecType === "audio")) throw new Error("Cached file has no audio stream.");
    console.info("TTS audio cache hit", { videoId, scene: sceneOrder });
    return { path, duration: probe.duration };
  } catch {
    await rm(path, { force: true });
    console.info("TTS audio cache miss", { videoId, scene: sceneOrder });
    return undefined;
  }
}

export async function renderVideo(videoId: string): Promise<RenderedVideo> {
  let stage = "loading video";
  let workspace: string | undefined;
  try {
  await connectDB();
  const video = await Video.findById(videoId).lean();
  if (!video) throw new Error("Video not found.");
  if (!video.scenes.length) throw new Error("Video has no scenes to render.");
  if (video.scenes.some((scene) => !scene.narration.trim() || !scene.assetPath)) throw new Error("Every scene needs narration and an image asset.");

  await Video.findByIdAndUpdate(videoId, { $set: { status: "rendering" } });

  stage = "validating scenes and template";
  if (new Set(video.scenes.map((scene) => scene.order)).size !== video.scenes.length || video.scenes.some((scene) => !Number.isInteger(scene.order) || scene.order < 0)) throw new Error("Scene orders must be unique non-negative integers.");
  const templateId = validateVideoTemplate(video);
  const orderedScenes = [...video.scenes].sort((left, right) => left.order - right.order);

  stage = "checking FFmpeg and FFprobe";
  await runFfmpeg(["-version"]);
  await runFfprobe(["-version"]);
  const sourceImages: string[] = [];
  for (const scene of orderedScenes) {
    stage = `validating image for scene ${scene.order}`;
    sourceImages.push(await validateSceneImage(scene.assetPath!));
  }
  stage = "creating temporary workspace";
  workspace = await mkdtemp(join(tmpdir(), "ai-content-agent-render-"));
    const audioDurations: Array<{ order: number; duration: number }> = [];
    const sceneFiles: string[] = [];
    for (let index = 0; index < orderedScenes.length; index += 1) {
      const scene = orderedScenes[index];
      stage = `preparing media for scene ${scene.order}`;
      const sourceImage = sourceImages[index];
      const imagePath = join(workspace, `scene-${String(scene.order).padStart(2, "0")}${extname(sourceImage).toLowerCase()}`);
      await copyFile(sourceImage, imagePath);
      const cachedAudio = await getCachedAudio(videoId, scene.order, scene.narration);
      const audioPath = join(workspace, `scene-${String(scene.order).padStart(2, "0")}.wav`);
      let audioDuration: number;
      if (cachedAudio) {
        await copyFile(cachedAudio.path, audioPath);
        audioDuration = cachedAudio.duration;
      } else {
        stage = `generating voiceover for scene ${scene.order}`;
        const speech = await generateSpeech({ text: scene.narration });
        stage = `saving voiceover for scene ${scene.order}`;
        const cachePath = audioCachePath(videoId, scene.order, scene.narration);
        await ensureDirectory(dirname(cachePath));
        const temporaryCachePath = `${cachePath}.tmp-${process.pid}`;
        await writeFile(temporaryCachePath, speech.buffer, { flag: "wx" });
        await rename(temporaryCachePath, cachePath);
        await copyFile(cachePath, audioPath);
        audioDuration = speech.duration;
      }
      audioDurations.push({ order: scene.order, duration: audioDuration });
      sceneFiles.push(`${imagePath}\t${audioPath}`);
    }

    stage = "building subtitle timings";
    const timings = calculateSceneTimings(audioDurations);
    const subtitlesPath = join(workspace, "subtitles.ass");
    await writeFile(subtitlesPath, buildAssSubtitles(orderedScenes, timings), "utf8");

    const segmentPaths: string[] = [];
    for (let index = 0; index < sceneFiles.length; index += 1) {
      const [imagePath, audioPath] = sceneFiles[index].split("\t");
      const scene = orderedScenes[index];
      stage = `encoding scene ${scene.order}`;
      const templateFilter = buildTemplateSceneFilter({
        templateId,
        video: { hook: video.hook, title: video.title },
        scene,
        isOpeningScene: index === 0,
      });
      const filterLabel = templateFilter ? `${templateFilter}` : "";
      const filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${filterLabel ? `,${filterLabel}` : ""}[v]`;
      const segmentPath = join(workspace, `segment-${String(index + 1).padStart(2, "0")}.mp4`);
      await runFfmpeg([
        "-y", "-loop", "1", "-i", imagePath, "-i", audioPath,
        "-filter_complex", filterComplex,
        "-map", "[v]", "-map", "1:a:0", "-af", "apad", "-t", String(timings[index].visualDuration),
        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", segmentPath,
      ]);
      segmentPaths.push(segmentPath);
    }

    stage = "joining encoded scenes";
    const concatList = join(workspace, "concat.txt");
    await writeFile(concatList, `${segmentPaths.map(concatLine).join("\n")}\n`, "utf8");
    const concatenatedPath = join(workspace, "concatenated.mp4");
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", concatenatedPath]);

    stage = "burning subtitles";
    const temporaryFinalPath = join(workspace, "temporary-final.mp4");
    await runFfmpeg([
      "-y", "-i", concatenatedPath, "-vf", `subtitles=${subtitlesPath}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", temporaryFinalPath,
    ]);
    stage = "validating final MP4";
    const probe = await validateFinalVideo(temporaryFinalPath);

    stage = "saving final MP4";
    const output = finalVideoPath(video.campaignId.toString(), videoId);
    await ensureDirectory(dirname(output.filesystemPath));
    // Copy to the destination filesystem before an atomic rename.
    const destinationTemp = `${output.filesystemPath}.tmp-${process.pid}`;
    try {
      await copyFile(temporaryFinalPath, destinationTemp);
      await rename(destinationTemp, output.filesystemPath);
    } finally {
      await rm(destinationTemp, { force: true });
    }
    stage = "persisting video path";
    await Video.findByIdAndUpdate(videoId, { $set: { videoPath: output.browserPath, status: "review" } });
    return { videoPath: output.browserPath, duration: probe.duration };
  } catch (error) {
    await Video.findByIdAndUpdate(videoId, { $set: { status: "failed" } }).catch(() => undefined);
    throw new RenderError(stage, error);
  } finally {
    if (workspace) await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
}
