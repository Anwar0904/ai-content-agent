import { z } from "zod";
import {
  AGENT_RUN_STATUSES,
  AGENT_RUN_TYPES,
} from "../constants/statuses";

export const agentRunSchema = z.object({
  type: z.enum(AGENT_RUN_TYPES),
  status: z.enum(AGENT_RUN_STATUSES).default("queued"),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().trim().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export type AgentRunInput = z.input<typeof agentRunSchema>;
export type ValidatedAgentRunInput = z.output<typeof agentRunSchema>;