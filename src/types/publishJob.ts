import type { Types } from "mongoose";
import type { PublishJobStatus, SocialPlatform } from "../constants/statuses";

export interface PublishJob {
  videoId: Types.ObjectId;
  socialAccountId: Types.ObjectId;
  platform: SocialPlatform;
  status: PublishJobStatus;
  scheduledAt?: Date;
  externalPostId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}