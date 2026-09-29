"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VideoScene } from "@/types/video";

export function VideoSceneActions({ videoId, scenes, videoPath }: { videoId: string; scenes: VideoScene[]; videoPath?: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (isGenerating) return;
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/generate-scenes`, { method: "POST" });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message || "Unable to prepare visual assets.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to prepare visual assets.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRender() {
    if (isRendering) return;
    setError("");
    setIsRendering(true);
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

  if (scenes.length === 0) {
    return (
      <div style={{ display: "grid", gap: 6 }}>
        <button className={`primary-link${isGenerating ? " disabled-action" : ""}`} disabled={isGenerating} onClick={handleGenerate} type="button">
          {isGenerating ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Preparing visual assets...</> : "Generate scenes"}
        </button>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {videoPath ? (
        <video className="video-preview" controls playsInline src={videoPath} />
      ) : (
        <button className={`primary-link${isRendering ? " disabled-action" : ""}`} disabled={isRendering} onClick={handleRender} type="button">
          {isRendering ? <><LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> Rendering video...</> : "Render video"}
        </button>
      )}
      {error && <span className="form-error">{error}</span>}
      {!videoPath && <div className="scene-list">
        {scenes.map((scene) => (
        <article className="scene-item" key={scene.order}>
          {scene.assetPath && <Image alt="" className="scene-image" height={104} src={scene.assetPath} width={72} />}
          <div className="scene-copy">
            <div className="scene-meta"><strong>Scene {String(scene.order).padStart(2, "0")}</strong><span>{scene.duration} sec</span></div>
            <p>{scene.narration}</p>
            <span className="section-caption">{scene.assetType === "ai" ? "AI generated" : scene.assetType === "stock" ? `Stock · ${scene.assetProvider || "external"}` : "Local fallback"}{scene.credit ? ` · ${scene.credit}` : ""}</span>
            {scene.sourceUrl && <a className="text-link" href={scene.sourceUrl} rel="noreferrer" target="_blank">View source</a>}
          </div>
        </article>
        ))}
      </div>}
    </div>
  );
}