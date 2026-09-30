import dotenv from "dotenv";
import { connectDB, disconnectDB } from "@/lib/db/mongoose";
import { getServerEnv } from "@/lib/env";
import { claimJob, markCompleted, markFailed, parseJobPayload, recoverStaleJobs } from "@/services/jobs/jobService";
import { finalizeCampaignGeneration } from "@/services/jobs/jobService";
import { generateContentJob } from "./jobs/generateContent";
import { publishVideoJob } from "./jobs/publishVideo";
import { renderVideoJob } from "./jobs/renderVideo";

dotenv.config({ path: ".env.local" });

const env = getServerEnv();
const pollIntervalMs = Number(env.JOB_POLL_INTERVAL_MS ?? 2000);
const lockTimeoutMs = Number(env.JOB_LOCK_TIMEOUT_MS ?? 30 * 60 * 1000);
let shuttingDown = false;

function delay(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

function safeError(error: unknown, jobType: string) {
  if (jobType === "PUBLISH_VIDEO" && error instanceof Error) return error.message;
  if (error instanceof Error && error.message === "Video not found.") return error.message;
  if (error instanceof Error && error.message.includes("no scenes")) return "This video has no scenes to render.";
  return jobType === "GENERATE_CONTENT"
    ? "Video generation failed. Please try again."
    : "Video rendering failed. Please try again.";
}

async function processNextJob() {
  await recoverStaleJobs(new Date(Date.now() - lockTimeoutMs));
  const job = await claimJob(new Date(Date.now() - lockTimeoutMs));
  if (!job) return false;

  try {
    let result: Record<string, unknown>;
    if (job.type === "GENERATE_CONTENT") {
      const payload = parseJobPayload(job.type, job.payload) as { campaignId: string; videoIndex: number };
      if (!payload.campaignId) throw new Error("Invalid content generation payload.");
      result = await generateContentJob(payload.campaignId, payload.videoIndex);
    } else if (job.type === "RENDER_VIDEO") {
      const payload = parseJobPayload(job.type, job.payload) as { videoId: string };
      if (!payload.videoId) throw new Error("Invalid render payload.");
      result = await renderVideoJob(payload.videoId);
    } else if (job.type === "PUBLISH_VIDEO") {
      const payload = parseJobPayload(job.type, job.payload) as {
        videoId: string;
        socialAccountId: string;
        publishJobId?: string;
        platform?: string;
      };
      if (!payload.videoId || !payload.socialAccountId) throw new Error("Invalid publish payload.");
      result = await publishVideoJob({
        videoId: payload.videoId,
        socialAccountId: payload.socialAccountId,
        publishJobId: payload.publishJobId,
        platform: payload.platform,
      });
    } else {
      throw new Error(`Unsupported job type: ${job.type}`);
    }
    await markCompleted(job._id.toString(), result);
    if (job.type === "GENERATE_CONTENT" && typeof job.payload.campaignId === "string") {
      await finalizeCampaignGeneration(job.payload.campaignId);
    }
    console.info("Job completed", { jobId: job._id.toString(), type: job.type });
  } catch (error) {
    console.error("Job failed", { jobId: job._id.toString(), type: job.type, error });
    await markFailed(job._id.toString(), safeError(error, job.type));
    if (job.type === "GENERATE_CONTENT" && typeof job.payload.campaignId === "string") {
      await finalizeCampaignGeneration(job.payload.campaignId);
    }
  }
  return true;
}

async function main() {
  await connectDB();
  console.info("Job worker started", { pollIntervalMs, lockTimeoutMs });
  while (!shuttingDown) {
    const foundJob = await processNextJob();
    if (!foundJob) await delay(pollIntervalMs);
  }
}

function requestShutdown(signal: string) {
  console.info(`Received ${signal}; stopping after the current job.`);
  shuttingDown = true;
}

process.once("SIGINT", () => requestShutdown("SIGINT"));
process.once("SIGTERM", () => requestShutdown("SIGTERM"));

main()
  .catch((error) => {
    console.error("Job worker stopped unexpectedly", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });