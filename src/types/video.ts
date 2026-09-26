import type { Types } from "mongoose";
import type { VideoStatus } from "../constants/statuses";

export interface VideoScene {
  order: number;
  narration: string;
  visualPrompt: string;
  duration: number;
  assetPath?: string;
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
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}