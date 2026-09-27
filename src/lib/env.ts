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
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    AI_API_KEY: process.env.AI_API_KEY ?? undefined,
    AI_MODEL: process.env.AI_MODEL ?? undefined,
    AI_PROVIDER: process.env.AI_PROVIDER ?? undefined,
    AI_BASE_URL: process.env.AI_BASE_URL ?? undefined,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}