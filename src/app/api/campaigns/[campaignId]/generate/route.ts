import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import Campaign from "@/models/Campaign";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { enqueueCampaignGenerationJobs } from "@/services/jobs/jobService";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;

  if (!campaignId || !isValidObjectId(campaignId)) {
    return jsonError("Invalid campaign ID.", 400);
  }

  try {
    await connectDB();
  } catch {
    return jsonError("Database connection failed.", 500);
  }

  let campaign;
  try {
    campaign = await Campaign.findById(campaignId).lean();
  } catch {
    return jsonError("Unable to load the campaign.", 500);
  }

  if (!campaign) {
    return jsonError("Campaign not found.", 404);
  }

  if (campaign.status === "generating") {
    return jsonError("This campaign is already generating content.", 409);
  }

  if (await Video.exists({ campaignId })) {
    return jsonError("This campaign already has generated videos.", 409);
  }

  try {
    const claimedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaignId, status: { $ne: "generating" } },
      { $set: { status: "generating" } },
      { returnDocument: "after" },
    ).lean();
    if (!claimedCampaign) return jsonError("This campaign is already generating content.", 409);

    const jobs = await enqueueCampaignGenerationJobs(campaignId, Number(campaign.videoCount ?? 1));
    return NextResponse.json({
      success: true,
      data: { campaignId, videoCount: campaign.videoCount, jobs },
    }, { status: 202 });
  } catch (error) {
    await Campaign.findByIdAndUpdate(campaignId, { $set: { status: "draft" } });
    console.error("Campaign generation job creation failed:", { campaignId, error });
    return jsonError("Campaign generation could not be queued.", 500);
  }
}
