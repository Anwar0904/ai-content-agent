import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";
import { getMockPublisher } from "@/services/publishing/mockPublisher";

export async function publishVideoJob(jobPayload: { videoId: string; socialAccountId: string; platform?: string; publishJobId?: string }) {
  if (!jobPayload.videoId || !jobPayload.socialAccountId) {
    throw new Error("Invalid publish payload.");
  }

  const [video, account, publishRecord] = await Promise.all([
    Video.findById(jobPayload.videoId).lean(),
    SocialAccount.findById(jobPayload.socialAccountId).lean(),
    jobPayload.publishJobId ? PublishJob.findById(jobPayload.publishJobId).lean() : null,
  ]);

  if (!video) throw new Error("Video not found.");
  if (!account) throw new Error("Social account not found.");
  if (video.status !== "approved") throw new Error("Video must be approved before it can be published.");
  if (account.status !== "connected") throw new Error("This social account is not connected.");

  const platform = (jobPayload.platform ?? account.platform) as "facebook" | "instagram";
  const publisher = getMockPublisher(platform);
  const result = await publisher.publish({
    videoId: video._id.toString(),
    socialAccountId: account._id.toString(),
    platform,
    accountId: account.accountId,
    accountName: account.accountName,
    caption: video.caption,
    videoPath: video.videoPath,
  });

  if (!result.success) {
    await PublishJob.findByIdAndUpdate(jobPayload.publishJobId ?? publishRecord?._id, {
      $set: { status: "failed", error: result.error },
    });
    throw new Error(result.error);
  }

  await Promise.all([
    PublishJob.findByIdAndUpdate(jobPayload.publishJobId ?? publishRecord?._id, {
      $set: {
        status: "published",
        externalPostId: result.externalPostId,
        error: undefined,
      },
    }),
    Video.findByIdAndUpdate(video._id, {
      $set: { status: "published" },
    }),
  ]);

  return {
    status: "published",
    platform: result.platform,
    externalPostId: result.externalPostId,
    publishedAt: result.publishedAt.toISOString(),
  };
}
