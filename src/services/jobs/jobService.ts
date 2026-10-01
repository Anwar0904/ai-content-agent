import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { JOB_TYPES, type JobStatus, type JobType } from "@/constants/jobs";
import { SOCIAL_PLATFORMS } from "@/constants/statuses";
import Job from "@/models/Job";
import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import type { Job as JobRecord } from "@/types/job";

const DEFAULT_MAX_ATTEMPTS = 1;

const renderVideoPayloadSchema = z.object({
  videoId: z.string().refine(isValidObjectId, "videoId must be a valid MongoDB ID."),
});

const generateContentPayloadSchema = z.object({
  campaignId: z.string().refine(isValidObjectId, "campaignId must be a valid MongoDB ID."),
  videoIndex: z.number().int().positive(),
});

const publishVideoPayloadSchema = z.object({
  videoId: z.string().refine(isValidObjectId, "videoId must be a valid MongoDB ID."),
  socialAccountId: z.string().refine(isValidObjectId, "socialAccountId must be a valid MongoDB ID."),
  publishJobId: z.string().optional(),
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
});

export type PublicJob = Pick<
  JobRecord,
  "type" | "status" | "attempts" | "error" | "createdAt" | "startedAt" | "completedAt" | "failedAt" | "result"
> & { id: string };

function publicJob(job: JobRecord | null): PublicJob | null {
  if (!job) return null;
  return {
    id: job._id.toString(),
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    failedAt: job.failedAt,
    result: job.result,
  };
}

export function parseJobPayload(type: JobType, payload: Record<string, unknown>) {
  if (type === "RENDER_VIDEO") return renderVideoPayloadSchema.parse(payload);
  if (type === "GENERATE_CONTENT") return generateContentPayloadSchema.parse(payload);
  if (type === "PUBLISH_VIDEO") return publishVideoPayloadSchema.parse(payload);
  throw new Error(`Unsupported job type: ${type}`);
}

export async function createJob({
  type,
  payload,
  dedupeKey,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: {
  type: JobType;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  maxAttempts?: number;
}) {
  await connectDB();
  return Job.create({ type, payload, dedupeKey, maxAttempts, status: "queued" });
}

export async function getJob(jobId: string) {
  await connectDB();
  return publicJob(await Job.findById(jobId).lean() as JobRecord | null);
}

export async function getActiveRenderJob(videoId: string) {
  await connectDB();
  return publicJob(
    await Job.findOne({ dedupeKey: `RENDER_VIDEO:${videoId}`, status: { $in: ["queued", "processing"] } }).lean() as JobRecord | null,
  );
}

export async function enqueueRenderJob(videoId: string) {
  const dedupeKey = `RENDER_VIDEO:${videoId}`;
  const existing = await getActiveRenderJob(videoId);
  if (existing) return { job: existing, created: false };

  try {
    const job = await createJob({ type: "RENDER_VIDEO", payload: { videoId }, dedupeKey });
    return { job: publicJob(job.toObject() as JobRecord), created: true };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      const activeJob = await getActiveRenderJob(videoId);
      if (activeJob) return { job: activeJob, created: false };
    }
    throw error;
  }
}

export async function getActivePublishJob(videoId: string, socialAccountId: string) {
  await connectDB();
  return publicJob(
    await Job.findOne({ dedupeKey: `PUBLISH_VIDEO:${videoId}:${socialAccountId}`, status: { $in: ["queued", "processing"] } }).lean() as JobRecord | null,
  );
}

export async function enqueuePublishJob(videoId: string, socialAccountId: string) {
  const dedupeKey = `PUBLISH_VIDEO:${videoId}:${socialAccountId}`;
  const existing = await getActivePublishJob(videoId, socialAccountId);
  if (existing) return { job: existing, created: false };

  try {
    const [video, account] = await Promise.all([
      Video.findById(videoId).lean(),
      SocialAccount.findById(socialAccountId).lean(),
    ]);

    if (!video) throw new Error("Video not found.");
    if (!account) throw new Error("Social account not found.");
    if (video.status !== "approved") throw new Error("Video must be approved before it can be published.");
    if (account.status !== "connected") throw new Error("This social account is not connected.");

    const publishRecord = await PublishJob.findOneAndUpdate(
      { videoId, socialAccountId },
      { $setOnInsert: { videoId, socialAccountId, platform: account.platform, status: "queued" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    const job = await createJob({
      type: "PUBLISH_VIDEO",
      payload: {
        videoId,
        socialAccountId,
        publishJobId: publishRecord?._id?.toString(),
        platform: account.platform,
      },
      dedupeKey,
    });

    await PublishJob.findByIdAndUpdate(publishRecord?._id, {
      $set: { platform: account.platform, status: "queued", error: undefined },
      $unset: { externalPostId: "", publishedAt: "" },
    });

    return { job: publicJob(job.toObject() as JobRecord), created: true };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      const activeJob = await getActivePublishJob(videoId, socialAccountId);
      if (activeJob) return { job: activeJob, created: false };
    }
    throw error;
  }
}

export async function enqueueCampaignGenerationJobs(campaignId: string, videoCount: number) {
  const jobs: PublicJob[] = [];
  for (let videoIndex = 1; videoIndex <= videoCount; videoIndex += 1) {
    const dedupeKey = `GENERATE_CONTENT:${campaignId}:${videoIndex}`;
    const existing = await Job.findOne({ dedupeKey, status: { $in: ["queued", "processing"] } }).lean() as JobRecord | null;
    if (existing) {
      jobs.push(publicJob(existing)!);
      continue;
    }

    try {
      const job = await createJob({
        type: "GENERATE_CONTENT",
        payload: { campaignId, videoIndex },
        dedupeKey,
      });
      jobs.push(publicJob(job.toObject() as JobRecord)!);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
      const activeJob = await Job.findOne({ dedupeKey, status: { $in: ["queued", "processing"] } }).lean() as JobRecord | null;
      if (!activeJob) throw error;
      jobs.push(publicJob(activeJob)!);
    }
  }
  return jobs;
}

export async function getCampaignGenerationSummary(campaignId: string) {
  await connectDB();
  const [{ default: Campaign }, jobs] = await Promise.all([
    import("@/models/Campaign"),
    Job.find({ dedupeKey: new RegExp(`^GENERATE_CONTENT:${campaignId}:`) }).sort({ createdAt: 1 }).lean() as Promise<JobRecord[]>,
  ]);
  const campaign = await Campaign.findById(campaignId).lean();
  const counts = jobs.reduce<Record<string, number>>((result, job) => {
    result[job.status] = (result[job.status] ?? 0) + 1;
    return result;
  }, {});
  return {
    campaignId,
    total: campaign?.videoCount ?? jobs.length,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    queued: counts.queued ?? 0,
    processing: counts.processing ?? 0,
    jobs: jobs.map((job) => publicJob(job)),
  };
}

export async function finalizeCampaignGeneration(campaignId: string) {
  const summary = await getCampaignGenerationSummary(campaignId);
  if (summary.total !== summary.jobs.length || summary.queued + summary.processing > 0) return summary;
  const { default: Campaign } = await import("@/models/Campaign");
  await Campaign.findByIdAndUpdate(campaignId, { $set: { status: summary.failed > 0 ? "failed" : "ready" } });
  return summary;
}

export async function recoverStaleJobs(lockedBefore: Date) {
  await connectDB();
  await Job.updateMany(
    { status: "processing", lockedAt: { $lte: lockedBefore }, $expr: { $gte: ["$attempts", "$maxAttempts"] } },
    { $set: { status: "failed", error: "Job lease expired after the maximum number of attempts.", failedAt: new Date() }, $unset: { lockedAt: "" } },
  );
}

export async function claimJob(lockedBefore: Date) {
  await connectDB();
  const now = new Date();
  return Job.findOneAndUpdate(
    {
      $or: [
        { status: "queued", $expr: { $lt: ["$attempts", "$maxAttempts"] }, $or: [{ availableAt: { $exists: false } }, { availableAt: { $lte: now } }] },
        { status: "processing", $expr: { $lt: ["$attempts", "$maxAttempts"] }, lockedAt: { $lte: lockedBefore } },
      ],
    },
    { $set: { status: "processing", startedAt: now, lockedAt: now }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  ).lean() as Promise<JobRecord | null>;
}

export async function markCompleted(jobId: string, result: Record<string, unknown>) {
  await connectDB();
  await Job.findByIdAndUpdate(jobId, {
    $set: { status: "completed", result, completedAt: new Date() },
    $unset: { lockedAt: "" },
  });
}

export async function markFailed(jobId: string, error: string) {
  await connectDB();
  const job = await Job.findById(jobId).lean() as JobRecord | null;
  if (!job) return;
  const retry = job.attempts < job.maxAttempts;
  await Job.findByIdAndUpdate(jobId, retry
    ? { $set: { status: "queued", error, availableAt: new Date() }, $unset: { lockedAt: "" } }
    : { $set: { status: "failed", error, failedAt: new Date() }, $unset: { lockedAt: "" } },
  );
}

export function isTerminalJobStatus(status: JobStatus) {
  return status === "completed" || status === "failed";
}

export { JOB_TYPES };