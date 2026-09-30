import { z } from "zod";
import { PUBLISH_JOB_STATUSES, SOCIAL_PLATFORMS } from "../constants/statuses";

const objectIdSchema = z
  .string()
  .refine((value) => /^[a-f\d]{24}$/i.test(value), {
    message: "Must be a valid MongoDB ObjectId.",
  });

export const publishJobSchema = z.object({
  videoId: objectIdSchema,
  socialAccountId: objectIdSchema,
  platform: z.enum(SOCIAL_PLATFORMS),
  status: z.enum(PUBLISH_JOB_STATUSES).default("queued"),
  scheduledAt: z.coerce.date().optional(),
  externalPostId: z.string().trim().optional(),
  error: z.string().trim().optional(),
});

export type PublishJobInput = z.input<typeof publishJobSchema>;
export type ValidatedPublishJobInput = z.output<typeof publishJobSchema>;