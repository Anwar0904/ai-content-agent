"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [error, setError] = useState("");

  const isBusy = campaignStatus === "generating" || isGenerating;

  async function handleGenerate() {
    if (isBusy) return;

    setError("");
    setIsGenerating(true);

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

      router.push(`/videos?generated=${videoCount}`);
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
            {`Generating ${videoCount} videos...`}
          </>
        ) : (
          "Generate content"
        )}
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
