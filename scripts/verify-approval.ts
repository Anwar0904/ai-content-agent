import { resolve } from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Campaign from "../src/models/Campaign";
import Video from "../src/models/Video";
import { connectDB } from "../src/lib/db/mongoose";
import { updateVideoApprovalState, VideoReviewTransitionError } from "../src/lib/videoApproval";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  await connectDB();

  const campaign = await Campaign.create({
    title: "Approval verification",
    topic: "Approval validation",
    audience: "QA",
    videoCount: 1,
  });

  const reviewVideo = await Video.create({
    campaignId: campaign._id,
    title: "Review ready",
    hook: "Hook",
    script: "Script",
    caption: "Caption",
    status: "review",
  });

  const approved = await updateVideoApprovalState(reviewVideo._id.toString(), "approve");
  console.log("APPROVE_OK", approved.status, Boolean(approved.reviewedAt));
  const approvedDb = await Video.findById(reviewVideo._id).lean();
  console.log("APPROVE_DB", approvedDb?.status, Boolean(approvedDb?.reviewedAt));

  try {
    await updateVideoApprovalState(reviewVideo._id.toString(), "approve");
    console.log("DUPLICATE_NOT_BLOCKED");
  } catch (error) {
    const message = error instanceof VideoReviewTransitionError ? error.message : "unknown";
    console.log("DUPLICATE_REJECTED", message);
  }

  const rejectedVideo = await Video.create({
    campaignId: campaign._id,
    title: "Reject ready",
    hook: "Hook",
    script: "Script",
    caption: "Caption",
    status: "review",
  });

  const rejected = await updateVideoApprovalState(rejectedVideo._id.toString(), "reject");
  console.log("REJECT_OK", rejected.status, Boolean(rejected.reviewedAt));
  const rejectedDb = await Video.findById(rejectedVideo._id).lean();
  console.log("REJECT_DB", rejectedDb?.status, Boolean(rejectedDb?.reviewedAt));

  await Video.deleteMany({ _id: { $in: [reviewVideo._id, rejectedVideo._id] } });
  await Campaign.deleteOne({ _id: campaign._id });
  await mongoose.disconnect();
}

void main();
