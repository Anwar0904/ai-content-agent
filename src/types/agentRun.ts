import type {
  AgentRunStatus,
  AgentRunType,
} from "../constants/statuses";

export interface AgentRun {
  type: AgentRunType;
  status: AgentRunStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}