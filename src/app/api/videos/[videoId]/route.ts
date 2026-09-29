import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { getVideoDetail } from "@/services/video/videoDetails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!/^[a-f\d]{24}$/i.test(videoId) || !isValidObjectId(videoId)) {
    return NextResponse.json({ success: false, error: { message: "Invalid video ID." } }, { status: 400 });
  }

  try {
    const video = await getVideoDetail(videoId);
    if (!video) {
      return NextResponse.json({ success: false, error: { message: "Video not found." } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { video } });
  } catch (error) {
    console.error("Failed to load video:", error);
    return NextResponse.json(
      { success: false, error: { message: "This video couldn't be loaded." } },
      { status: 500 },
    );
  }
}