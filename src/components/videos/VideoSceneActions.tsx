"use client";

import {
  CircleAlert,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { VideoScene } from "@/types/video";

export function VideoSceneActions({
  videoId,
  scenes,
}: {
  videoId: string;
  scenes: VideoScene[];
}) {
  const router =
    useRouter();

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const actionLock =
    useRef(false);

  if (scenes.length > 0) {
    return null;
  }

  async function handleGenerate() {
    if (
      isGenerating ||
      actionLock.current
    ) {
      return;
    }

    actionLock.current = true;

    setError("");
    setIsGenerating(true);

    try {
      const response =
        await fetch(
          `/api/videos/${videoId}/generate-scenes`,
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
            "We couldn't prepare the video scenes.",
        );

        return;
      }

      router.refresh();
    } catch {
      setError(
        "We couldn't prepare the video scenes. Check your connection and try again.",
      );
    } finally {
      actionLock.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={
          isGenerating
        }
        onClick={
          handleGenerate
        }
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={15}
            />
            Preparing scenes...
          </>
        ) : (
          <>
            <Sparkles
              aria-hidden="true"
              size={15}
            />
            Generate scenes
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={14}
          />

          {error}
        </div>
      )}
    </div>
  );
}