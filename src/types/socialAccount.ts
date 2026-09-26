import type {
  SocialAccountStatus,
  SocialPlatform,
} from "../constants/statuses";

export interface SocialAccount {
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  status: SocialAccountStatus;
  accessTokenEncrypted?: string;
  username?: string;
  profileUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}