import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { enqueuePublishJob } from "@/services/jobs/jobService";
import { connectDB } from "@/lib/db/mongoose";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  if (!videoId || !isValidObjectId(videoId)) return errorResponse("Invalid video ID.", 400);

  const payload = await _request.json().catch(() => null);
  const socialAccountId = typeof payload?.socialAccountId === "string" ? payload.socialAccountId : "";
  if (!socialAccountId || !isValidObjectId(socialAccountId)) {
    return errorResponse("A valid socialAccountId is required.", 400);
  }

  try {
    await connectDB();
    const [video, account] = await Promise.all([
      Video.findById(videoId).lean(),
      SocialAccount.findById(socialAccountId).lean(),
    ]);

    if (!video) return errorResponse("Video not found.", 404);
    if (!account) return errorResponse("Social account not found.", 404);
    if (video.status !== "approved") return errorResponse("Only approved videos can be published.", 409);
    if (account.status !== "connected") return errorResponse("This social account is not connected.", 409);
    if (process.env.NODE_ENV === "production" && (account.platform === "instagram" || account.accountId.startsWith("mock"))) {
      return errorResponse("Test destinations are not available in production.", 409);
    }

    const { job, created } = await enqueuePublishJob(videoId, socialAccountId);
    return NextResponse.json({ success: true, data: { job }, ...(created ? {} : { message: "This publishing job is already active." }) }, { status: created ? 202 : 200 });
  } catch (error) {
    console.error("Video publishing could not be queued:", { videoId, socialAccountId, error });
    return errorResponse("Video publishing could not be queued.", 500);
  }
}
