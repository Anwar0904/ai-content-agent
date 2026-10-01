"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface GenerationProgress {
  completed: number;
  total: number;
  failed: number;
  queued: number;
  processing: number;
}

const INITIAL_PROGRESS: GenerationProgress = {
  completed: 0,
  total: 0,
  failed: 0,
  queued: 0,
  processing: 0,
};

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_FAILURES = 3;

export function CampaignActions({
  campaignId,
  campaignStatus,
  videoCount,
  actualVideoCount,
}: {
  campaignId: string;
  campaignStatus: string;
  videoCount: number;
  actualVideoCount: number;
}) {
  const router = useRouter();

  const [progress, setProgress] =
    useState<GenerationProgress>({
      ...INITIAL_PROGRESS,
      total: videoCount,
    });

  const [isStarting, setIsStarting] =
    useState(false);

  const [isTracking, setIsTracking] =
    useState(campaignStatus === "generating");

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const pollFailures = useRef(0);

  const isBusy = isStarting || isTracking;

  const hasVideos = actualVideoCount > 0;

  const generationComplete =
    actualVideoCount >= videoCount &&
    videoCount > 0;

  const pollProgress = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/generation`,
          {
            cache: "no-store",
            signal,
          },
        );

        const result = (await response.json()) as {
          data?: GenerationProgress;
          error?: {
            message?: string;
          };
        };

        if (!response.ok || !result.data) {
          pollFailures.current += 1;

          if (
            pollFailures.current >=
            MAX_POLL_FAILURES
          ) {
            setError(
              result.error?.message ||
                "We couldn't track generation progress. Refresh the page to check the latest status.",
            );

            setIsTracking(false);
          }

          return;
        }

        pollFailures.current = 0;

        setProgress(result.data);

        const finished =
          result.data.queued === 0 &&
          result.data.processing === 0 &&
          result.data.completed +
            result.data.failed >=
            result.data.total;

        if (!finished) {
          return;
        }

        setIsTracking(false);

        if (result.data.failed > 0) {
          setError(
            `${result.data.failed} ${
              result.data.failed === 1
                ? "video"
                : "videos"
            } could not be generated.`,
          );
        } else {
          setSuccessMessage(
            `${result.data.completed} ${
              result.data.completed === 1
                ? "video is"
                : "videos are"
            } ready.`,
          );
        }

        router.refresh();
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
          setError(
            "We lost connection while checking generation progress. Refresh the page to see the latest status.",
          );

          setIsTracking(false);
        }
      }
    },
    [campaignId, router],
  );

  useEffect(() => {
    if (!isTracking) {
      return;
    }

    const controller =
      new AbortController();

    void pollProgress(controller.signal);

    const interval = window.setInterval(
      () => {
        void pollProgress(
          controller.signal,
        );
      },
      POLL_INTERVAL_MS,
    );

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [isTracking, pollProgress]);

  async function handleGenerate() {
    if (isBusy) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsStarting(true);
    pollFailures.current = 0;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );

      const result: unknown =
        await response.json();

      if (!response.ok) {
        const apiError =
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error &&
          typeof result.error === "object"
            ? result.error
            : null;

        const message =
          apiError &&
          "message" in apiError &&
          typeof apiError.message ===
            "string"
            ? apiError.message
            : "We couldn't start video generation.";

        setError(message);
        setIsTracking(false);

        return;
      }

      setProgress({
        completed: 0,
        total: videoCount,
        failed: 0,
        queued: videoCount,
        processing: 0,
      });

      setIsTracking(true);
    } catch {
      setError(
        "We couldn't start video generation. Check your connection and try again.",
      );

      setIsTracking(false);
    } finally {
      setIsStarting(false);
    }
  }

  /*
   * Campaign already contains everything requested.
   */
  if (generationComplete) {
    return (
      <Link
        href={`/videos?campaign=${campaignId}`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
      >
        <Clapperboard
          aria-hidden="true"
          size={15}
        />
        View videos
      </Link>
    );
  }

  return (
    <div className="min-w-0 space-y-2 sm:text-right">
      {isBusy ? (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin"
            size={15}
          />

          <span className="truncate">
            {isStarting
              ? "Starting generation..."
              : `Generating ${progress.completed}/${progress.total}`}
          </span>
        </div>
      ) : hasVideos ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/videos?campaign=${campaignId}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            <Clapperboard
              aria-hidden="true"
              size={15}
            />
            View videos
          </Link>

          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles
              aria-hidden="true"
              size={15}
            />
            Continue generation
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles
            aria-hidden="true"
            size={15}
          />
          Generate videos
        </button>
      )}

      {isTracking && (
        <div className="min-w-[220px]">
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-zinc-900 transition-[width] duration-300"
              style={{
                width: `${
                  progress.total > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (progress.completed /
                            progress.total) *
                            100,
                        ),
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <p className="mt-1.5 text-xs text-zinc-500">
            {progress.processing > 0
              ? `${progress.processing} processing`
              : progress.queued > 0
                ? `${progress.queued} waiting`
                : "Finishing up..."}
          </p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 sm:justify-end"
        >
          <CheckCircle2
            aria-hidden="true"
            size={13}
          />
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex max-w-sm items-start gap-1.5 text-xs leading-5 text-red-600 sm:ml-auto"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={13}
          />

          <span>{error}</span>
        </div>
      )}
    </div>
  );
}