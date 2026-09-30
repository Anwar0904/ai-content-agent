import { z } from "zod";
import {
  CAMPAIGN_DURATIONS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STYLES,
  DEFAULT_VIDEO_TEMPLATE_ID,
  VIDEO_TEMPLATE_IDS,
} from "../constants/statuses";

export const campaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    topic: z.string().trim().min(1, "Topic is required."),
    audience: z.string().trim().min(1, "Audience is required."),
    videoCount: z.number().int().min(1).max(5),
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
    description: z.string().trim().max(2000).optional(),
    style: z.string().trim().max(200).optional(),
    templateId: z.enum(VIDEO_TEMPLATE_IDS).default(DEFAULT_VIDEO_TEMPLATE_ID).optional(),
    durationMin: z.number().finite().nonnegative().optional(),
    durationMax: z.number().finite().nonnegative().optional(),
  })
  .superRefine((campaign, context) => {
    if (
      campaign.durationMin !== undefined &&
      campaign.durationMax !== undefined &&
      campaign.durationMin > campaign.durationMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["durationMax"],
        message: "durationMax must be greater than or equal to durationMin.",
      });
    }
  });

export type CampaignInput = z.input<typeof campaignSchema>;
export type ValidatedCampaignInput = z.output<typeof campaignSchema>;

export const campaignFormSchema = z.object({
  title: z.string().trim().min(2, "Campaign name must be at least 2 characters.").max(100),
  topic: z.string().trim().min(1, "Topic is required.").max(200),
  audience: z.string().trim().min(1, "Audience is required.").max(100),
  videoCount: z.number().int().min(1).max(5),
  style: z.enum(CAMPAIGN_STYLES),
  templateId: z.enum(VIDEO_TEMPLATE_IDS).default(DEFAULT_VIDEO_TEMPLATE_ID),
  duration: z.enum(CAMPAIGN_DURATIONS),
});

export const createCampaignSchema = z
  .object({
    title: z.string().trim().min(2, "Campaign name must be at least 2 characters.").max(100),
    topic: z.string().trim().min(1, "Topic is required.").max(200),
    audience: z.string().trim().min(1, "Audience is required.").max(100),
    videoCount: z.number().int().min(1).max(5),
    style: z.enum(CAMPAIGN_STYLES),
    templateId: z.enum(VIDEO_TEMPLATE_IDS).default(DEFAULT_VIDEO_TEMPLATE_ID),
    durationMin: z.number().int().min(15).max(45),
    durationMax: z.number().int().min(30).max(60),
  })
  .superRefine((campaign, context) => {
    const validRange =
      (campaign.durationMin === 15 && campaign.durationMax === 30) ||
      (campaign.durationMin === 30 && campaign.durationMax === 45) ||
      (campaign.durationMin === 45 && campaign.durationMax === 60);

    if (!validRange) {
      context.addIssue({
        code: "custom",
        path: ["durationMin"],
        message: "Please select a valid duration.",
      });
    }
  });

export type CampaignFormInput = z.infer<typeof campaignFormSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export function durationToRange(duration: CampaignFormInput["duration"]): {
  durationMin: number;
  durationMax: number;
} {
  const ranges: Record<CampaignFormInput["duration"], [number, number]> = {
    "15-30": [15, 30],
    "30-45": [30, 45],
    "45-60": [45, 60],
  };
  const [durationMin, durationMax] = ranges[duration];
  return { durationMin, durationMax };
}