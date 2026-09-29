"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CampaignActions({
  campaignId,
  campaignStatus,
  videoCount,
}: {
  campaignId: string;
  campaignStatus: string;
  videoCount: number;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTracking, setIsTracking] = useState(campaignStatus === "generating");
  const [progress, setProgress] = useState({ completed: 0, total: videoCount, failed: 0 });
  const [error, setError] = useState("");

  const isBusy = isTracking || isGenerating;

  useEffect(() => {
    if (!isBusy) return;
    let cancelled = false;

    async function pollProgress() {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/generation`, { cache: "no-store" });
        const result = (await response.json()) as { data?: { completed: number; total: number; failed: number; queued: number; processing: number }; error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok || !result.data) {
          setError(result.error?.message || "Generation status could not be loaded.");
          return;
        }
        setProgress(result.data);
        if (result.data.queued + result.data.processing === 0 && result.data.completed + result.data.failed === result.data.total) {
          setIsGenerating(false);
          setIsTracking(false);
          if (result.data.failed === 0) router.push(`/videos?generated=${result.data.completed}`);
          else setError(`${result.data.failed} video${result.data.failed === 1 ? "" : "s"} failed to generate.`);
        }
      } catch {
        if (!cancelled) setError("Generation status could not be loaded.");
      }
    }

    void pollProgress();
    const interval = window.setInterval(() => void pollProgress(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [campaignId, isBusy, router]);

  async function handleGenerate() {
    if (isBusy) return;

    setError("");
    setIsGenerating(true);
    setIsTracking(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const apiError =
          result && typeof result === "object" && "error" in result && result.error && typeof result.error === "object"
            ? result.error
            : null;

        const message =
          apiError && "message" in apiError && typeof apiError.message === "string"
            ? apiError.message
            : "Something went wrong while generating content.";

        setError(message);
        return;
      }

      setProgress({ completed: 0, total: videoCount, failed: 0 });
    } catch {
      setError("Something went wrong while generating content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        className={`primary-link${isBusy ? " disabled-action" : ""}`}
        disabled={isBusy}
        onClick={handleGenerate}
        type="button"
      >
        {isBusy ? (
          <>
            <LoaderCircle aria-hidden="true" className="button-spinner" size={14} />
            {`Generating videos... ${progress.completed} / ${progress.total} completed`}
          </>
        ) : (
          "Generate content"
        )}
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
