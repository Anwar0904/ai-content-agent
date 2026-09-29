import { renderVideo } from "@/services/video/videoRenderer";

export async function renderVideoJob(videoId: string) {
  const result = await renderVideo(videoId);
  return { videoPath: result.videoPath, duration: result.duration };
}