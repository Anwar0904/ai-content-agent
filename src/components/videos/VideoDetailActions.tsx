"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewAction = "approve" | "reject";

export function VideoDetailActions({
  videoId,
  canRender = false,
  status = "draft",
}: {
  videoId: string;
  canRender?: boolean;
  status?: string;
}) {
  const router = useRouter();
  const [isRendering, setIsRendering] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  const isInReview = status === "review";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  async function renderVideo() {
    if (isRendering) return;
    setIsRendering(true);
    setError("");
    try {
      const response = await fetch(`/api/videos/${videoId}/render`, { method: "POST" });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message || "Video rendering failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Video rendering failed. Please try again.");
    } finally {
      setIsRendering(false);
    }
  }

  async function submitReview(action: ReviewAction) {
    if (isReviewing || !isInReview) return;

    const confirmed = window.confirm(
      action === "approve"
        ? "Approve this video?\n\nThis marks the video as approved for future publishing."
        : "Reject this video?\n\nThis will mark the video as rejected and prevent it from entering the publishing flow.",
    );

    if (!confirmed) return;

    setIsReviewing(true);
    setPendingAction(action);
    setError("");

    try {
      const response = await fetch(`/api/videos/${videoId}/${action}`, { method: "POST" });
      const result = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        setError(result.error?.message || `Video ${action === "approve" ? "approval" : "rejection"} failed.`);
        return;
      }

      router.refresh();
    } catch {
      setError(`Video ${action === "approve" ? "approval" : "rejection"} failed. Please try again.`);
    } finally {
      setIsReviewing(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="video-detail-action-controls">
      {canRender && (
        <button className="primary-link" disabled={isRendering || isReviewing} onClick={renderVideo} type="button">
          {isRendering ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rendering video...</> : "Render video"}
        </button>
      )}
      <button className="secondary-link" disabled title="Video editing is not available yet." type="button">Edit</button>
      <button className="secondary-link" disabled title="Video regeneration is not available yet." type="button">Regenerate</button>

      {isInReview ? (
        <>
          <button className="secondary-link" disabled={isReviewing} onClick={() => submitReview("approve")} type="button">
            {isReviewing && pendingAction === "approve" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Approving...</> : "Approve"}
          </button>
          <button className="secondary-link" disabled={isReviewing} onClick={() => submitReview("reject")} type="button">
            {isReviewing && pendingAction === "reject" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rejecting...</> : "Reject"}
          </button>
        </>
      ) : isApproved ? (
        <button className="secondary-link" disabled type="button">Approved</button>
      ) : isRejected ? (
        <button className="secondary-link" disabled type="button">Rejected</button>
      ) : (
        <>
          <button className="secondary-link" disabled title={`This video is ${status}. Approval is available once it reaches REVIEW.`} type="button">Approve</button>
          <button className="secondary-link" disabled title={`This video is ${status}. Rejection is available once it reaches REVIEW.`} type="button">Reject</button>
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}