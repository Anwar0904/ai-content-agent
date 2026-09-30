import { z } from "zod";

const serverEnvSchema = z.object({
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "MONGODB_URI is required.")
    .refine(
      (value) => !value || /^mongodb(?:\+srv)?:\/\//.test(value),
      "MONGODB_URI must be a MongoDB connection URI.",
    ),
  AI_API_KEY: z.string().trim().optional(),
  AI_MODEL: z.string().trim().optional(),
  AI_PROVIDER: z.string().trim().optional(),
  AI_BASE_URL: z.string().trim().url().optional(),
  POLLINATIONS_API_KEY: z.string().trim().optional(),
  POLLINATIONS_IMAGE_MODEL: z.string().trim().optional(),
  PEXELS_API_KEY: z.string().trim().optional(),
  META_USER_ACCESS_TOKEN: z.string().trim().optional(),
  META_FACEBOOK_PAGE_ID: z.string().trim().optional(),
  META_GRAPH_API_VERSION: z.string().trim().optional(),
  MEDIA_STORAGE_PATH: z.string().trim().optional(),
  TTS_PROVIDER: z.string().trim().optional(),
  TTS_MODEL: z.string().trim().optional(),
  TTS_VOICE: z.string().trim().optional(),
  TTS_MIN_REQUEST_INTERVAL_MS: z.string().trim().optional(),
  TTS_MAX_RETRIES: z.string().trim().optional(),
  JOB_POLL_INTERVAL_MS: z.string().trim().optional(),
  JOB_LOCK_TIMEOUT_MS: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    AI_API_KEY: process.env.AI_API_KEY ?? undefined,
    AI_MODEL: process.env.AI_MODEL ?? undefined,
    AI_PROVIDER: process.env.AI_PROVIDER ?? undefined,
    AI_BASE_URL: process.env.AI_BASE_URL ?? undefined,
    POLLINATIONS_API_KEY: process.env.POLLINATIONS_API_KEY ?? undefined,
    POLLINATIONS_IMAGE_MODEL: process.env.POLLINATIONS_IMAGE_MODEL ?? undefined,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY ?? undefined,
    META_USER_ACCESS_TOKEN: process.env.META_USER_ACCESS_TOKEN ?? undefined,
    META_FACEBOOK_PAGE_ID: process.env.META_FACEBOOK_PAGE_ID ?? undefined,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION ?? undefined,
    MEDIA_STORAGE_PATH: process.env.MEDIA_STORAGE_PATH ?? undefined,
    TTS_PROVIDER: process.env.TTS_PROVIDER ?? undefined,
    TTS_MODEL: process.env.TTS_MODEL ?? undefined,
    TTS_VOICE: process.env.TTS_VOICE ?? undefined,
    TTS_MIN_REQUEST_INTERVAL_MS: process.env.TTS_MIN_REQUEST_INTERVAL_MS ?? undefined,
    TTS_MAX_RETRIES: process.env.TTS_MAX_RETRIES ?? undefined,
    JOB_POLL_INTERVAL_MS: process.env.JOB_POLL_INTERVAL_MS ?? undefined,
    JOB_LOCK_TIMEOUT_MS: process.env.JOB_LOCK_TIMEOUT_MS ?? undefined,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}