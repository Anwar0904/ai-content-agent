import { FfmpegNotFoundError, FfmpegProcessError } from "./ffmpeg";

export class RenderError extends Error {
  constructor(stage: string, error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
    let reason = "The operation failed. Check the worker environment and inputs.";
    if (error instanceof FfmpegNotFoundError) reason = "FFmpeg or FFprobe is missing from the worker PATH.";
    else if (error instanceof FfmpegProcessError) {
      reason = error.exitCode === null ? "FFmpeg processing timed out." : "FFmpeg could not process the media.";
      if (/No such filter/i.test(error.stderr)) reason = "The installed FFmpeg is missing a required video filter.";
      if (/Unknown encoder/i.test(error.stderr)) reason = "The installed FFmpeg is missing a required encoder.";
      if (/No space left on device/i.test(error.stderr)) reason = "There is not enough disk space.";
    } else if (code === "ENOENT") reason = "A required media file or directory is missing.";
    else if (code === "EACCES" || code === "EPERM") reason = "The worker does not have permission to access a required file or resource.";
    else if (code === "ENOSPC") reason = "There is not enough disk space.";
    else if (status === 429) reason = "The voice provider rate limit was reached. Wait before submitting another render.";
    else if (status === 401 || status === 403) reason = "The voice provider rejected the server credentials or permissions.";
    else if (status === 400 || status === 404) reason = "The voice provider rejected the model or request configuration.";
    else if (error instanceof Error && [
      "Video not found.", "Video has no scenes to render.",
      "Every scene needs narration and an image asset.",
      "TTS is not configured on this server.", "Gemini TTS returned no audio.",
      "Scene image format is unsupported.", "Media path is outside generated storage.",
      "Template TOP_5 requires exactly 5 scenes.", "Template TOP_5 scenes must be ordered 01 through 05.",
      "Scene orders must be unique non-negative integers.",
      "Rendered video has invalid video properties.", "Rendered video has invalid audio properties.",
    ].includes(error.message)) reason = error.message;
    super(`Video rendering failed at ${stage}: ${reason}`);
    this.name = "RenderError";
  }
}
