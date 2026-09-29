export const JOB_TYPES = [
  "GENERATE_CONTENT",
  "GENERATE_ASSETS",
  "RENDER_VIDEO",
  "PUBLISH_VIDEO",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "processing", "completed", "failed"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];