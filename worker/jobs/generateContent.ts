import Campaign from "@/models/Campaign";
import Video from "@/models/Video";
import { generateContent, saveGeneratedVideosForCampaign } from "@/services/ai/contentGenerator";
import { generateVideoScenes } from "@/services/assets/assetGenerator";
import { enqueueRenderJob } from "@/services/jobs/jobService";

export async function generateContentJob(campaignId: string, videoIndex: number) {
  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) throw new Error("Campaign not found.");

  const [generatedVideo] = await generateContent({
    topic: campaign.topic,
    audience: campaign.audience,
    videoCount: 1,
    videoIndex,
    style: campaign.style ?? "Educational",
    durationMin: Number(campaign.durationMin ?? 30),
    durationMax: Number(campaign.durationMax ?? 45),
  });

  let videoId: string | undefined;
  try {
    const [video] = await saveGeneratedVideosForCampaign(
      campaignId,
      [generatedVideo],
      campaign.templateId,
      videoIndex,
    );
    videoId = video.id;
    await generateVideoScenes(videoId);
    const { job } = await enqueueRenderJob(videoId);
    return { videoId, renderJobId: job?.id };
  } catch (error) {
    if (videoId) await Video.findByIdAndDelete(videoId);
    throw error;
  }
}