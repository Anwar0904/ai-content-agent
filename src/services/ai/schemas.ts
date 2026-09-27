import { z } from "zod";
import { videoSceneSchema } from "@/schemas/video.schema";

export const generatedVideoSchema = z.object({
  title: z.string().trim().min(1).max(120),
  hook: z.string().trim().min(1).max(220),
  script: z.string().trim().min(1).max(4000),
  duration: z.number().int().positive(),
  caption: z.string().trim().min(1).max(500),
  hashtags: z.array(z.string().trim().min(1).max(30)).min(3).max(8),
  scenes: z.array(videoSceneSchema).length(0),
});

export const contentGenerationResponseSchema = z.object({
  videos: z.array(generatedVideoSchema).min(1),
});

export type GeneratedVideo = z.infer<typeof generatedVideoSchema>;
export type ContentGenerationResponse = z.infer<typeof contentGenerationResponseSchema>;

export const generatedSceneSchema = z.object({
  order: z.number().int().positive(),
  narration: z.string().trim().min(1).max(2000),
  visualPrompt: z.string().trim().min(20).max(1000),
  duration: z.number().int().positive(),
});

export const sceneGenerationResponseSchema = z.object({
  scenes: z.array(generatedSceneSchema).min(1),
});

export type GeneratedScene = z.infer<typeof generatedSceneSchema>;
