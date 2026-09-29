import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { updateVideoApprovalState, VideoReviewTransitionError } from "@/lib/videoApproval";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;

  if (!videoId || !isValidObjectId(videoId)) {
    return errorResponse("Invalid video ID.", 400);
  }

  try {
    const video = await updateVideoApprovalState(videoId, "approve");
    return NextResponse.json({ success: true, data: { video } });
  } catch (error) {
    if (error instanceof VideoReviewTransitionError) {
      return errorResponse(error.message, error.statusCode);
    }

    console.error("Video approval failed:", { videoId, error });
    return errorResponse("This video couldn't be approved.", 500);
  }
}
