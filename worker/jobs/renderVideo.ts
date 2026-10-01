import { renderVideo } from "@/services/video/videoRenderer";

export async function renderVideoJob(
  videoId: string,
): Promise<{
  videoPath: string;
  duration: number;
}> {
  if (!videoId) {
    throw new Error(
      "Invalid render payload.",
    );
  }

  const result =
    await renderVideo(
      videoId,
    );

  return {
    videoPath:
      result.videoPath,

    duration:
      result.duration,
  };
}