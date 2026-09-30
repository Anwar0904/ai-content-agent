import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import dotenv from "dotenv";
import mongoose, { Types } from "mongoose";
import AgentRun from "../src/models/AgentRun";
import Campaign from "../src/models/Campaign";
import PublishJob from "../src/models/PublishJob";
import SocialAccount from "../src/models/SocialAccount";
import Video from "../src/models/Video";
import { connectDB } from "../src/lib/db/mongoose";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function verifyDatabase(): Promise<void> {
  let connected = false;
  let campaignId: Types.ObjectId | undefined;
  let videoId: Types.ObjectId | undefined;
  let socialAccountId: Types.ObjectId | undefined;
  let publishJobId: Types.ObjectId | undefined;
  let agentRunId: Types.ObjectId | undefined;

  try {
    await connectDB();
    connected = true;
    console.info("MongoDB connection PASS");
    const verificationId = randomUUID();

    const campaign = await Campaign.create({
      title: `DB verification ${verificationId}`,
      topic: "Database verification",
      audience: "Test audience",
      videoCount: 1,
    });
    campaignId = campaign._id;
    console.info(
      `Campaign creation PASS (${campaignId}; status=${campaign.status})`,
    );

    const video = await Video.create({
      campaignId,
      title: "Verification video",
      hook: "Verification hook",
      script: "Verification script",
      caption: "Verification caption",
    });
    videoId = video._id;
    console.info(`Video creation PASS (${videoId}; status=${video.status})`);

    const socialAccount = await SocialAccount.create({
      platform: "facebook",
      accountName: "Verification account",
      accountId: `verification-${verificationId}`,
    });
    socialAccountId = socialAccount._id;
    console.info(
      `SocialAccount creation PASS (${socialAccountId}; status=${socialAccount.status})`,
    );

    const publishJob = await PublishJob.create({
      videoId,
      socialAccountId,
      platform: "facebook",
    });
    publishJobId = publishJob._id;
    console.info(
      `PublishJob creation PASS (${publishJobId}; status=${publishJob.status})`,
    );

    const agentRun = await AgentRun.create({
      type: "analysis",
      input: { verificationId },
    });
    agentRunId = agentRun._id;
    console.info(`AgentRun creation PASS (${agentRunId}; status=${agentRun.status})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error.";
    console.error(`Database verification failed: ${message}`);
    process.exitCode = 1;
  } finally {
    try {
      if (agentRunId) await AgentRun.deleteOne({ _id: agentRunId });
      if (publishJobId) await PublishJob.deleteOne({ _id: publishJobId });
      if (socialAccountId) await SocialAccount.deleteOne({ _id: socialAccountId });
      if (videoId) await Video.deleteOne({ _id: videoId });
      if (campaignId) await Campaign.deleteOne({ _id: campaignId });

      if (connected) console.info("Cleanup PASS");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cleanup error.";
      console.error(`Database verification cleanup failed: ${message}`);
      process.exitCode = 1;
    } finally {
      try {
        await mongoose.disconnect();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown disconnect error.";
        console.error(`MongoDB disconnect failed: ${message}`);
        process.exitCode = 1;
      }
    }
  }
}

void verifyDatabase();