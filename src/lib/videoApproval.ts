import type { VideoStatus } from "@/constants/statuses";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { getVideoDetail } from "@/services/video/videoDetails";

export class VideoReviewTransitionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 409) {
    super(message);
    this.name = "VideoReviewTransitionError";
    this.statusCode = statusCode;
  }
}

export async function updateVideoApprovalState(videoId: string, action: "approve" | "reject") {
  await connectDB();

  const video = await Video.findById(videoId).lean();
  if (!video) {
    throw new VideoReviewTransitionError("Video not found.", 404);
  }

  const currentStatus = typeof video.status === "string" ? video.status.toLowerCase() : "draft";
  const nextStatus: VideoStatus = action === "approve" ? "approved" : "rejected";

  if (currentStatus !== "review") {
    const actionLabel = action === "approve" ? "approved" : "rejected";
    throw new VideoReviewTransitionError(`Video must be in REVIEW state before it can be ${actionLabel}.`);
  }

  const updated = await Video.findByIdAndUpdate(
    videoId,
    { $set: { status: nextStatus, reviewedAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new VideoReviewTransitionError("Video not found.", 404);
  }

  const publicVideo = await getVideoDetail(videoId);
  if (!publicVideo) {
    throw new VideoReviewTransitionError("Video not found.", 404);
  }

  return publicVideo;
}
