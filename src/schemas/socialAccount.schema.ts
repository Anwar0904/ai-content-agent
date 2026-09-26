import { z } from "zod";
import {
  SOCIAL_ACCOUNT_STATUSES,
  SOCIAL_PLATFORMS,
} from "../constants/statuses";

export const socialAccountSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  accountName: z.string().trim().min(1).max(200),
  accountId: z.string().trim().min(1).max(300),
  status: z.enum(SOCIAL_ACCOUNT_STATUSES).default("connected"),
  username: z.string().trim().optional(),
  profileUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type SocialAccountInput = z.input<typeof socialAccountSchema>;
export type ValidatedSocialAccountInput = z.output<typeof socialAccountSchema>;