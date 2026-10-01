import Campaign from "@/models/Campaign";
import Video from "@/models/Video";

import { connectDB } from "@/lib/db/mongoose";
import { getActiveRenderJob } from "@/services/jobs/jobService";
import { getVideoTemplateLabel } from "@/templates/types";

export function toPublicMediaUrl(
  value?: string | null,
): string | undefined {
  if (
    !value?.startsWith(
      "/generated-assets/",
    )
  ) {
    return undefined;
  }

  const segments =
    value.slice(1).split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !/^[A-Za-z0-9._-]+$/.test(
          segment,
        ),
    )
  ) {
    return undefined;
  }

  return value;
}

export async function getVideoDetail(
  videoId: string,
) {
  await connectDB();

  const video =
    await Video.findById(
      videoId,
    ).lean();

  if (!video) {
    return null;
  }

  const [
    campaign,
    renderJob,
    publishJob,
  ] = await Promise.all([
    video.campaignId
      ? Campaign.findById(
          video.campaignId,
        )
          .select("title")
          .lean()
      : null,

    getActiveRenderJob(
      videoId,
    ),

    getActivePublishJobByVideo(
      videoId,
    ),
  ]);

  const scenes = [
    ...(video.scenes ?? []),
  ]
    .sort(
      (left, right) =>
        left.order -
        right.order,
    )
    .map((scene) => ({
      order: scene.order,
      narration:
        scene.narration,
      duration:
        scene.duration,
      assetType:
        scene.assetType,
      assetProvider:
        scene.assetProvider,
      assetPath:
        toPublicMediaUrl(
          scene.assetPath,
        ),
    }));

  return {
    id:
      video._id.toString(),

    campaignId:
      video.campaignId?.toString(),

    campaignTitle:
      campaign?.title,

    generationIndex:
      video.generationIndex,

    title:
      video.title,

    hook:
      video.hook,

    script:
      video.script,

    caption:
      video.caption,

    hashtags:
      Array.isArray(
        video.hashtags,
      )
        ? video.hashtags
        : [],

    status:
      video.status,

    reviewedAt:
      video.reviewedAt ??
      null,

    templateId:
      video.templateId,

    templateLabel:
      getVideoTemplateLabel(
        video.templateId,
      ),

    videoPath:
      toPublicMediaUrl(
        video.videoPath,
      ),

    scenes,

    createdAt:
      video.createdAt,

    updatedAt:
      video.updatedAt,

    renderJob,
    publishJob,
  };
}

async function getActivePublishJobByVideo(
  videoId: string,
) {
  const PublishJob = (
    await import(
      "@/models/PublishJob"
    )
  ).default;

  const publishJob =
    await PublishJob.findOne({
      videoId,
      status: {
        $in: [
          "queued",
          "processing",
        ],
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

  if (!publishJob) {
    return null;
  }

  return {
    id:
      publishJob._id.toString(),

    status:
      publishJob.status,

    platform:
      publishJob.platform,

    error:
      publishJob.error,
  };
}