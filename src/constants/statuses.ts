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

export const SOCIAL_ACCOUNT_STATUSES = ["connected", "expired", "disconnected"] as const;

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

export const CAMPAIGN_STYLES = [
  "Educational",
  "Listicle",
  "News / Updates",
  "Tutorial",
  "Storytelling",
  "Promotional",
] as const;

export type CampaignStyle = (typeof CAMPAIGN_STYLES)[number];

export const VIDEO_TEMPLATE_IDS = ["BIG_HOOK", "IMAGE_EXPLAINER", "TOP_5"] as const;

export type VideoTemplateId = (typeof VIDEO_TEMPLATE_IDS)[number];

export const DEFAULT_VIDEO_TEMPLATE_ID: VideoTemplateId = "BIG_HOOK";

export const CAMPAIGN_DURATIONS = ["15-30", "30-45", "45-60"] as const;

export type CampaignDuration = (typeof CAMPAIGN_DURATIONS)[number];