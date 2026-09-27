import { randomUUID } from "node:crypto";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { generateScenes } from "@/services/ai/sceneGenerator";
import { cleanupAssetRun, createAssetRun, promoteAssetRun, writeRunAsset } from "@/services/assets/assetStorage";
import { localProvider } from "@/services/assets/providers/local";
import { pexelsProvider } from "@/services/assets/providers/pexels";
import { pollinationsProvider } from "@/services/assets/providers/pollinations";
import type { AssetResult } from "@/services/assets/types";
import type { VideoScene } from "@/types/video";

function providerLabel(result: AssetResult): string {
  return `${result.provider}/${result.type}`;
}

async function getAssetWithFallback(visualPrompt: string): Promise<AssetResult> {
  const providers = [pollinationsProvider, pexelsProvider, localProvider];
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const result = await provider.getAsset({ visualPrompt, preferredType: provider === pollinationsProvider ? "ai" : "stock" });
      console.info("Day 6 asset provider selected", { provider: providerLabel(result) });
      return result;
    } catch (error) {
      lastError = error;
      console.warn("Day 6 asset provider failed", { message: error instanceof Error ? error.message : "unknown provider error" });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No asset provider was available.");
}

export interface PreparedVideoScenes {
  scenes: VideoScene[];
  assetCount: number;
}

export async function generateVideoScenes(videoId: string): Promise<PreparedVideoScenes> {
  await connectDB();
  const video = await Video.findById(videoId).lean();
  if (!video) throw new Error("Video not found.");
  if (!video.script.trim()) throw new Error("Video has no script to turn into scenes.");
  if (video.scenes.length > 0) throw new Error("Scenes already exist for this video.");

  const campaign = await (await import("@/models/Campaign")).default.findById(video.campaignId).lean();
  const targetDurationMin = Number(campaign?.durationMin ?? 30);
  const targetDurationMax = Number(campaign?.durationMax ?? 45);
  const scenes = await generateScenes({
    title: video.title,
    hook: video.hook,
    script: video.script,
    targetDurationMin,
    targetDurationMax,
  });

  const runDirectory = await createAssetRun(video.campaignId.toString(), videoId, randomUUID());
  try {
    const prepared: Array<{ scene: VideoScene; result: AssetResult }> = [];
    for (const scene of scenes) {
      const result = await getAssetWithFallback(scene.visualPrompt);
      await writeRunAsset(runDirectory, scene.order, result.buffer, result.mimeType);
      prepared.push({
        result,
        scene: {
          ...scene,
          assetType: result.type,
          assetProvider: result.provider,
          sourceUrl: result.sourceUrl,
          credit: result.credit,
        },
      });
    }
    const assetPaths = await promoteAssetRun(runDirectory, video.campaignId.toString(), videoId, scenes.map((scene) => scene.order));
    const finalScenes = prepared.map(({ scene }) => ({ ...scene, assetPath: assetPaths.get(scene.order) }));
    if (finalScenes.some((scene) => !scene.assetPath)) throw new Error("Prepared asset path is missing.");
    await Video.findByIdAndUpdate(videoId, { $set: { scenes: finalScenes } });
    return { scenes: finalScenes, assetCount: finalScenes.length };
  } catch (error) {
    await cleanupAssetRun(runDirectory);
    throw error;
  }
}
