import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { getVideoTemplateLabel } from "@/templates/types";

export function toPublicMediaUrl(value?: string | null): string | undefined {
  if (!value?.startsWith("/generated-assets/")) return undefined;

  const segments = value.slice(1).split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9._-]+$/.test(segment))) {
    return undefined;
  }

  return value;
}

export async function getVideoDetail(videoId: string) {
  await connectDB();
  const video = await Video.findById(videoId).lean();
  if (!video) return null;

  return {
    id: video._id.toString(),
    title: video.title,
    hook: video.hook,
    script: video.script,
    caption: video.caption,
    hashtags: video.hashtags,
    status: video.status,
    templateId: video.templateId,
    templateLabel: getVideoTemplateLabel(video.templateId),
    videoPath: toPublicMediaUrl(video.videoPath),
    scenes: video.scenes.map((scene) => ({
      order: scene.order,
      narration: scene.narration,
      duration: scene.duration,
      assetType: scene.assetType,
      assetProvider: scene.assetProvider,
      assetPath: toPublicMediaUrl(scene.assetPath),
    })),
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}