import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { renderVideo } from "@/services/video/videoRenderer";
import { TtsError } from "@/services/ai/tts/ttsGenerator";

const activeRenders = new Set<string>();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoId || !isValidObjectId(videoId)) return errorResponse("Invalid video ID.", 400);
  if (activeRenders.has(videoId)) return errorResponse("This video is already rendering.", 409);
  activeRenders.add(videoId);

  try {
    const result = await renderVideo(videoId);
    return NextResponse.json({ success: true, data: { videoId, videoPath: result.videoPath, duration: result.duration } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown render error.";
    console.error("Video render failed:", { videoId, message });
    if (message === "Video not found.") return errorResponse(message, 404);
    if (message.startsWith("Unknown template:")) return errorResponse(message, 400);
    if (message.includes("TOP_5 requires exactly 5 scenes") || message.includes("TOP_5 scenes must be ordered")) return errorResponse(message, 422);
    if (message.includes("already been rendered") || message.includes("already rendering")) return errorResponse("This video has already been rendered.", 409);
    if (error instanceof TtsError && error.status === 429) return errorResponse("Voice generation is rate-limited. Please try again shortly.", 429);
    if (message.includes("not configured") || message.includes("Unsupported TTS")) return errorResponse("Voice generation is currently unavailable.", 503);
    if (message.includes("outside generated storage") || message.includes("image asset") || message.includes("Media path")) return errorResponse("This video has invalid scene assets.", 422);
    return errorResponse("Video rendering failed. Please try again.", 422);
  } finally {
    activeRenders.delete(videoId);
  }
}
