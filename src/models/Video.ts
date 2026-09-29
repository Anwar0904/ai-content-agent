import { model, models, Schema, type Model } from "mongoose";
import {
  DEFAULT_VIDEO_TEMPLATE_ID,
  VIDEO_STATUSES,
  VIDEO_TEMPLATE_IDS,
} from "../constants/statuses";
import type { Video as VideoRecord, VideoScene } from "../types/video";
import Campaign from "./Campaign";

const VideoSceneSchema = new Schema<VideoScene>(
  {
    order: { type: Number, required: true, min: 0, validate: Number.isInteger },
    narration: { type: String, required: true, trim: true },
    visualPrompt: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 0.001 },
    assetPath: { type: String, trim: true },
    assetType: { type: String, enum: ["ai", "stock", "local"] },
    assetProvider: { type: String, enum: ["pollinations", "pexels", "local"] },
    sourceUrl: { type: String, trim: true },
    credit: { type: String, trim: true },
  },
  { _id: false },
);

const VideoSchema = new Schema<VideoRecord>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    generationIndex: { type: Number, min: 1, validate: Number.isInteger },
    title: { type: String, required: true, trim: true },
    hook: { type: String, required: true, trim: true },
    script: { type: String, required: true, trim: true },
    caption: { type: String, required: true, trim: true },
    hashtags: { type: [String], default: [] },
    scenes: { type: [VideoSceneSchema], default: [] },
    videoPath: { type: String, trim: true },
    templateId: {
      type: String,
      enum: [...VIDEO_TEMPLATE_IDS],
      default: DEFAULT_VIDEO_TEMPLATE_ID,
    },
    reviewedAt: { type: Date },
    status: {
      type: String,
      enum: [...VIDEO_STATUSES],
      default: "draft",
      required: true,
    },
  },
  { timestamps: true },
);

VideoSchema.index({ campaignId: 1 });
VideoSchema.index({ status: 1 });
VideoSchema.index({ createdAt: -1 });

VideoSchema.pre("validate", async function () {
  if (!this.campaignId) return;

  const campaignExists = await Campaign.exists({ _id: this.campaignId });
  if (!campaignExists) {
    this.invalidate("campaignId", "The referenced campaign does not exist.");
  }
});

const VideoModel: Model<VideoRecord> =
  (models.Video as Model<VideoRecord> | undefined) ??
  model<VideoRecord>("Video", VideoSchema);

export default VideoModel;