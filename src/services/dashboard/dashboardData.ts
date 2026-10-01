import Campaign from "@/models/Campaign";
import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";

import { connectDB } from "@/lib/db/mongoose";
import { getVideoTemplateLabel } from "@/templates/types";
import type { VideoScene } from "@/types/video";
import { toPublicMediaUrl } from "@/services/video/videoDetails";

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

export type ActivityKind = "campaign" | "video" | "publishing";

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  createdAt: Date;
  kind: ActivityKind;

  /**
   * Destination for the activity row.
   *
   * Examples:
   * campaign   -> /campaigns/:id
   * video      -> /videos/:id
   * publishing -> /publishing
   */
  href: string;
}

export interface DashboardData {
  stats: {
    campaigns: number;
    videos: number;

    /**
     * Videos actually waiting for human review.
     *
     * Approved videos are intentionally NOT included.
     */
    ready: number;

    published: number;
  };

  attention: {
    failedVideos: number;
    failedPublishing: number;
  };

  activity: ActivityItem[];
}

export interface CampaignRow {
  id: string;
  title: string;
  topic: string;
  audience: string;

  /**
   * Number requested when campaign was created.
   */
  videoCount: number;

  /**
   * Number actually created so far.
   */
  actualVideoCount: number;

  status: string;
  style?: string;
  durationMin?: number;
  durationMax?: number;
  createdAt: Date;
}

export interface CampaignDetailVideo {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  videoPath?: string;
  templateId?: string;
  templateLabel?: string;
  scenes: VideoScene[];
}

export interface CampaignDetail {
  id: string;
  title: string;
  topic: string;
  audience: string;
  videoCount: number;
  status: string;
  style?: string;
  durationMin?: number;
  durationMax?: number;
  createdAt: Date;
  videos: CampaignDetailVideo[];
}

export interface VideoRow {
  id: string;

  campaignId: string;
  campaign: string;

  title: string;
  status: string;

  createdAt: Date;
  updatedAt?: Date;

  scenes: VideoScene[];
  videoPath?: string;

  templateId?: string;
  templateLabel?: string;
}

export interface SocialAccountRow {
  id: string;

  platform:
    | "facebook"
    | "instagram";

  accountName: string;
  accountId: string;

  status: string;

  username?: string;
  profileUrl?: string;

  expiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
export interface PublishJobRow {
  id: string;
  video: string;
  destination: string;
  status: string;
  scheduledAt?: Date;
  publishedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/*                              DATABASE WRAPPER                              */
/* -------------------------------------------------------------------------- */

/**
 * Executes a database read operation while allowing public-facing pages
 * to degrade gracefully when MongoDB is temporarily unavailable.
 *
 * Returning null lets callers display a friendly unavailable state instead
 * of crashing the whole route.
 */
async function withDatabase<T>(
  read: () => Promise<T>,
): Promise<T | null> {
  try {
    await connectDB();

    return await read();
  } catch (error) {
    /**
     * Keep detailed errors server-side.
     *
     * Do not send database configuration or stack traces to public UI.
     */
    if (process.env.NODE_ENV !== "production") {
      console.error("[dashboardData] Database read failed:", error);
    }

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                              SHARED HELPERS                                */
/* -------------------------------------------------------------------------- */

function humanizeVideoActivity(status: string): string {
  switch (status) {
    case "draft":
      return "Video draft created";

    case "generating":
      return "Video is being generated";

    case "rendering":
      return "Video is rendering";

    case "review":
      return "Video ready for review";

    case "approved":
      return "Video approved";

    case "rejected":
      return "Video rejected";

    case "failed":
      return "Video rendering failed";

    case "published":
      return "Video published";

    default:
      return "Video updated";
  }
}

function humanizePublishActivity(status: string): string {
  switch (status) {
    case "queued":
      return "Publishing queued";

    case "processing":
      return "Publishing in progress";

    case "published":
      return "Content published";

    case "completed":
      return "Publishing completed";

    case "failed":
      return "Publishing failed";

    default:
      return "Publishing updated";
  }
}

function getDateOrFallback(
  primary?: Date | null,
  fallback?: Date | null,
): Date {
  return primary ?? fallback ?? new Date(0);
}

function uniqueStringIds(
  values: Array<{ toString(): string } | null | undefined>,
): string[] {
  return [
    ...new Set(
      values
        .filter(
          (
            value,
          ): value is {
            toString(): string;
          } => Boolean(value),
        )
        .map((value) => value.toString()),
    ),
  ];
}

function mapScenes(
  scenes: VideoScene[] | undefined | null,
): VideoScene[] {
  if (!Array.isArray(scenes)) {
    return [];
  }

  return scenes.map((scene) => ({
    ...scene,
    assetPath: toPublicMediaUrl(scene.assetPath),
  }));
}

/* -------------------------------------------------------------------------- */
/*                              DASHBOARD DATA                                */
/* -------------------------------------------------------------------------- */

export function getDashboardData(): Promise<DashboardData | null> {
  return withDatabase(async () => {
    const [
      campaigns,
      videos,
      ready,
      published,
      failedVideos,
      failedPublishing,
      recentCampaigns,
      recentVideos,
      recentJobs,
    ] = await Promise.all([
      /* ------------------------------------------------------------------ */
      /* Stats                                                              */
      /* ------------------------------------------------------------------ */

      Campaign.countDocuments(),

      Video.countDocuments(),

      /**
       * IMPORTANT:
       *
       * "Ready for review" means the video is actually waiting for a human
       * decision.
       *
       * Approved videos are no longer counted here.
       */
      Video.countDocuments({
        status: "review",
      }),

      PublishJob.countDocuments({
        status: "published",
      }),

      /* ------------------------------------------------------------------ */
      /* Attention                                                          */
      /* ------------------------------------------------------------------ */

      Video.countDocuments({
        status: "failed",
      }),

      PublishJob.countDocuments({
        status: "failed",
      }),

      /* ------------------------------------------------------------------ */
      /* Recent activity sources                                            */
      /* ------------------------------------------------------------------ */

      Campaign.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title createdAt")
        .lean(),

      Video.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title status createdAt updatedAt")
        .lean(),

      PublishJob.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select(
          "videoId socialAccountId status createdAt updatedAt publishedAt",
        )
        .lean(),
    ]);

    /* -------------------------------------------------------------------- */
    /* Resolve video names for publishing activity                          */
    /* -------------------------------------------------------------------- */

    const recentPublishVideoIds = uniqueStringIds(
      recentJobs.map((job) => job.videoId),
    );

    const publishVideos =
      recentPublishVideoIds.length > 0
        ? await Video.find({
            _id: {
              $in: recentPublishVideoIds,
            },
          })
            .select("title")
            .lean()
        : [];

    const publishVideoTitles = new Map(
      publishVideos.map((video) => [
        video._id.toString(),
        video.title,
      ]),
    );

    /* -------------------------------------------------------------------- */
    /* Build unified activity feed                                          */
    /* -------------------------------------------------------------------- */

    const campaignActivity: ActivityItem[] =
      recentCampaigns.map((campaign) => ({
        id: campaign._id.toString(),

        label: "Campaign created",

        detail:
          campaign.title?.trim() ||
          "Untitled campaign",

        createdAt: getDateOrFallback(
          campaign.createdAt,
        ),

        kind: "campaign",

        href: `/campaigns/${campaign._id.toString()}`,
      }));

    const videoActivity: ActivityItem[] =
      recentVideos.map((video) => ({
        id: video._id.toString(),

        label: humanizeVideoActivity(
          video.status,
        ),

        detail:
          video.title?.trim() ||
          "Untitled video",

        createdAt: getDateOrFallback(
          video.updatedAt,
          video.createdAt,
        ),

        kind: "video",

        href: `/videos/${video._id.toString()}`,
      }));

    const publishingActivity: ActivityItem[] =
      recentJobs.map((job) => {
        const videoId = job.videoId?.toString();

        const videoTitle = videoId
          ? publishVideoTitles.get(videoId)
          : undefined;

        return {
          id: job._id.toString(),

          label: humanizePublishActivity(
            job.status,
          ),

          detail:
            videoTitle ??
            "Video publishing activity",

          createdAt: getDateOrFallback(
            job.updatedAt,
            job.createdAt,
          ),

          kind: "publishing",

          href: "/publishing",
        };
      });

    const activity = [
      ...campaignActivity,
      ...videoActivity,
      ...publishingActivity,
    ]
      .sort(
        (left, right) =>
          right.createdAt.getTime() -
          left.createdAt.getTime(),
      )
      .slice(0, 8);

    return {
      stats: {
        campaigns,
        videos,
        ready,
        published,
      },

      attention: {
        failedVideos,
        failedPublishing,
      },

      activity,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                              CAMPAIGN LIST                                 */
/* -------------------------------------------------------------------------- */

export function getCampaignRows(): Promise<
  CampaignRow[] | null
> {
  return withDatabase(async () => {
    const campaigns =
      await Campaign.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .select(
          [
            "title",
            "topic",
            "audience",
            "videoCount",
            "style",
            "durationMin",
            "durationMax",
            "status",
            "createdAt",
          ].join(" "),
        )
        .lean();

    if (campaigns.length === 0) {
      return [];
    }

    const campaignIds =
      campaigns.map(
        (campaign) => campaign._id,
      );

    /*
     * Count actual videos in one aggregation instead
     * of running one query per campaign.
     */
    const videoCounts =
      await Video.aggregate<{
        _id: unknown;
        count: number;
      }>([
        {
          $match: {
            campaignId: {
              $in: campaignIds,
            },
          },
        },
        {
          $group: {
            _id: "$campaignId",
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const actualCounts = new Map(
      videoCounts.map((item) => [
        String(item._id),
        item.count,
      ]),
    );

    return campaigns.map(
      (campaign) => ({
        id: campaign._id.toString(),

        title:
          campaign.title?.trim() ||
          "Untitled campaign",

        topic:
          campaign.topic?.trim() ||
          "No topic provided",

        audience:
          campaign.audience?.trim() ||
          "General audience",

        videoCount:
          campaign.videoCount ?? 0,

        actualVideoCount:
          actualCounts.get(
            campaign._id.toString(),
          ) ?? 0,

        status:
          campaign.status ??
          "unknown",

        style: campaign.style,

        durationMin:
          campaign.durationMin,

        durationMax:
          campaign.durationMax,

        createdAt:
          campaign.createdAt,
      }),
    );
  });
}

/* -------------------------------------------------------------------------- */
/*                            CAMPAIGN DETAILS                                */
/* -------------------------------------------------------------------------- */

export function getCampaignDetail(
  campaignId: string,
): Promise<CampaignDetail | null> {
  return withDatabase(async () => {
    const campaign = await Campaign.findById(
      campaignId,
    )
      .select(
        [
          "title",
          "topic",
          "audience",
          "videoCount",
          "style",
          "durationMin",
          "durationMax",
          "status",
          "createdAt",
        ].join(" "),
      )
      .lean();

    if (!campaign) {
      return null;
    }

    const videos = await Video.find({
      campaignId: campaign._id,
    })
      .sort({ createdAt: -1 })
      .select(
        [
          "title",
          "status",
          "createdAt",
          "updatedAt",
          "scenes",
          "videoPath",
          "templateId",
        ].join(" "),
      )
      .lean();

    return {
      id: campaign._id.toString(),

      title:
        campaign.title?.trim() ||
        "Untitled campaign",

      topic:
        campaign.topic?.trim() ||
        "No topic provided",

      audience:
        campaign.audience?.trim() ||
        "General audience",

      videoCount:
        campaign.videoCount ?? 0,

      status:
        campaign.status ?? "unknown",

      style: campaign.style,

      durationMin: campaign.durationMin,

      durationMax: campaign.durationMax,

      createdAt: campaign.createdAt,

      videos: videos.map((video) => ({
        id: video._id.toString(),

        title:
          video.title?.trim() ||
          "Untitled video",

        status:
          video.status ?? "unknown",

        createdAt: video.createdAt,

        updatedAt: video.updatedAt,

        videoPath: toPublicMediaUrl(
          video.videoPath,
        ),

        templateId: video.templateId,

        templateLabel:
          getVideoTemplateLabel(
            video.templateId,
          ),

        scenes: mapScenes(video.scenes),
      })),
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                                VIDEO LIST                                  */
/* -------------------------------------------------------------------------- */

export function getVideoRows(): Promise<
  VideoRow[] | null
> {
  return withDatabase(async () => {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select(
        [
          "title",
          "campaignId",
          "status",
          "createdAt",
          "updatedAt",
          "scenes",
          "videoPath",
          "templateId",
        ].join(" "),
      )
      .lean();

    const campaignIds = uniqueStringIds(
      videos.map((video) => video.campaignId),
    );

    const campaigns =
      campaignIds.length > 0
        ? await Campaign.find({
            _id: {
              $in: campaignIds,
            },
          })
            .select("title")
            .lean()
        : [];

    const campaignTitles = new Map(
      campaigns.map((campaign) => [
        campaign._id.toString(),
        campaign.title,
      ]),
    );

    return videos.map((video) => {
  const campaignId =
    video.campaignId?.toString();

  return {
    id: video._id.toString(),

    campaignId:
      campaignId ?? "",

    title:
      video.title?.trim() ||
      "Untitled video",

    campaign:
      (campaignId
        ? campaignTitles.get(campaignId)
        : undefined) ??
      "Campaign unavailable",

    status:
      video.status ?? "unknown",

    createdAt:
      video.createdAt,

    updatedAt:
      video.updatedAt,

    scenes:
      mapScenes(video.scenes),

    videoPath:
      toPublicMediaUrl(
        video.videoPath,
      ),

    templateId:
      video.templateId,

    templateLabel:
      getVideoTemplateLabel(
        video.templateId,
      ),
  };
});
  });
}

/* -------------------------------------------------------------------------- */
/*                           SOCIAL ACCOUNT LIST                              */
/* -------------------------------------------------------------------------- */

export function getSocialAccountRows(): Promise<
  SocialAccountRow[] | null
> {
  return withDatabase(
    async () => {
      const accounts =
        await SocialAccount.find()
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .select(
            [
              "platform",
              "accountName",
              "accountId",
              "status",
              "username",
              "profileUrl",
              "expiresAt",
              "createdAt",
              "updatedAt",
            ].join(" "),
          )
          .lean();

      return accounts.map(
        (account) => ({
          id:
            account._id.toString(),

          platform:
            account.platform,

          accountName:
            account.accountName?.trim() ||
            "Unnamed account",

          accountId:
            account.accountId,

          status:
            account.status ??
            "unknown",

          username:
            account.username,

          profileUrl:
            account.profileUrl,

          expiresAt:
            account.expiresAt,

          createdAt:
            account.createdAt,

          updatedAt:
            account.updatedAt,
        }),
      );
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                             PUBLISHING LIST                                */
/* -------------------------------------------------------------------------- */

export function getPublishJobRows(): Promise<
  PublishJobRow[] | null
> {
  return withDatabase(async () => {
    const jobs = await PublishJob.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select(
        [
          "videoId",
          "socialAccountId",
          "status",
          "scheduledAt",
          "createdAt",
          "updatedAt",
          "publishedAt",
        ].join(" "),
      )
      .lean();

    const videoIds = uniqueStringIds(
      jobs.map((job) => job.videoId),
    );

    const accountIds = uniqueStringIds(
      jobs.map((job) => job.socialAccountId),
    );

    const [videos, accounts] =
      await Promise.all([
        videoIds.length > 0
          ? Video.find({
              _id: {
                $in: videoIds,
              },
            })
              .select("title")
              .lean()
          : [],

        accountIds.length > 0
          ? SocialAccount.find({
              _id: {
                $in: accountIds,
              },
            })
              .select(
                "platform accountName",
              )
              .lean()
          : [],
      ]);

    const videoTitles = new Map(
      videos.map((video) => [
        video._id.toString(),
        video.title,
      ]),
    );

    const destinations = new Map(
      accounts.map((account) => [
        account._id.toString(),

        `${
          account.platform === "facebook"
            ? "Facebook"
            : "Instagram"
        } · ${
          account.accountName?.trim() ||
          "Unnamed account"
        }`,
      ]),
    );

    return jobs.map((job) => {
      const videoId =
        job.videoId?.toString();

      const accountId =
        job.socialAccountId?.toString();

      return {
        id: job._id.toString(),

        video:
          (videoId
            ? videoTitles.get(videoId)
            : undefined) ??
          "Video unavailable",

        destination:
          (accountId
            ? destinations.get(accountId)
            : undefined) ??
          "Account unavailable",

        status:
          job.status ?? "unknown",

        scheduledAt:
          job.scheduledAt,

        /**
         * Prefer a dedicated publishedAt field when available.
         *
         * Fall back to updatedAt for compatibility with older records.
         */
        publishedAt:
          job.status === "published"
            ? job.publishedAt ??
              job.updatedAt
            : undefined,
      };
    });
  });
}