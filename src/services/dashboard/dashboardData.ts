import Campaign from "@/models/Campaign";
import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import type { VideoScene } from "@/types/video";
import { getVideoTemplateLabel } from "@/templates/types";
import { toPublicMediaUrl } from "@/services/video/videoDetails";

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  createdAt: Date;
  kind: "campaign" | "video" | "publishing";
}

export interface DashboardData {
  stats: {
    campaigns: number;
    videos: number;
    ready: number;
    published: number;
  };
  activity: ActivityItem[];
}

export interface CampaignRow {
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
}

export interface VideoRow {
  id: string;
  title: string;
  campaign: string;
  status: string;
  createdAt: Date;
  scenes: VideoScene[];
  videoPath?: string;
  templateId?: string;
  templateLabel?: string;
}

export interface SocialAccountRow {
  id: string;
  platform: "facebook" | "instagram";
  accountName: string;
  accountId: string;
  status: string;
  username?: string;
  profileUrl?: string;
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

async function withDatabase<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    await connectDB();
    return await read();
  } catch {
    return null;
  }
}

export function getDashboardData(): Promise<DashboardData | null> {
  return withDatabase(async () => {
    const [campaigns, videos, ready, published, recentCampaigns, recentVideos, recentJobs] =
      await Promise.all([
        Campaign.countDocuments(),
        Video.countDocuments(),
        Video.countDocuments({ status: { $in: ["review", "approved"] } }),
        PublishJob.countDocuments({ status: "published" }),
        Campaign.find().sort({ createdAt: -1 }).limit(5).select("title createdAt").lean(),
        Video.find().sort({ updatedAt: -1 }).limit(5).select("title status updatedAt").lean(),
        PublishJob.find()
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("status updatedAt")
          .lean(),
      ]);

    const activity: ActivityItem[] = [
      ...recentCampaigns.map((campaign) => ({
        id: campaign._id.toString(),
        label: "Campaign created",
        detail: campaign.title,
        createdAt: campaign.createdAt,
        kind: "campaign" as const,
      })),
      ...recentVideos.map((video) => ({
        id: video._id.toString(),
        label: `Video ${video.status}`,
        detail: video.title,
        createdAt: video.updatedAt,
        kind: "video" as const,
      })),
      ...recentJobs.map((job) => ({
        id: job._id.toString(),
        label: `Publishing job ${job.status}`,
        detail: "Content delivery",
        createdAt: job.updatedAt,
        kind: "publishing" as const,
      })),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 6);

    return { stats: { campaigns, videos, ready, published }, activity };
  });
}

export function getCampaignRows(): Promise<CampaignRow[] | null> {
  return withDatabase(async () => {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("title topic audience videoCount style durationMin durationMax status createdAt")
      .lean();

    return campaigns.map((campaign) => ({
      id: campaign._id.toString(),
      title: campaign.title,
      topic: campaign.topic,
      audience: campaign.audience,
      videoCount: campaign.videoCount,
      status: campaign.status,
      style: campaign.style,
      durationMin: campaign.durationMin,
      durationMax: campaign.durationMax,
      createdAt: campaign.createdAt,
    }));
  });
}

export function getVideoRows(): Promise<VideoRow[] | null> {
  return withDatabase(async () => {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("title campaignId status createdAt scenes videoPath templateId")
      .lean();
    const campaignIds = videos.map((video) => video.campaignId);
    const campaigns = campaignIds.length
      ? await Campaign.find({ _id: { $in: campaignIds } }).select("title").lean()
      : [];
    const campaignTitles = new Map(
      campaigns.map((campaign) => [campaign._id.toString(), campaign.title]),
    );

    return videos.map((video) => ({
      id: video._id.toString(),
      title: video.title,
      campaign: campaignTitles.get(video.campaignId.toString()) ?? "Campaign unavailable",
      status: video.status,
      createdAt: video.createdAt,
      scenes: video.scenes.map((scene) => ({
        ...scene,
        assetPath: toPublicMediaUrl(scene.assetPath),
      })),
      videoPath: toPublicMediaUrl(video.videoPath),
      templateId: video.templateId,
      templateLabel: getVideoTemplateLabel(video.templateId),
    }));
  });
}

export function getSocialAccountRows(): Promise<SocialAccountRow[] | null> {
  return withDatabase(async () => {
    const accounts = await SocialAccount.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("platform accountName accountId status username profileUrl createdAt updatedAt")
      .lean();

    return accounts.map((account) => ({
      id: account._id.toString(),
      platform: account.platform,
      accountName: account.accountName,
      accountId: account.accountId,
      status: account.status,
      username: account.username,
      profileUrl: account.profileUrl,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  });
}

export function getPublishJobRows(): Promise<PublishJobRow[] | null> {
  return withDatabase(async () => {
    const jobs = await PublishJob.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("videoId socialAccountId status scheduledAt createdAt updatedAt")
      .lean();
    const videoIds = jobs.map((job) => job.videoId);
    const accountIds = jobs.map((job) => job.socialAccountId);
    const [videos, accounts] = await Promise.all([
      videoIds.length ? Video.find({ _id: { $in: videoIds } }).select("title").lean() : [],
      accountIds.length
        ? SocialAccount.find({ _id: { $in: accountIds } })
            .select("platform accountName")
            .lean()
        : [],
    ]);
    const videoTitles = new Map(videos.map((video) => [video._id.toString(), video.title]));
    const destinations = new Map(
      accounts.map((account) => [
        account._id.toString(),
        `${account.platform === "facebook" ? "Facebook" : "Instagram"} · ${account.accountName}`,
      ]),
    );

    return jobs.map((job) => ({
      id: job._id.toString(),
      video: videoTitles.get(job.videoId.toString()) ?? "Video unavailable",
      destination: destinations.get(job.socialAccountId.toString()) ?? "Account unavailable",
      status: job.status,
      scheduledAt: job.scheduledAt,
      publishedAt: job.status === "published" ? job.updatedAt : undefined,
    }));
  });
}