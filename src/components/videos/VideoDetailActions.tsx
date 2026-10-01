"use client";

import {
  BadgeCheck,
  CircleAlert,
  LoaderCircle,
  RotateCw,
  XCircle,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";
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

type ReviewAction =
  | "approve"
  | "reject";

type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_FAILURES = 3;

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

  const [jobId, setJobId] =
    useState(
      initialJob?.id ?? null,
    );

  const [
    jobStatus,
    setJobStatus,
  ] = useState<JobStatus | null>(
    initialJob?.status ?? null,
  );

  const [
    isReviewing,
    setIsReviewing,
  ] = useState(false);

  const [
    pendingAction,
    setPendingAction,
  ] = useState<ReviewAction | null>(
    null,
  );

  const [
    renderSubmitting,
    setRenderSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const actionLock =
    useRef(false);

  const pollFailures =
    useRef(0);

  const isInReview =
    status === "review";

  const isRendering =
    jobStatus === "queued" ||
    jobStatus === "processing";

  const pollJob = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      if (!jobId) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/jobs/${jobId}`,
            {
              cache:
                "no-store",
              signal,
            },
          );

        const result =
          (await response.json()) as {
            data?: {
              job?: {
                status:
                  JobStatus;
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
          pollFailures.current +=
            1;

          if (
            pollFailures.current >=
            MAX_POLL_FAILURES
          ) {
            setError(
              result.error?.message ??
                "We couldn't track the render job. Refresh the page to check its latest status.",
            );
          }

          return;
        }

        pollFailures.current = 0;

        const job =
          result.data.job;

        setJobStatus(
          job.status,
        );

        if (
          job.status ===
          "failed"
        ) {
          setError(
            job.error ??
              "Video rendering failed. You can try again.",
          );
        }

        if (
          job.status ===
          "completed"
        ) {
          router.refresh();
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        pollFailures.current +=
          1;

        if (
          pollFailures.current >=
          MAX_POLL_FAILURES
        ) {
          setError(
            "We lost connection while tracking rendering. Refresh the page to check the latest status.",
          );
        }
      }
    },
    [jobId, router],
  );

  useEffect(() => {
    if (
      !jobId ||
      jobStatus ===
        "completed" ||
      jobStatus ===
        "failed"
    ) {
      return;
    }

    const controller =
      new AbortController();

    void pollJob(
      controller.signal,
    );

    const interval =
      window.setInterval(
        () =>
          void pollJob(
            controller.signal,
          ),
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
      isRendering
    ) {
      return;
    }

    actionLock.current = true;

    setRenderSubmitting(true);
    setJobStatus(null);
    setError("");
    pollFailures.current = 0;

    try {
      const response =
        await fetch(
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
              status:
                JobStatus;
            };
          };
          error?: {
            message?: string;
          };
        };

      if (!response.ok) {
        setError(
          result.error?.message ??
            "Video rendering couldn't be started.",
        );

        return;
      }

      if (
        !result.data?.job
      ) {
        setError(
          "The render job was created without a valid job response.",
        );

        return;
      }

      setJobId(
        result.data.job.id,
      );

      setJobStatus(
        result.data.job.status,
      );
    } catch {
      setError(
        "Video rendering couldn't be started. Check your connection and try again.",
      );
    } finally {
      actionLock.current = false;
      setRenderSubmitting(
        false,
      );
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
      const response =
        await fetch(
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
              action ===
              "approve"
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
                ? "Queued for rendering..."
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

              {status ===
              "failed"
                ? "Render again"
                : "Render video"}
            </>
          )}
        </button>
      )}

      {isInReview && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            disabled={
              isReviewing
            }
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
            disabled={
              isReviewing
            }
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

      {status ===
        "approved" && (
        <VideoPublishAction
          publishing={
            publishing
          }
          rendered={
            rendered
          }
          title={title}
          videoId={
            videoId
          }
        />
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={14}
          />

          <span>{error}</span>
        </div>
      )}
    </div>
  );
}