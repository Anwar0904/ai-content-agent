"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function VideoDetailActions({ videoId, canRender = false }: { videoId: string; canRender?: boolean }) {
  const router = useRouter();
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="video-detail-action-controls">
      {canRender && (
        <button className="primary-link" disabled={isRendering} onClick={renderVideo} type="button">
          {isRendering ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rendering video...</> : "Render video"}
        </button>
      )}
      <button className="secondary-link" disabled title="Video editing is not available yet." type="button">Edit</button>
      <button className="secondary-link" disabled title="Video regeneration is not available yet." type="button">Regenerate</button>
      <button className="secondary-link" disabled title="Approval workflow will be available on Day 10." type="button">Approve</button>
      <button className="secondary-link" disabled title="Rejection workflow will be available on Day 10." type="button">Reject</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}