import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { generateVideoScenes } from "@/services/assets/assetGenerator";

const activeGenerations = new Set<string>();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoId || !isValidObjectId(videoId)) return errorResponse("Invalid video ID.", 400);
  if (activeGenerations.has(videoId)) return errorResponse("This video is already preparing scenes.", 409);
  activeGenerations.add(videoId);

  try {
    const result = await generateVideoScenes(videoId);
    return NextResponse.json({ success: true, data: { videoId, sceneCount: result.scenes.length, assetCount: result.assetCount, scenes: result.scenes } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scene generation error.";
    console.error("Video scene generation failed:", { videoId, message });
    if (message === "Video not found.") return errorResponse(message, 404);
    if (message.includes("already exist") || message.includes("already preparing")) return errorResponse("This video already has prepared scenes.", 409);
    if (message.includes("not configured") || message.includes("Unsupported AI provider")) return errorResponse("Scene generation is currently unavailable.", 503);
    if (message.includes("buffering timed out") || message.includes("MongoDB")) return errorResponse("Database connection failed.", 500);
    return errorResponse("Unable to prepare visual assets.", 422);
  } finally {
    activeGenerations.delete(videoId);
  }
}
