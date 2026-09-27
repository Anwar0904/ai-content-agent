import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import Campaign from "@/models/Campaign";
import { connectDB } from "@/lib/db/mongoose";
import { generateContent, saveGeneratedVideosForCampaign } from "@/services/ai/contentGenerator";

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

  const previousStatus = typeof campaign.status === "string" ? campaign.status : "draft";

  if (campaign.status === "generating") {
    return jsonError("This campaign is already generating content.", 409);
  }

  try {
    await Campaign.findByIdAndUpdate(campaignId, { status: "generating" }, { new: true });

    const generatedVideos = await generateContent({
      topic: campaign.topic,
      audience: campaign.audience,
      videoCount: Number(campaign.videoCount ?? 1),
      style: campaign.style ?? "Educational",
      durationMin: Number(campaign.durationMin ?? 30),
      durationMax: Number(campaign.durationMax ?? 45),
    });

    const savedVideos = await saveGeneratedVideosForCampaign(campaignId, generatedVideos);

    await Campaign.findByIdAndUpdate(campaignId, { status: "ready" });

    return NextResponse.json(
      {
        success: true,
        data: {
          campaignId,
          videos: savedVideos,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong while generating content.";
    await Campaign.findByIdAndUpdate(campaignId, { status: previousStatus });
    console.error("Campaign generation failed:", { campaignId, message });

    if (message === "AI generation is not configured on this server.") {
      return jsonError("AI generation is currently unavailable on this server.", 503);
    }

    if (message === "The AI returned invalid structured video content." || message.includes("Generated video count") || message.includes("duration") || message.includes("Duplicate") || message.includes("meaningful title") || message.includes("hashtags")) {
      return jsonError("The AI service returned invalid content for this campaign.", 422);
    }

    return jsonError("Something went wrong while generating content. Please try again.", 500);
  }
}
