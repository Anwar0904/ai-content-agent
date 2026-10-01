import { model, models, Schema, type Model } from "mongoose";
import type { MetaOAuthConnection as MetaOAuthConnectionRecord } from "@/types/metaOAuthConnection";

const MetaOAuthConnectionSchema = new Schema<MetaOAuthConnectionRecord>(
  {
    provider: { type: String, enum: ["facebook"], required: true, unique: true },
    userAccessTokenEncrypted: { type: String, required: true, select: false },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

const MetaOAuthConnectionModel: Model<MetaOAuthConnectionRecord> =
  (models.MetaOAuthConnection as Model<MetaOAuthConnectionRecord> | undefined) ??
  model<MetaOAuthConnectionRecord>("MetaOAuthConnection", MetaOAuthConnectionSchema);

export default MetaOAuthConnectionModel;