import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";

import { FacebookPublisher } from "@/services/publishing/facebookPublisher";
import { getMockPublisher } from "@/services/publishing/mockPublisher";

interface PublishVideoPayload {
  videoId: string;
  socialAccountId: string;
  platform?: string;
  publishJobId?: string;
}

export async function publishVideoJob(
  jobPayload: PublishVideoPayload,
) {
  if (
    !jobPayload.videoId ||
    !jobPayload.socialAccountId
  ) {
    throw new Error(
      "Invalid publish payload.",
    );
  }

  const [
    video,
    account,
    publishRecord,
  ] = await Promise.all([
    Video.findById(
      jobPayload.videoId,
    ).lean(),

    SocialAccount.findById(
      jobPayload.socialAccountId,
    ).lean(),

    jobPayload.publishJobId
      ? PublishJob.findById(
          jobPayload.publishJobId,
        ).lean()
      : null,
  ]);

  if (!video) {
    throw new Error(
      "Video not found.",
    );
  }

  if (!account) {
    throw new Error(
      "Social account not found.",
    );
  }

  const publishableStatuses =
    new Set([
      "approved",
      "published",
    ]);

  if (
    !publishableStatuses.has(
      video.status,
    )
  ) {
    throw new Error(
      "Video must be approved before it can be published.",
    );
  }

  if (!video.videoPath) {
    throw new Error(
      "Video must be rendered before it can be published.",
    );
  }

  if (
    account.status !==
    "connected"
  ) {
    throw new Error(
      "This social account is not connected.",
    );
  }

  const platform =
    (
      jobPayload.platform ??
      account.platform
    ) as
      | "facebook"
      | "instagram";

  const publishJobId =
    jobPayload.publishJobId ??
    publishRecord?._id?.toString();

  if (!publishJobId) {
    throw new Error(
      "Publishing record was not found.",
    );
  }

  /*
   * Mark the publishing attempt as processing.
   */
  await PublishJob.findByIdAndUpdate(
    publishJobId,
    {
      $set: {
        status:
          "processing",
        error:
          undefined,
      },
    },
  );

  try {
    /*
     * Keep publisher creation inside the execution path.
     *
     * NOTE:
     * FacebookPublisher itself should eventually be decoupled
     * from src/app/api/*.
     */
    const publisher =
      platform === "facebook"
        ? new FacebookPublisher()
        : getMockPublisher(
            "instagram",
          );

    const result =
      await publisher.publish({
        videoId:
          video._id.toString(),

        socialAccountId:
          account._id.toString(),

        platform,

        accountId:
          account.accountId,

        accountName:
          account.accountName,

        title:
          video.title,

        caption:
          video.caption,

        videoPath:
          video.videoPath,
      });

    if (!result.success) {
      throw new Error(
        result.error ||
          "Publishing failed.",
      );
    }

    await Promise.all([
      PublishJob.findByIdAndUpdate(
        publishJobId,
        {
          $set: {
            status:
              "published",

            publishedAt:
              result.publishedAt,

            externalPostId:
              result.externalPostId,

            error:
              undefined,
          },
        },
      ),

      /*
       * A republished video simply remains "published".
       */
      Video.findByIdAndUpdate(
        video._id,
        {
          $set: {
            status:
              "published",
          },
        },
      ),
    ]);

    return {
      status:
        "published",

      platform:
        result.platform,

      externalPostId:
        result.externalPostId,

      publishedAt:
        result.publishedAt.toISOString(),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Publishing failed.";

    await PublishJob.findByIdAndUpdate(
      publishJobId,
      {
        $set: {
          status:
            "failed",
          error:
            message,
        },
      },
    ).catch(
      () => undefined,
    );

    throw error;
  }
}