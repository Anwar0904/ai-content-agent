import { z } from "zod";
import { VIDEO_STATUSES } from "../constants/statuses";

const objectIdSchema = z
  .string()
  .refine((value) => /^[a-f\d]{24}$/i.test(value), {
    message: "Must be a valid MongoDB ObjectId.",
  });

export const videoSceneSchema = z.object({
  order: z.number().int().positive(),
  narration: z.string().trim().min(1),
  visualPrompt: z.string().trim().min(1),
  duration: z.number().finite().positive(),
  assetPath: z.string().trim().optional(),
  assetType: z.enum(["ai", "stock", "local"]).optional(),
  assetProvider: z.enum(["pollinations", "pexels", "local"]).optional(),
  sourceUrl: z.string().url().optional(),
  credit: z.string().trim().optional(),
});

export const videoSchema = z.object({
  campaignId: objectIdSchema,
  title: z.string().trim().min(1).max(200),
  hook: z.string().trim().min(1),
  script: z.string().trim().min(1),
  caption: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).default([]),
  scenes: z.array(videoSceneSchema).default([]),
  videoPath: z.string().trim().optional(),
  status: z.enum(VIDEO_STATUSES).default("draft"),
});

export type VideoInput = z.input<typeof videoSchema>;
export type ValidatedVideoInput = z.output<typeof videoSchema>;