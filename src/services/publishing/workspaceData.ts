import { connectDB } from "@/lib/db/mongoose";
import Job from "@/models/Job";
import PublishJob from "@/models/PublishJob";
import SocialAccount from "@/models/SocialAccount";
import Video from "@/models/Video";

export interface PublishingRow {
  id: string;
  jobId?: string;
  videoId: string;
  accountId: string;
  title: string;
  destination: string;
  platform: string;
  mock: boolean;
  status: string;
  createdAt: string;
  publishedAt?: string;
  externalPostId?: string;
  error?: string;
}
export interface PublishingWorkspaceData {
  videos: { id: string; title: string; duration: number }[];
  accounts: { id: string; name: string; platform: string; status: string }[];
  rows: PublishingRow[];
}

function safeError(value?: string) {
  return value?.replace(/https?:\/\/\S+/gi, "[URL redacted]")
    .replace(/(?:access[_ ]?token|authorization|app[_ ]?token)\s*[:=]\s*\S+/gi, "[credential redacted]")
    .replace(/\b(?:Bearer|OAuth)\s+\S+/gi, "[credential redacted]")
    .replace(/\bEA[A-Za-z0-9]{20,}\b/g, "[credential redacted]");
}

export async function getPublishingWorkspace(): Promise<PublishingWorkspaceData | null> {
  try {
    await connectDB();
    const [eligible, accounts, records] = await Promise.all([
      Video.find({ status: "approved", videoPath: { $type: "string", $regex: /\S/ } }).select("title scenes.duration").sort({ createdAt: -1 }).lean(),
      SocialAccount.find().select("platform accountName accountId status").lean(),
      PublishJob.find().sort({ createdAt: -1 }).select("videoId socialAccountId platform status externalPostId error createdAt updatedAt").lean(),
    ]);
    const [videos, jobs] = await Promise.all([
      Video.find({ _id: { $in: records.map((row) => row.videoId) } }).select("title").lean(),
      Job.find({ type: "PUBLISH_VIDEO", "payload.publishJobId": { $in: records.map((row) => row._id.toString()) } }).sort({ createdAt: -1 }).select("payload.publishJobId status error completedAt result.externalPostId result.publishedAt").lean(),
    ]);
    return {
      videos: eligible.map((video) => ({ id: video._id.toString(), title: video.title, duration: video.scenes.reduce((sum, scene) => sum + scene.duration, 0) })),
      accounts: accounts.filter((account) => account.platform !== "facebook" || /^\d+$/.test(account.accountId)).map((account) => ({ id: account._id.toString(), name: account.accountName, platform: account.platform, status: account.status })),
      rows: records.map((record) => {
        const account = accounts.find((item) => item._id.equals(record.socialAccountId));
        const job = jobs.find((item) => item.payload.publishJobId === record._id.toString());
        const status = job ? (job.status === "completed" ? "published" : job.status) : record.status;
        return {
          id: record._id.toString(), jobId: job?._id.toString(), videoId: record.videoId.toString(), accountId: record.socialAccountId.toString(),
          title: videos.find((video) => video._id.equals(record.videoId))?.title ?? "Video unavailable",
          destination: account?.accountName ?? "Account unavailable", platform: record.platform,
          mock: record.platform === "instagram" || !!account?.accountId.startsWith("mock") || !!record.externalPostId?.startsWith("mock"),
          status, createdAt: record.createdAt.toISOString(),
          publishedAt: status === "published" ? (job?.completedAt ?? record.updatedAt).toISOString() : undefined,
          externalPostId: record.externalPostId, error: safeError(job?.error || record.error),
        };
      }),
    };
  } catch {
    return null;
  }
}
