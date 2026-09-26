import { model, models, Schema, type Model } from "mongoose";
import {
  AGENT_RUN_STATUSES,
  AGENT_RUN_TYPES,
} from "../constants/statuses";
import type { AgentRun as AgentRunRecord } from "../types/agentRun";

const AgentRunSchema = new Schema<AgentRunRecord>(
  {
    type: { type: String, enum: [...AGENT_RUN_TYPES], required: true },
    status: {
      type: String,
      enum: [...AGENT_RUN_STATUSES],
      default: "queued",
      required: true,
    },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    error: { type: String, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

AgentRunSchema.index({ type: 1, createdAt: -1 });
AgentRunSchema.index({ status: 1 });

const AgentRunModel: Model<AgentRunRecord> =
  (models.AgentRun as Model<AgentRunRecord> | undefined) ??
  model<AgentRunRecord>("AgentRun", AgentRunSchema);

export default AgentRunModel;