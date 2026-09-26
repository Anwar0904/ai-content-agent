import { model, models, Schema, type Model } from "mongoose";
import { PUBLISH_JOB_STATUSES } from "../constants/statuses";
import type { PublishJob as PublishJobRecord } from "../types/publishJob";
import SocialAccount from "./SocialAccount";
import Video from "./Video";

const PublishJobSchema = new Schema<PublishJobRecord>(
  {
    videoId: { type: Schema.Types.ObjectId, ref: "Video", required: true },
    socialAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    status: {
      type: String,
      enum: [...PUBLISH_JOB_STATUSES],
      default: "queued",
      required: true,
    },
    scheduledAt: { type: Date },
    externalPostId: { type: String, trim: true },
    error: { type: String, trim: true },
  },
  { timestamps: true },
);

PublishJobSchema.index({ videoId: 1 });
PublishJobSchema.index({ socialAccountId: 1 });
PublishJobSchema.index({ status: 1, scheduledAt: 1 });

PublishJobSchema.pre("validate", async function () {
  const [videoExists, accountExists] = await Promise.all([
    this.videoId ? Video.exists({ _id: this.videoId }) : null,
    this.socialAccountId
      ? SocialAccount.exists({ _id: this.socialAccountId })
      : null,
  ]);

  if (this.videoId && !videoExists) {
    this.invalidate("videoId", "The referenced video does not exist.");
  }

  if (this.socialAccountId && !accountExists) {
    this.invalidate(
      "socialAccountId",
      "The referenced social account does not exist.",
    );
  }
});

const PublishJobModel: Model<PublishJobRecord> =
  (models.PublishJob as Model<PublishJobRecord> | undefined) ??
  model<PublishJobRecord>("PublishJob", PublishJobSchema);

export default PublishJobModel;