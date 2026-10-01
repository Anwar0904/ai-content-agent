import Campaign from "@/models/Campaign";
import Video from "@/models/Video";

import {
  generateContent,
  saveGeneratedVideosForCampaign,
} from "@/services/ai/contentGenerator";

import { generateVideoScenes } from "@/services/assets/assetGenerator";

export async function generateContentJob(
  campaignId: string,
  videoIndex: number,
) {
  if (!campaignId) {
    throw new Error(
      "Invalid campaign ID.",
    );
  }

  if (
    !Number.isInteger(
      videoIndex,
    )
  ) {
    throw new Error(
      "Invalid video index.",
    );
  }

  const campaign =
    await Campaign.findById(
      campaignId,
    ).lean();

  if (!campaign) {
    throw new Error(
      "Campaign not found.",
    );
  }

  const [
    generatedVideo,
  ] =
    await generateContent({
      topic:
        campaign.topic,

      audience:
        campaign.audience,

      videoCount: 1,

      videoIndex,

      style:
        campaign.style ??
        "Educational",

      durationMin:
        Number(
          campaign.durationMin ??
            30,
        ),

      durationMax:
        Number(
          campaign.durationMax ??
            45,
        ),
    });

  if (!generatedVideo) {
    throw new Error(
      "Content generation returned no video.",
    );
  }

  let videoId:
    | string
    | undefined;

  try {
    const [video] =
      await saveGeneratedVideosForCampaign(
        campaignId,
        [generatedVideo],
        campaign.templateId,
        videoIndex,
      );

    if (!video) {
      throw new Error(
        "Generated video could not be saved.",
      );
    }

    videoId =
      video.id;

    await generateVideoScenes(
      videoId,
    );

    /*
     * IMPORTANT:
     *
     * Do NOT automatically enqueue rendering here.
     *
     * Rendering consumes the limited TTS quota.
     * The user explicitly starts rendering from the UI.
     */

    return {
      videoId,
      scenesGenerated: true,
      readyToRender: true,
    };
  } catch (error) {
    if (videoId) {
      await Video.findByIdAndDelete(
        videoId,
      ).catch(
        () => undefined,
      );
    }

    throw error;
  }
}