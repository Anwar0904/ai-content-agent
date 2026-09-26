import type { Types } from "mongoose";
import type { PublishJobStatus } from "../constants/statuses";

export interface PublishJob {
  videoId: Types.ObjectId;
  socialAccountId: Types.ObjectId;
  status: PublishJobStatus;
  scheduledAt?: Date;
  externalPostId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}