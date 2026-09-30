"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ReviewAction = "approve" | "reject";
type JobStatus = "queued" | "processing" | "completed" | "failed";

export function VideoDetailActions({
  videoId,
  canRender = false,
  status = "draft",
  initialJob,
}: {
  videoId: string;
  canRender?: boolean;
  status?: string;
  initialJob?: { id: string; status: JobStatus; error?: string } | null;
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJob?.id ?? null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(initialJob?.status ?? null);
  const [publishStatus, setPublishStatus] = useState<JobStatus | null>(null);
  const [publishError, setPublishError] = useState("");
  const [publishAccountId, setPublishAccountId] = useState<string>("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  const isInReview = status === "review";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isRendering = jobStatus === "queued" || jobStatus === "processing";

  useEffect(() => {
    if (!jobId || jobStatus === "completed" || jobStatus === "failed") return;

    let cancelled = false;
    async function pollJob() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const result = (await response.json()) as { data?: { job?: { status: JobStatus; error?: string } }; error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok || !result.data?.job) {
          setError(result.error?.message || "Render status couldn't be loaded.");
          return;
        }
        const job = result.data.job;
        setJobStatus(job.status);
        if (job.status === "failed") setError(job.error || "Video rendering failed. Please try again.");
        if (job.status === "completed") router.refresh();
      } catch {
        if (!cancelled) setError("Render status couldn't be loaded.");
      }
    }

    void pollJob();
    const interval = window.setInterval(() => void pollJob(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId, jobStatus, router]);

  async function renderVideo() {
    if (isRendering) return;
    setJobStatus(null);
    setError("");
    try {
      const response = await fetch(`/api/videos/${videoId}/render`, { method: "POST" });
      const result = (await response.json()) as { data?: { job?: { id: string; status: JobStatus } }; error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message || "Video rendering failed. Please try again.");
        return;
      }
      if (!result.data?.job) {
        setError("Render job was not returned by the server.");
        return;
      }
      setJobId(result.data.job.id);
      setJobStatus(result.data.job.status);
    } catch {
      setError("Video rendering failed. Please try again.");
    }
  }

  async function publishVideo(platform: "facebook" | "instagram") {
    if (!publishAccountId) {
      setPublishError("Select a mock social account first.");
      return;
    }

    setPublishStatus("queued");
    setPublishError("");

    try {
      const response = await fetch(`/api/videos/${videoId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialAccountId: publishAccountId }),
      });
      const result = (await response.json()) as { data?: { job?: { id: string; status: JobStatus } }; error?: { message?: string } };
      if (!response.ok) {
        setPublishError(result.error?.message || `Mock ${platform} publish failed.`);
        setPublishStatus(null);
        return;
      }
      if (!result.data?.job) {
        setPublishError("Publishing job was not returned by the server.");
        setPublishStatus(null);
        return;
      }
      setPublishStatus(result.data.job.status);
    } catch {
      setPublishError(`Mock ${platform} publishing failed.`);
      setPublishStatus(null);
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
          {jobStatus === "queued" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Queued...</> : isRendering ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rendering video...</> : "Render video"}
        </button>
      )}
      {status === "approved" && (
        <div className="publish-controls">
          <select aria-label="Select mock publishing destination" defaultValue="" onChange={(event) => setPublishAccountId(event.target.value)} value={publishAccountId}>
            <option value="">Select mock destination</option>
            <option value="mock-facebook-page-1">Mock Facebook Page</option>
            <option value="mock-instagram-account-1">Mock Instagram Account</option>
          </select>
          <button className="secondary-link" disabled={!publishAccountId || !!publishStatus} onClick={() => publishVideo(publishAccountId.startsWith("mock-facebook") ? "facebook" : "instagram")} type="button">
            {publishStatus === "queued" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Queued...</> : publishStatus === "processing" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Publishing...</> : `Publish to ${publishAccountId.includes("facebook") ? "Facebook" : "Instagram"}`}
          </button>
          {publishError && <p className="form-error" role="alert">{publishError}</p>}
        </div>
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