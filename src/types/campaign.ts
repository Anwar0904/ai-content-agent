import type { CampaignStatus, VideoTemplateId } from "../constants/statuses";

export interface Campaign {
  title: string;
  topic: string;
  audience: string;
  videoCount: number;
  status: CampaignStatus;
  description?: string;
  style?: string;
  templateId?: VideoTemplateId;
  durationMin?: number;
  durationMax?: number;
  createdAt: Date;
  updatedAt: Date;
}