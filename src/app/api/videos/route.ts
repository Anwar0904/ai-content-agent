import { NextResponse } from "next/server";
import Video from "@/models/Video";
import { connectDB } from "@/lib/db/mongoose";
import { toPublicMediaUrl } from "@/services/video/videoDetails";

export async function GET() {
  try {
    await connectDB();
    const videos = await Video.find().sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({
      success: true,
      data: {
        videos: videos.map((video) => ({
          id: video._id.toString(),
          campaignId: video.campaignId.toString(),
          generationIndex: video.generationIndex,
          title: video.title,
          hook: video.hook,
          script: video.script,
          caption: video.caption,
          hashtags: video.hashtags,
          scenes: video.scenes.map((scene) => ({
            order: scene.order,
            narration: scene.narration,
            visualPrompt: scene.visualPrompt,
            duration: scene.duration,
            assetType: scene.assetType,
            assetProvider: scene.assetProvider,
            assetPath: toPublicMediaUrl(scene.assetPath),
            sourceUrl: scene.sourceUrl,
            credit: scene.credit,
          })),
          videoPath: toPublicMediaUrl(video.videoPath),
          templateId: video.templateId,
          status: video.status,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to load videos:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Videos couldn't be loaded." },
      },
      { status: 500 },
    );
  }
}
