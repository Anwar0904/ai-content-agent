import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { JOB_TYPES, type JobStatus, type JobType } from "@/constants/jobs";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db/mongoose";
import type { Job as JobRecord } from "@/types/job";

const DEFAULT_MAX_ATTEMPTS = 1;

const renderVideoPayloadSchema = z.object({
  videoId: z.string().refine(isValidObjectId, "videoId must be a valid MongoDB ID."),
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
  if (type !== "RENDER_VIDEO") throw new Error(`Unsupported job type: ${type}`);
  return renderVideoPayloadSchema.parse(payload);
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