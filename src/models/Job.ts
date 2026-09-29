import { model, models, Schema, type Model } from "mongoose";
import { JOB_STATUSES, JOB_TYPES } from "../constants/jobs";
import type { Job as JobRecord } from "../types/job";

const JobSchema = new Schema<JobRecord>(
  {
    type: { type: String, enum: [...JOB_TYPES], required: true },
    status: { type: String, enum: [...JOB_STATUSES], default: "queued", required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0, min: 0, required: true },
    maxAttempts: { type: Number, default: 1, min: 1, required: true },
    error: { type: String, trim: true },
    result: { type: Schema.Types.Mixed },
    dedupeKey: { type: String, trim: true },
    availableAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    lockedAt: { type: Date },
  },
  { timestamps: true },
);

JobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
JobSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["queued", "processing"] } },
  },
);

const JobModel: Model<JobRecord> =
  (models.Job as Model<JobRecord> | undefined) ?? model<JobRecord>("Job", JobSchema);

export default JobModel;