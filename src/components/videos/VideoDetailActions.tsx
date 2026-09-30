"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { VideoPublishAction, type VideoPublishingData } from "./VideoPublishAction";

type ReviewAction = "approve" | "reject";
type JobStatus = "queued" | "processing" | "completed" | "failed";

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
  initialJob?: { id: string; status: JobStatus; error?: string } | null;
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJob?.id ?? null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(initialJob?.status ?? null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [error, setError] = useState("");

  const isInReview = status === "review";
  const actionLock = useRef(false);
  const [renderSubmitting, setRenderSubmitting] = useState(false);
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
    if (actionLock.current || isRendering) return;
    actionLock.current = true;
    setRenderSubmitting(true);
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
    } finally { actionLock.current = false; setRenderSubmitting(false); }
  }

  async function submitReview(action: ReviewAction) {
    if (actionLock.current || isReviewing || !isInReview) return;

    const confirmed = window.confirm(
      action === "approve"
        ? "Approve this video?\n\nThis marks the video as approved for future publishing."
        : "Reject this video?\n\nThis will mark the video as rejected and prevent it from entering the publishing flow.",
    );

    if (!confirmed) return;

    actionLock.current = true;
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
      actionLock.current = false;
      setIsReviewing(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="video-detail-action-controls">
      {canRender && (
        <button className="primary-link" disabled={renderSubmitting || isRendering || isReviewing} onClick={renderVideo} type="button">
          {jobStatus === "queued" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Queued...</> : isRendering ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rendering video...</> : "Render video"}
        </button>
      )}
      {status === "approved" && <VideoPublishAction videoId={videoId} title={title} rendered={rendered} publishing={publishing} />}

      {isInReview ? (
        <>
          <button className="secondary-link" disabled={isReviewing} onClick={() => submitReview("approve")} type="button">
            {isReviewing && pendingAction === "approve" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Approving...</> : "Approve"}
          </button>
          <button className="secondary-link" disabled={isReviewing} onClick={() => submitReview("reject")} type="button">
            {isReviewing && pendingAction === "reject" ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rejecting...</> : "Reject"}
          </button>
        </>
      ) : null}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}