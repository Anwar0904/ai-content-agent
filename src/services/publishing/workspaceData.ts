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

export type PublishingVideo = {
  id: string;
  title: string;
  duration: number;
  status: string;
  rendered: boolean;
  campaignId?: string;
  campaign?: string;
};

export interface PublishingWorkspaceData {
  videos: PublishingVideo[];

  accounts: {
    id: string;
    name: string;
    accountId: string;
    platform: string;
    status: string;
  }[];

  rows: PublishingRow[];
}

function safeError(
  value?: string | null,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(
      /https?:\/\/\S+/gi,
      "[URL redacted]",
    )
    .replace(
      /(?:access[_ ]?token|authorization|app[_ ]?token)\s*[:=]\s*\S+/gi,
      "[credential redacted]",
    )
    .replace(
      /\b(?:Bearer|OAuth)\s+\S+/gi,
      "[credential redacted]",
    )
    .replace(
      /\bEA[A-Za-z0-9]{20,}\b/g,
      "[credential redacted]",
    );
}

function uniqueIds(
  values: Array<{
    toString(): string;
  } | null | undefined>,
): string[] {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) =>
          value!.toString(),
        ),
    ),
  ];
}

export async function getPublishingWorkspace(): Promise<
  PublishingWorkspaceData | null
> {
  try {
    await connectDB();

    const [
      eligible,
      allAccounts,
      records,
    ] = await Promise.all([
      Video.find({
        status: "approved",
        videoPath: {
          $type: "string",
          $regex: /\S/,
        },
      })
        .select(
          "title status videoPath campaignId scenes.duration",
        )
        .sort({
          createdAt: -1,
        })
        .lean(),

      SocialAccount.find()
        .select(
          "platform accountName accountId status",
        )
        .lean(),

      PublishJob.find()
        .sort({
          createdAt: -1,
        })
        .select(
          [
            "videoId",
            "socialAccountId",
            "platform",
            "status",
            "externalPostId",
            "error",
            "createdAt",
            "updatedAt",
          ].join(" "),
        )
        .lean(),
    ]);

    const recordVideoIds =
      uniqueIds(
        records.map(
          (record) =>
            record.videoId,
        ),
      );

    const publishJobIds =
      records.map((record) =>
        record._id.toString(),
      );

    const [
      referencedVideos,
      jobs,
    ] = await Promise.all([
      recordVideoIds.length
        ? Video.find({
            _id: {
              $in: recordVideoIds,
            },
          })
            .select("title")
            .lean()
        : [],

      publishJobIds.length
        ? Job.find({
            type: "PUBLISH_VIDEO",
            "payload.publishJobId": {
              $in: publishJobIds,
            },
          })
            .sort({
              createdAt: -1,
            })
            .select(
              [
                "payload.publishJobId",
                "status",
                "error",
                "completedAt",
                "result.externalPostId",
                "result.publishedAt",
              ].join(" "),
            )
            .lean()
        : [],
    ]);

    const videoTitles =
      new Map(
        referencedVideos.map(
          (video) => [
            video._id.toString(),
            video.title,
          ],
        ),
      );

    const accountsById =
      new Map(
        allAccounts.map(
          (account) => [
            account._id.toString(),
            account,
          ],
        ),
      );

    const jobsByPublishId =
      new Map<
        string,
        (typeof jobs)[number]
      >();

    for (const job of jobs) {
      const publishJobId =
        job.payload
          ?.publishJobId;

      if (
        typeof publishJobId ===
          "string" &&
        !jobsByPublishId.has(
          publishJobId,
        )
      ) {
        jobsByPublishId.set(
          publishJobId,
          job,
        );
      }
    }

    const accounts =
      allAccounts
        .filter(
          (account) =>
            account.status ===
            "connected",
        )
        .filter(
          (account) =>
            account.platform !==
              "facebook" ||
            /^\d+$/.test(
              account.accountId,
            ),
        )
        .filter(
          (account) =>
            process.env.NODE_ENV !==
              "production" ||
            (account.platform ===
              "facebook" &&
              !account.accountId.startsWith(
                "mock",
              )),
        )
        .map((account) => ({
          id:
            account._id.toString(),

          name:
            account.accountName,

          accountId:
            account.accountId,

          platform:
            account.platform,

          status:
            account.status,
        }));

    const rows =
      records.map((record) => {
        const account =
          accountsById.get(
            record.socialAccountId.toString(),
          );

        const job =
          jobsByPublishId.get(
            record._id.toString(),
          );

        const status = job
          ? job.status ===
            "completed"
            ? "published"
            : job.status
          : record.status;

        const resultExternalId =
          job?.result &&
          typeof job.result ===
            "object" &&
          "externalPostId" in
            job.result &&
          typeof job.result
            .externalPostId ===
            "string"
            ? job.result
                .externalPostId
            : undefined;

        return {
          id:
            record._id.toString(),

          jobId:
            job?._id.toString(),

          videoId:
            record.videoId.toString(),

          accountId:
            record.socialAccountId.toString(),

          title:
            videoTitles.get(
              record.videoId.toString(),
            ) ??
            "Video unavailable",

          destination:
            account
              ?.accountName ??
            "Account unavailable",

          platform:
            record.platform,

          mock:
            record.platform ===
              "instagram" ||
            Boolean(
              account?.accountId.startsWith(
                "mock",
              ),
            ) ||
            Boolean(
              record.externalPostId?.startsWith(
                "mock",
              ),
            ),

          status,

          createdAt:
            record.createdAt.toISOString(),

          publishedAt:
            status === "published"
              ? (
                  job?.completedAt ??
                  record.updatedAt
                ).toISOString()
              : undefined,

          externalPostId:
            record.externalPostId ??
            resultExternalId,

          error:
            safeError(
              job?.error ??
                record.error,
            ),
        };
      });

    return {
      videos: eligible.map(
        (video) => ({
          id:
            video._id.toString(),

          title:
            video.title,

          duration:
            video.scenes.reduce(
              (sum, scene) =>
                sum +
                (scene.duration ??
                  0),
              0,
            ),

          status:
            video.status,

          rendered:
            Boolean(
              video.videoPath,
            ),

          campaignId:
            video.campaignId?.toString?.() ??
            "",

          campaign:
            "Campaign unavailable",
        }),
      ),

      accounts,

      rows,
    };
  } catch (error) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.error(
        "[publishingWorkspace] Failed to load publishing workspace:",
        error,
      );
    }

    return null;
  }
}