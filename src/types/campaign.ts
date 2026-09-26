import type { CampaignStatus } from "../constants/statuses";

export interface Campaign {
  title: string;
  topic: string;
  audience: string;
  videoCount: number;
  status: CampaignStatus;
  description?: string;
  style?: string;
  durationMin?: number;
  durationMax?: number;
  createdAt: Date;
  updatedAt: Date;
}