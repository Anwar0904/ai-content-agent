import { spawn } from "node:child_process";

export class FfmpegNotFoundError extends Error {
  constructor(command: string) {
    super(`${command} is not installed or not available on PATH.`);
    this.name = "FfmpegNotFoundError";
  }
}

export class FfmpegProcessError extends Error {
  readonly stderr: string;
  readonly exitCode: number | null;

  constructor(message: string, stderr: string, exitCode: number | null) {
    super(message);
    this.name = "FfmpegProcessError";
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

interface ProcessResult {
  stdout: string;
  stderr: string;
}

function runProcess(command: string, args: string[], timeoutMs = 120000): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finishReject(new FfmpegProcessError(`${command} timed out.`, stderr, null));
    }, timeoutMs);

    const finishResolve = (result: ProcessResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") finishReject(new FfmpegNotFoundError(command));
      else finishReject(error);
    });
    child.on("close", (code) => {
      if (code === 0) finishResolve({ stdout, stderr });
      else finishReject(new FfmpegProcessError(`${command} exited with code ${code}.`, stderr, code));
    });
  });
}

export function runFfmpeg(args: string[], timeoutMs = 180000): Promise<ProcessResult> {
  return runProcess("ffmpeg", args, timeoutMs);
}

export async function runFfprobe(args: string[], timeoutMs = 30000): Promise<ProcessResult> {
  return runProcess("ffprobe", args, timeoutMs);
}

export interface MediaProbe {
  duration: number;
  streams: Array<{
    codecType?: string;
    codecName?: string;
    width?: number;
    height?: number;
  }>;
}

export async function probeMedia(filePath: string): Promise<MediaProbe> {
  const result = await runFfprobe([
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
    "-of", "json",
    filePath,
  ]);
  const payload = JSON.parse(result.stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
  };
  const duration = Number(payload.format?.duration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new FfmpegProcessError("Media has no positive duration.", result.stderr, 0);
  }
  return {
    duration,
    streams: (payload.streams ?? []).map((stream) => ({
      codecType: stream.codec_type,
      codecName: stream.codec_name,
      width: stream.width,
      height: stream.height,
    })),
  };
}
