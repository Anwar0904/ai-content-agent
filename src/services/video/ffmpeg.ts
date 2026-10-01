import { spawn } from "node:child_process";

const MAX_CAPTURE_BYTES = 2 * 1024 * 1024;

export class FfmpegNotFoundError extends Error {
  constructor(command: string) {
    super(
      `${command} is not installed or is not available on PATH.`,
    );

    this.name = "FfmpegNotFoundError";
  }
}

export class FfmpegProcessError extends Error {
  readonly stderr: string;
  readonly stdout: string;
  readonly exitCode: number | null;

  constructor(
    message: string,
    stderr: string,
    exitCode: number | null,
    stdout = "",
  ) {
    super(message);

    this.name = "FfmpegProcessError";
    this.stderr = stderr;
    this.stdout = stdout;
    this.exitCode = exitCode;
  }
}

export interface ProcessResult {
  stdout: string;
  stderr: string;
}

function appendLimited(
  current: string,
  chunk: Buffer,
): string {
  const next =
    current + chunk.toString();

  if (
    Buffer.byteLength(next) <=
    MAX_CAPTURE_BYTES
  ) {
    return next;
  }

  return next.slice(
    next.length -
      MAX_CAPTURE_BYTES,
  );
}

function runProcess(
  command: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<ProcessResult> {
  return new Promise(
    (resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let settled = false;

      const child = spawn(
        command,
        args,
        {
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        },
      );

      const finishResolve = (
        result: ProcessResult,
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        clearTimeout(timer);

        resolve(result);
      };

      const finishReject = (
        error: Error,
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        clearTimeout(timer);

        reject(error);
      };

      const timer =
        setTimeout(() => {
          child.kill("SIGKILL");

          finishReject(
            new FfmpegProcessError(
              `${command} timed out after ${timeoutMs}ms.`,
              stderr,
              null,
              stdout,
            ),
          );
        }, timeoutMs);

      child.stdout.on(
        "data",
        (chunk: Buffer) => {
          stdout =
            appendLimited(
              stdout,
              chunk,
            );
        },
      );

      child.stderr.on(
        "data",
        (chunk: Buffer) => {
          stderr =
            appendLimited(
              stderr,
              chunk,
            );
        },
      );

      child.on(
        "error",
        (
          error: NodeJS.ErrnoException,
        ) => {
          if (
            error.code === "ENOENT"
          ) {
            finishReject(
              new FfmpegNotFoundError(
                command,
              ),
            );

            return;
          }

          finishReject(error);
        },
      );

      child.on(
        "close",
        (code) => {
          if (settled) {
            return;
          }

          if (code === 0) {
            finishResolve({
              stdout,
              stderr,
            });

            return;
          }

          finishReject(
            new FfmpegProcessError(
              `${command} exited with code ${code}.`,
              stderr,
              code,
              stdout,
            ),
          );
        },
      );
    },
  );
}

export function runFfmpeg(
  args: string[],
  timeoutMs = 240_000,
): Promise<ProcessResult> {
  return runProcess(
    "ffmpeg",
    args,
    timeoutMs,
  );
}

export function runFfprobe(
  args: string[],
  timeoutMs = 30_000,
): Promise<ProcessResult> {
  return runProcess(
    "ffprobe",
    args,
    timeoutMs,
  );
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

export async function probeMedia(
  filePath: string,
): Promise<MediaProbe> {
  const result =
    await runFfprobe([
      "-v",
      "error",

      "-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height",

      "-of",
      "json",

      filePath,
    ]);

  let payload: {
    format?: {
      duration?: string;
    };

    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
    }>;
  };

  try {
    payload =
      JSON.parse(
        result.stdout,
      );
  } catch {
    throw new FfmpegProcessError(
      "FFprobe returned invalid JSON.",
      result.stderr,
      0,
      result.stdout,
    );
  }

  const duration = Number(
    payload.format?.duration ??
      0,
  );

  if (
    !Number.isFinite(
      duration,
    ) ||
    duration <= 0
  ) {
    throw new FfmpegProcessError(
      "Media has no positive duration.",
      result.stderr,
      0,
      result.stdout,
    );
  }

  return {
    duration,

    streams: (
      payload.streams ?? []
    ).map((stream) => ({
      codecType:
        stream.codec_type,

      codecName:
        stream.codec_name,

      width:
        stream.width,

      height:
        stream.height,
    })),
  };
}