"use client";

import {
  BadgeCheck,
  CircleAlert,
  LoaderCircle,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  VideoPublishAction,
  type VideoPublishingData,
} from "./VideoPublishAction";

type ReviewAction = "approve" | "reject";

type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

const POLL_INTERVAL_MS = 2500;

/**
 * Stop trusting the status endpoint after repeated failures.
 */
const MAX_POLL_FAILURES = 3;

/**
 * Absolute UI-side protection.
 *
 * Even if the worker dies and MongoDB keeps saying "processing",
 * the browser will not spin forever.
 *
 * 8 minutes is intentionally generous for a prototype running FFmpeg.
 */
const MAX_RENDER_TRACKING_MS = 8 * 60 * 1000;

export function VideoDetailActions({
  videoId,
  canRender = false,
  status = "draft",
  initialJob,
  title = "Video",
  rendered = false,
  publishing = null,
}: {
  videoId: string;
  title?: string;
  rendered?: boolean;
  publishing?: VideoPublishingData | null;
  canRender?: boolean;
  status?: string;
  initialJob?: {
    id: string;
    status: JobStatus;
    error?: string;
  } | null;
}) {
  const router = useRouter();

  const [jobId, setJobId] = useState(
    initialJob?.id ?? null,
  );

  const [jobStatus, setJobStatus] =
    useState<JobStatus | null>(
      initialJob?.status ?? null,
    );

  const [isReviewing, setIsReviewing] =
    useState(false);

  const [pendingAction, setPendingAction] =
    useState<ReviewAction | null>(null);

  const [renderSubmitting, setRenderSubmitting] =
    useState(false);

  const [error, setError] = useState(
    initialJob?.status === "failed"
      ? initialJob.error ??
          "The previous render failed."
      : "",
  );

  const actionLock = useRef(false);

  const pollFailures = useRef(0);

  /**
   * Tracks when this browser started following the current render.
   */
  const trackingStartedAt = useRef<number | null>(
    initialJob &&
      (initialJob.status === "queued" ||
        initialJob.status === "processing")
      ? Date.now()
      : null,
  );

  const isInReview =
    status === "review";

  const isRendering =
    jobStatus === "queued" ||
    jobStatus === "processing";

  const canPublish =
    rendered &&
    (status === "approved" ||
      status === "published");

  const stopTrackingWithError =
    useCallback((message: string) => {
      setError(message);

      /**
       * Stop the client from continuing to represent
       * this as an actively-tracked render.
       *
       * We deliberately do not mutate the DB from the browser.
       */
      setJobStatus(null);

      trackingStartedAt.current = null;
    }, []);

  const pollJob = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      if (!jobId) {
        return;
      }

      const startedAt =
        trackingStartedAt.current;

      if (
        startedAt &&
        Date.now() - startedAt >
          MAX_RENDER_TRACKING_MS
      ) {
        stopTrackingWithError(
          "Rendering is taking longer than expected and may be stuck. The status check has stopped. Refresh the page to inspect the latest job state or try rendering again after the worker recovers.",
        );

        return;
      }

      try {
        const response = await fetch(
          `/api/jobs/${jobId}`,
          {
            cache: "no-store",
            signal,
          },
        );

        const result =
          (await response.json()) as {
            data?: {
              job?: {
                status: JobStatus;
                error?: string;
              };
            };

            error?: {
              message?: string;
            };
          };

        if (
          !response.ok ||
          !result.data?.job
        ) {
          pollFailures.current += 1;

          if (
            pollFailures.current >=
            MAX_POLL_FAILURES
          ) {
            stopTrackingWithError(
              result.error?.message ??
                "Render status could not be loaded after several attempts. Tracking has stopped.",
            );
          }

          return;
        }

        pollFailures.current = 0;

        const job =
          result.data.job;

        setJobStatus(job.status);

        if (
          job.status === "failed"
        ) {
          trackingStartedAt.current =
            null;

          setError(
            job.error ??
              "Video rendering failed.",
          );

          return;
        }

        if (
          job.status === "completed"
        ) {
          trackingStartedAt.current =
            null;

          setError("");

          router.refresh();

          return;
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        pollFailures.current += 1;

        if (
          pollFailures.current >=
          MAX_POLL_FAILURES
        ) {
          stopTrackingWithError(
            "The connection to the render worker was lost. Tracking has stopped.",
          );
        }
      }
    },
    [
      jobId,
      router,
      stopTrackingWithError,
    ],
  );

  useEffect(() => {
    if (
      !jobId ||
      jobStatus === "completed" ||
      jobStatus === "failed" ||
      jobStatus === null
    ) {
      return;
    }

    if (
      trackingStartedAt.current === null
    ) {
      trackingStartedAt.current =
        Date.now();
    }

    const controller =
      new AbortController();

    void pollJob(
      controller.signal,
    );

    const interval =
      window.setInterval(
        () => {
          void pollJob(
            controller.signal,
          );
        },
        POLL_INTERVAL_MS,
      );

    return () => {
      controller.abort();

      window.clearInterval(
        interval,
      );
    };
  }, [
    jobId,
    jobStatus,
    pollJob,
  ]);

  async function renderVideo() {
    if (
      actionLock.current ||
      isRendering ||
      renderSubmitting
    ) {
      return;
    }

    actionLock.current = true;

    setRenderSubmitting(true);
    setJobStatus(null);
    setJobId(null);
    setError("");

    pollFailures.current = 0;
    trackingStartedAt.current =
      null;

    try {
      const response = await fetch(
        `/api/videos/${videoId}/render`,
        {
          method: "POST",
        },
      );

      const result =
        (await response.json()) as {
          data?: {
            job?: {
              id: string;
              status: JobStatus;
            };
          };

          error?: {
            message?: string;
          };
        };

      if (!response.ok) {
        setError(
          result.error?.message ??
            "Video rendering could not be started.",
        );

        return;
      }

      if (!result.data?.job) {
        setError(
          "The server did not return a valid render job.",
        );

        return;
      }

      trackingStartedAt.current =
        Date.now();

      setJobId(
        result.data.job.id,
      );

      setJobStatus(
        result.data.job.status,
      );
    } catch {
      setError(
        "Video rendering could not be started. Check your connection and try again.",
      );
    } finally {
      actionLock.current = false;

      setRenderSubmitting(false);
    }
  }

  async function submitReview(
    action: ReviewAction,
  ) {
    if (
      actionLock.current ||
      isReviewing ||
      !isInReview
    ) {
      return;
    }

    if (
      action === "reject"
    ) {
      const confirmed =
        window.confirm(
          "Reject this video?\n\nIt will no longer be eligible for publishing.",
        );

      if (!confirmed) {
        return;
      }
    }

    actionLock.current = true;

    setIsReviewing(true);
    setPendingAction(action);
    setError("");

    try {
      const response = await fetch(
        `/api/videos/${videoId}/${action}`,
        {
          method: "POST",
        },
      );

      const result =
        (await response.json()) as {
          error?: {
            message?: string;
          };
        };

      if (!response.ok) {
        setError(
          result.error?.message ??
            `Video ${
              action === "approve"
                ? "approval"
                : "rejection"
            } failed.`,
        );

        return;
      }

      router.refresh();
    } catch {
      setError(
        `Video ${
          action === "approve"
            ? "approval"
            : "rejection"
        } failed. Please try again.`,
      );
    } finally {
      actionLock.current = false;

      setIsReviewing(false);

      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      {canRender && (
        <button
          type="button"
          disabled={
            renderSubmitting ||
            isRendering ||
            isReviewing
          }
          onClick={
            renderVideo
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRendering ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={15}
              />

              {jobStatus ===
              "queued"
                ? "Waiting for worker..."
                : "Rendering video..."}
            </>
          ) : renderSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={15}
              />

              Starting render...
            </>
          ) : (
            <>
              <RotateCw
                aria-hidden="true"
                size={15}
              />

              {status === "failed"
                ? "Try rendering again"
                : "Render video"}
            </>
          )}
        </button>
      )}

      {isInReview && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            disabled={isReviewing}
            onClick={() =>
              submitReview(
                "approve",
              )
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReviewing &&
            pendingAction ===
              "approve" ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={15}
                />

                Approving...
              </>
            ) : (
              <>
                <BadgeCheck
                  aria-hidden="true"
                  size={15}
                />

                Approve video
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isReviewing}
            onClick={() =>
              submitReview(
                "reject",
              )
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReviewing &&
            pendingAction ===
              "reject" ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={15}
                />

                Rejecting...
              </>
            ) : (
              <>
                <XCircle
                  aria-hidden="true"
                  size={15}
                />

                Reject
              </>
            )}
          </button>
        </div>
      )}

      {canPublish && (
        <VideoPublishAction
          publishing={publishing}
          rendered={rendered}
          title={title}
          videoId={videoId}
          mode={
            status ===
            "published"
              ? "republish"
              : "publish"
          }
        />
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={15}
          />

          <div>
            <p className="font-semibold text-red-900">
              Rendering stopped
            </p>

            <p className="mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}