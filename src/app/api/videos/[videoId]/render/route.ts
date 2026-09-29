import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { enqueueRenderJob } from "@/services/jobs/jobService";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoId || !isValidObjectId(videoId)) return errorResponse("Invalid video ID.", 400);

  try {
    await connectDB();
    const video = await Video.findById(videoId).lean();
    if (!video) return errorResponse("Video not found.", 404);
    if (video.videoPath) return errorResponse("This video has already been rendered.", 409);

    const { job, created } = await enqueueRenderJob(videoId);
    return NextResponse.json({ success: true, data: { job }, ...(created ? {} : { message: "This video is already rendering." }) }, { status: created ? 202 : 200 });
  } catch (error) {
    console.error("Video render job creation failed:", { videoId, error });
    return errorResponse("Video rendering could not be queued.", 500);
  }
}
