import Campaign from "@/models/Campaign";
import {
  createCampaignSchema,
  type CreateCampaignInput,
} from "@/schemas/campaign.schema";
import { connectDB } from "@/lib/db/mongoose";
import type { VideoTemplateId } from "@/constants/statuses";

export interface CreatedCampaign {
  _id: string;
  title: string;
  topic: string;
  audience: string;
  videoCount: number;
  status: "draft";
  style?: string;
  templateId?: VideoTemplateId;
  durationMin?: number;
  durationMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createCampaign(input: CreateCampaignInput): Promise<CreatedCampaign> {
  await connectDB();
  const campaign = await Campaign.create({
    title: input.title,
    topic: input.topic,
    audience: input.audience,
    videoCount: input.videoCount,
    style: input.style,
    templateId: input.templateId,
    durationMin: input.durationMin,
    durationMax: input.durationMax,
    status: "draft",
  });

  return {
    _id: campaign._id.toString(),
    title: campaign.title,
    topic: campaign.topic,
    audience: campaign.audience,
    videoCount: campaign.videoCount,
    status: "draft",
    style: campaign.style,
    templateId: campaign.templateId,
    durationMin: campaign.durationMin,
    durationMax: campaign.durationMax,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export function parseCreateCampaignInput(value: unknown) {
  return createCampaignSchema.safeParse(value);
}