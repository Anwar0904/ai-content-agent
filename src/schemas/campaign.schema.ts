import { z } from "zod";
import { CAMPAIGN_STATUSES } from "../constants/statuses";

export const campaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    topic: z.string().trim().min(1, "Topic is required."),
    audience: z.string().trim().min(1, "Audience is required."),
    videoCount: z.number().int().positive(),
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
    description: z.string().trim().max(2000).optional(),
    style: z.string().trim().max(200).optional(),
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