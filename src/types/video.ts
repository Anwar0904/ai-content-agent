import type { Types } from "mongoose";
import type { VideoStatus, VideoTemplateId } from "../constants/statuses";

export interface VideoScene {
  order: number;
  narration: string;
  visualPrompt: string;
  duration: number;
  assetPath?: string;
  assetType?: "ai" | "stock" | "local";
  assetProvider?: "pollinations" | "pexels" | "local";
  sourceUrl?: string;
  credit?: string;
}

export interface Video {
  campaignId: Types.ObjectId;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  scenes: VideoScene[];
  videoPath?: string;
  templateId?: VideoTemplateId;
  reviewedAt?: Date | null;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}