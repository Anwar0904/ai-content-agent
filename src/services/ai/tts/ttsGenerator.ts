import { GoogleGenAI } from "@google/genai";

export interface SpeechGenerationInput {
  text: string;
  voice?: string;
  style?: string;
}

export interface SpeechResult {
  buffer: Buffer;
  mimeType: string;
  duration: number;
  format: "wav";
}

export class TtsError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TtsError";
    this.status = status;
  }
}

let lastRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

function configuredNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function requestIntervalMs(): number {
  return configuredNumber("TTS_MIN_REQUEST_INTERVAL_MS", 22_000);
}

function maxRetries(): number {
  return Math.min(1, Math.floor(configuredNumber("TTS_MAX_RETRIES", 1)));
}

async function waitForTtsRateLimit() {
  const waitMs = Math.max(0, requestIntervalMs() - (Date.now() - lastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
}

function retryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { retryAfter?: unknown; headers?: { get?: (name: string) => string | null }; response?: { headers?: { get?: (name: string) => string | null } } };
  const retryAfter = candidate.retryAfter;
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) return Math.min(60_000, Math.max(0, retryAfter * 1000));
  if (typeof retryAfter === "string" && Number.isFinite(Number(retryAfter))) return Math.min(60_000, Math.max(0, Number(retryAfter) * 1000));
  const headers = candidate.headers || candidate.response?.headers;
  const retryAfterMs = headers?.get?.("retry-after-ms");
  if (retryAfterMs && Number.isFinite(Number(retryAfterMs))) {
    return Math.min(60_000, Math.max(0, Number(retryAfterMs)));
  }
  const header = headers?.get?.("retry-after");
  if (header) {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
    if (Number.isFinite(delay)) return Math.min(60_000, Math.max(0, delay));
  }
  return undefined;
}

function enqueueTtsRequest<T>(request: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(request, request);
  requestQueue = run.then(() => undefined, () => undefined);
  return run;
}

function readWavDuration(buffer: Buffer): number {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Gemini TTS returned unsupported audio data.");
  }

  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt " && chunkStart + 16 <= buffer.length) byteRate = buffer.readUInt32LE(chunkStart + 8);
    if (chunkId === "data") {
      dataSize = Math.min(chunkSize, buffer.length - chunkStart);
      break;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!byteRate || !dataSize) throw new Error("Gemini TTS returned an empty WAV.");
  const duration = dataSize / byteRate;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Gemini TTS returned invalid audio duration.");
  return duration;
}

export async function generateSpeech(input: SpeechGenerationInput): Promise<SpeechResult> {
  const text = input.text.trim();
  const apiKey = process.env.AI_API_KEY;
  const provider = (process.env.TTS_PROVIDER || "gemini").toLowerCase();
  const model = process.env.TTS_MODEL || "gemini-3.8-flash-lite-tts";
  const voice = input.voice || process.env.TTS_VOICE || "Kore";

  if (!text) throw new Error("Speech text cannot be empty.");
  if (!apiKey) throw new Error("TTS is not configured on this server.");
  if (provider !== "gemini") throw new Error(`Unsupported TTS provider: ${provider}.`);

  const response = await enqueueTtsRequest(async () => {
    const ai = new GoogleGenAI({ apiKey });
    for (let attempt = 0; attempt <= maxRetries(); attempt += 1) {
      await waitForTtsRateLimit();
      console.info("TTS request started", { attempt: attempt + 1 });
      try {
        const result = await ai.models.generateContent({
          model,
          contents: input.style ? `${input.style}\n\n${text}` : text,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { voice } },
          },
        });
        console.info("TTS request succeeded", { attempt: attempt + 1 });
        return result;
      } catch (error) {
        const status = error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : error && typeof error === "object" && "error" in error && error.error && typeof error.error === "object" && "code" in error.error && typeof error.error.code === "number"
            ? error.error.code
            : undefined;
        if (status !== 429 || attempt >= maxRetries()) {
          throw new TtsError(status === 429 ? "Gemini TTS rate limit reached." : "Gemini TTS request failed.", status);
        }
        const delay = retryAfterMs(error) ?? Math.min(60_000, requestIntervalMs() * 2 ** attempt);
        console.warn("TTS rate-limit retry", { attempt: attempt + 1, delayMs: delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new TtsError("Gemini TTS request failed.");
  });
  const part = response.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData?.data);
  const encoded = part?.inlineData?.data;
  if (!encoded) throw new Error("Gemini TTS returned no audio.");
  const buffer = Buffer.from(encoded, "base64");
  const mimeType = part?.inlineData?.mimeType?.split(";")[0] || "audio/wav";
  if (mimeType !== "audio/wav") throw new Error(`Gemini TTS returned unsupported format: ${mimeType}.`);
  return { buffer, mimeType, duration: readWavDuration(buffer), format: "wav" };
}
