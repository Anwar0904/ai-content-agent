import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { connectDB, disconnectDB } from "@/lib/db/mongoose";
import { getServerEnv } from "@/lib/env";
import { RenderError } from "@/services/video/renderError";

import {
  claimJob,
  finalizeCampaignGeneration,
  markCompleted,
  markFailed,
  parseJobPayload,
  recoverStaleJobs,
} from "@/services/jobs/jobService";

const env = getServerEnv();

const pollIntervalMs = getPositiveNumber(
  env.JOB_POLL_INTERVAL_MS,
  2000,
);

const lockTimeoutMs = getPositiveNumber(
  env.JOB_LOCK_TIMEOUT_MS,
  10 * 60 * 1000,
);

/**
 * Stale-job recovery does not need to run before every single DB poll.
 */
const staleRecoveryIntervalMs = 30_000;

let shuttingDown = false;
let processingJob = false;
let lastStaleRecoveryAt = 0;

function getPositiveNumber(
  value: string | number | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function delay(
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(
      resolve,
      duration,
    );

    /*
     * Allows Node to exit naturally during shutdown if this
     * timer is the only remaining active handle.
     */
    timer.unref?.();
  });
}

function formatWorkerError(
  error: unknown,
  jobType: string,
): string {
  if (
    jobType === "RENDER_VIDEO" &&
    error instanceof RenderError
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    if (
      jobType === "PUBLISH_VIDEO"
    ) {
      return error.message;
    }

    if (
      error.message ===
      "Video not found."
    ) {
      return error.message;
    }

    if (
      error.message
        .toLowerCase()
        .includes("no scenes")
    ) {
      return "This video has no scenes to render.";
    }

    if (
      error.message.includes(
        "Cannot find module",
      )
    ) {
      return `Worker dependency failed to load: ${error.message}`;
    }
  }

  if (
    jobType ===
    "GENERATE_CONTENT"
  ) {
    return "Video generation failed. Please try again.";
  }

  if (
    jobType ===
    "PUBLISH_VIDEO"
  ) {
    return "Publishing failed. Please try again.";
  }

  return "Video rendering failed. Please try again.";
}

async function maybeRecoverStaleJobs() {
  const now = Date.now();

  if (
    now -
      lastStaleRecoveryAt <
    staleRecoveryIntervalMs
  ) {
    return;
  }

  lastStaleRecoveryAt = now;

  const staleBefore =
    new Date(
      now -
        lockTimeoutMs,
    );

  try {
    await recoverStaleJobs(
      staleBefore,
    );
  } catch (error) {
    /*
     * Recovery failure should NOT kill the worker.
     */
    console.error(
      "Stale-job recovery failed",
      error,
    );
  }
}

async function runGenerateContentJob(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed =
    parseJobPayload(
      "GENERATE_CONTENT",
      payload,
    ) as {
      campaignId: string;
      videoIndex: number;
    };

  if (
    !parsed.campaignId ||
    !Number.isInteger(
      parsed.videoIndex,
    )
  ) {
    throw new Error(
      "Invalid content generation payload.",
    );
  }

  /*
   * Dynamic import:
   * only load generation dependencies when this job actually runs.
   */
  const {
    generateContentJob,
  } = await import(
    "./jobs/generateContent"
  );

  return generateContentJob(
    parsed.campaignId,
    parsed.videoIndex,
  );
}

async function runRenderVideoJob(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed =
    parseJobPayload(
      "RENDER_VIDEO",
      payload,
    ) as {
      videoId: string;
    };

  if (!parsed.videoId) {
    throw new Error(
      "Invalid render payload.",
    );
  }

  /*
   * Most important change:
   *
   * Rendering does NOT import Facebook publishing code.
   */
  const {
    renderVideoJob,
  } = await import(
    "./jobs/renderVideo"
  );

  return renderVideoJob(
    parsed.videoId,
  );
}

async function runPublishVideoJob(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed =
    parseJobPayload(
      "PUBLISH_VIDEO",
      payload,
    ) as {
      videoId: string;
      socialAccountId: string;
      publishJobId?: string;
      platform?: string;
    };

  if (
    !parsed.videoId ||
    !parsed.socialAccountId
  ) {
    throw new Error(
      "Invalid publish payload.",
    );
  }

  /*
   * Facebook-related dependencies are loaded ONLY for publishing.
   *
   * If they are broken, this publishing job fails without taking down
   * the whole render worker.
   */
  const {
    publishVideoJob,
  } = await import(
    "./jobs/publishVideo"
  );

  return publishVideoJob({
    videoId:
      parsed.videoId,

    socialAccountId:
      parsed.socialAccountId,

    publishJobId:
      parsed.publishJobId,

    platform:
      parsed.platform,
  });
}

async function executeJob(
  type: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (type) {
    case "GENERATE_CONTENT":
      return runGenerateContentJob(
        payload,
      );

    case "RENDER_VIDEO":
      return runRenderVideoJob(
        payload,
      );

    case "PUBLISH_VIDEO":
      return runPublishVideoJob(
        payload,
      );

    default:
      throw new Error(
        `Unsupported job type: ${type}`,
      );
  }
}

async function finalizeGenerationIfNeeded(
  type: string,
  payload: unknown,
) {
  if (
    type !==
      "GENERATE_CONTENT" ||
    !payload ||
    typeof payload !==
      "object" ||
    !(
      "campaignId" in
      payload
    ) ||
    typeof payload.campaignId !==
      "string"
  ) {
    return;
  }

  try {
    await finalizeCampaignGeneration(
      payload.campaignId,
    );
  } catch (error) {
    console.error(
      "Campaign finalization failed",
      {
        campaignId:
          payload.campaignId,
        error,
      },
    );
  }
}

async function processNextJob(): Promise<boolean> {
  await maybeRecoverStaleJobs();

  const staleBefore =
    new Date(
      Date.now() -
        lockTimeoutMs,
    );

  const job =
    await claimJob(
      staleBefore,
    );

  if (!job) {
    return false;
  }

  const jobId =
    job._id.toString();

  processingJob = true;

  console.info(
    "Job started",
    {
      jobId,
      type: job.type,
    },
  );

  try {
    const result =
      await executeJob(
        job.type,
        job.payload as Record<
          string,
          unknown
        >,
      );

    await markCompleted(
      jobId,
      result,
    );

    await finalizeGenerationIfNeeded(
      job.type,
      job.payload,
    );

    console.info(
      "Job completed",
      {
        jobId,
        type: job.type,
      },
    );
  } catch (error) {
    const safeMessage =
      formatWorkerError(
        error,
        job.type,
      );

    console.error(
      "Job failed",
      {
        jobId,
        type: job.type,
        error:
          safeMessage,
      },
    );

    /*
     * This MUST happen for every error.
     *
     * Otherwise the UI will continue seeing "processing" forever.
     */
    try {
      await markFailed(
        jobId,
        safeMessage,
      );
    } catch (
      markError
    ) {
      console.error(
        "CRITICAL: could not mark job as failed",
        {
          jobId,
          originalError:
            safeMessage,
          markError,
        },
      );
    }

    await finalizeGenerationIfNeeded(
      job.type,
      job.payload,
    );
  } finally {
    processingJob = false;
  }

  return true;
}

async function main() {
  await connectDB();

  console.info(
    "Job worker started",
    {
      pollIntervalMs,
      lockTimeoutMs,
      pid: process.pid,
    },
  );

  while (!shuttingDown) {
    try {
      const foundJob =
        await processNextJob();

      if (!foundJob) {
        await delay(
          pollIntervalMs,
        );
      }
    } catch (error) {
      /*
       * A DB/network error during polling must not kill the worker.
       */
      console.error(
        "Worker polling cycle failed",
        error,
      );

      await delay(
        Math.max(
          pollIntervalMs,
          2000,
        ),
      );
    }
  }

  console.info(
    processingJob
      ? "Worker shutdown requested after current job."
      : "Worker shutdown requested.",
  );
}

function requestShutdown(
  signal: string,
) {
  if (shuttingDown) {
    return;
  }

  console.info(
    `Received ${signal}; stopping after the current job.`,
  );

  shuttingDown = true;
}

process.once(
  "SIGINT",
  () =>
    requestShutdown(
      "SIGINT",
    ),
);

process.once(
  "SIGTERM",
  () =>
    requestShutdown(
      "SIGTERM",
    ),
);

main()
  .catch((error) => {
    console.error(
      "Job worker stopped unexpectedly",
      error,
    );

    process.exitCode = 1;
  })
  .finally(
    async () => {
      try {
        await disconnectDB();
      } catch (
        error
      ) {
        console.error(
          "Database disconnect failed",
          error,
        );
      }

      console.info(
        "Job worker stopped",
      );
    },
  );