"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VideoScene } from "@/types/video";

export function VideoSceneActions({ videoId, scenes }: { videoId: string; scenes: VideoScene[] }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
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
    <div className="scene-list">
      {scenes.map((scene) => (
        <article className="scene-item" key={scene.order}>
          {scene.assetPath && <Image alt="" className="scene-image" height={104} src={scene.assetPath} width={72} />}
          <div className="scene-copy">
            <div className="scene-meta"><strong>Scene {String(scene.order).padStart(2, "0")}</strong><span>{scene.duration} sec</span></div>
            <p>{scene.narration}</p>
            <span className="section-caption">{scene.assetType === "ai" ? "AI generated" : scene.assetType === "stock" ? "Stock · Pexels" : "Local fallback"}{scene.credit ? ` · ${scene.credit}` : ""}</span>
            {scene.sourceUrl && <a className="text-link" href={scene.sourceUrl} rel="noreferrer" target="_blank">View source</a>}
          </div>
        </article>
      ))}
    </div>
  );
}