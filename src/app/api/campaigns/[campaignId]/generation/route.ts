import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { getCampaignGenerationSummary } from "@/services/jobs/jobService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  if (!campaignId || !isValidObjectId(campaignId)) {
    return NextResponse.json({ success: false, error: { message: "Invalid campaign ID." } }, { status: 400 });
  }
  try {
    const summary = await getCampaignGenerationSummary(campaignId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("Failed to load campaign generation status:", { campaignId, error });
    return NextResponse.json({ success: false, error: { message: "Generation status could not be loaded." } }, { status: 500 });
  }
}