import type { Types } from "mongoose";
import type { JobStatus, JobType } from "../constants/jobs";

export interface Job {
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: Record<string, unknown>;
  dedupeKey?: string;
  availableAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  _id: Types.ObjectId;
}