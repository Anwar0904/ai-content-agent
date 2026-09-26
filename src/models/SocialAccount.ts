import { model, models, Schema, type Model } from "mongoose";
import {
  SOCIAL_ACCOUNT_STATUSES,
  SOCIAL_PLATFORMS,
} from "../constants/statuses";
import type { SocialAccount as SocialAccountRecord } from "../types/socialAccount";

const SocialAccountSchema = new Schema<SocialAccountRecord>(
  {
    platform: {
      type: String,
      enum: [...SOCIAL_PLATFORMS],
      required: true,
    },
    accountName: { type: String, required: true, trim: true },
    accountId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [...SOCIAL_ACCOUNT_STATUSES],
      default: "connected",
      required: true,
    },
    accessTokenEncrypted: { type: String, select: false },
    username: { type: String, trim: true },
    profileUrl: { type: String, trim: true },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

SocialAccountSchema.index({ platform: 1, accountId: 1 }, { unique: true });
SocialAccountSchema.index({ status: 1 });

SocialAccountSchema.pre("validate", async function () {
  if (!this.platform || !this.accountId) return;

  const duplicate = await SocialAccountModel.exists({
    platform: this.platform,
    accountId: this.accountId,
    _id: { $ne: this._id },
  });

  if (duplicate) {
    this.invalidate(
      "accountId",
      "A social account with this platform and account ID already exists.",
    );
  }
});

const SocialAccountModel: Model<SocialAccountRecord> =
  (models.SocialAccount as Model<SocialAccountRecord> | undefined) ??
  model<SocialAccountRecord>("SocialAccount", SocialAccountSchema);

export default SocialAccountModel;