export const CAMPAIGN_STATUSES = [
  "draft",
  "generating",
  "ready",
  "completed",
  "failed",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const VIDEO_STATUSES = [
  "draft",
  "generating",
  "rendering",
  "review",
  "approved",
  "rejected",
  "published",
  "failed",
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const SOCIAL_PLATFORMS = ["facebook", "instagram"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_ACCOUNT_STATUSES = ["connected", "expired"] as const;

export type SocialAccountStatus = (typeof SOCIAL_ACCOUNT_STATUSES)[number];

export const PUBLISH_JOB_STATUSES = [
  "queued",
  "processing",
  "published",
  "failed",
] as const;

export type PublishJobStatus = (typeof PUBLISH_JOB_STATUSES)[number];

export const AGENT_RUN_TYPES = [
  "content_generation",
  "asset_generation",
  "video_render",
  "publishing",
  "analysis",
] as const;

export type AgentRunType = (typeof AGENT_RUN_TYPES)[number];

export const AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];