import { model, models, Schema, type Model } from "mongoose";
import {
  CAMPAIGN_STATUSES,
  DEFAULT_VIDEO_TEMPLATE_ID,
  VIDEO_TEMPLATE_IDS,
} from "../constants/statuses";
import type { Campaign as CampaignRecord } from "../types/campaign";

const CampaignSchema = new Schema<CampaignRecord>(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    videoCount: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    status: {
      type: String,
      enum: [...CAMPAIGN_STATUSES],
      default: "draft",
      required: true,
    },
    description: { type: String, trim: true },
    style: { type: String, trim: true },
    templateId: {
      type: String,
      enum: [...VIDEO_TEMPLATE_IDS],
      default: DEFAULT_VIDEO_TEMPLATE_ID,
    },
    durationMin: { type: Number, min: 0 },
    durationMax: { type: Number, min: 0 },
  },
  { timestamps: true },
);

CampaignSchema.index({ status: 1 });
CampaignSchema.index({ createdAt: -1 });

const CampaignModel: Model<CampaignRecord> =
  (models.Campaign as Model<CampaignRecord> | undefined) ??
  model<CampaignRecord>("Campaign", CampaignSchema);

export default CampaignModel;