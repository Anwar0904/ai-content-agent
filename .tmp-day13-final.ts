import { spawn, execSync } from 'node:child_process';
import { connectDB } from './src/lib/db/mongoose';
import Video from './src/models/Video';
import SocialAccount from './src/models/SocialAccount';
import Job from './src/models/Job';
import PublishJob from './src/models/PublishJob';
import { enqueuePublishJob } from './src/services/jobs/jobService';

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForJob(jobId: string, predicate: (job: any) => boolean, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await Job.findById(jobId).lean();
    if (job && predicate(job)) return job;
    await wait(1000);
  }
  const finalJob = await Job.findById(jobId).lean();
  return finalJob;
}

(async () => {
  await connectDB();

  const hasWorker = (() => {
    try {
      const out = execSync("pgrep -af 'tsx worker/worker.ts|node .*worker/worker.ts' || true", { encoding: 'utf8' });
      return Boolean(out.trim());
    } catch {
      return false;
    }
  })();

  let worker: ReturnType<typeof spawn> | null = null;
  if (!hasWorker) {
    worker = spawn('npm', ['run', 'worker'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await wait(2500);
  }

  try {
    let video = await Video.findOne({ videoPath: { $exists: true, $ne: null }, status: { $ne: 'approved' } }).sort({ createdAt: 1 }).lean();
    if (!video) {
      video = await Video.findOne({ videoPath: { $exists: true, $ne: null } }).sort({ createdAt: 1 }).lean();
    }
    if (!video) throw new Error('No existing rendered MP4 available for publish tests.');
    await Video.findByIdAndUpdate(video._id, { $set: { status: 'approved' } });

    const instagramAccount = await SocialAccount.findOneAndUpdate(
      { platform: 'instagram', accountId: 'mock-instagram-account-1' },
      {
        $setOnInsert: {
          platform: 'instagram',
          accountId: 'mock-instagram-account-1',
          accountName: 'Mock Instagram Account',
          status: 'connected',
          username: 'mock.instagram',
          profileUrl: 'https://example.com/instagram',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    const existingInstagramJob = await Job.findOne({
      type: 'PUBLISH_VIDEO',
      dedupeKey: `PUBLISH_VIDEO:${video._id.toString()}:${instagramAccount._id.toString()}`,
      status: { $in: ['queued', 'processing'] },
    }).lean();
    if (existingInstagramJob) throw new Error(`Instagram test blocked by active job ${existingInstagramJob._id.toString()}.`);

    const igEnqueue = await enqueuePublishJob(video._id.toString(), instagramAccount._id.toString());
    const igJobId = igEnqueue.job.id;
    const igJob = await waitForJob(igJobId, (job) => job.type === 'PUBLISH_VIDEO' && job.status === 'completed', 30000);

    const igJobRecord = await Job.findById(igJobId).lean();
    const igPublishRecord = await PublishJob.findOne({ videoId: video._id, socialAccountId: instagramAccount._id }).lean();
    const igResult = {
      instagramWorkerExecution: {
        jobId: igJobId,
        type: igJobRecord?.type ?? null,
        payload: igJobRecord?.payload ?? null,
        status: igJobRecord?.status ?? null,
      },
      instagramPublishJob: {
        platform: igPublishRecord?.platform ?? null,
        status: igPublishRecord?.status ?? null,
        externalPostId: igPublishRecord?.externalPostId ?? null,
      },
    };

    const failAccount = await SocialAccount.findOneAndUpdate(
      { platform: 'facebook', accountId: 'mock-fail-facebook-1' },
      {
        $setOnInsert: {
          platform: 'facebook',
          accountId: 'mock-fail-facebook-1',
          accountName: 'Mock Fail Facebook',
          status: 'connected',
          username: 'mock.fail.facebook',
          profileUrl: 'https://example.com/fail-facebook',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    const failJob = await enqueuePublishJob(video._id.toString(), failAccount._id.toString());
    const failedJob = await waitForJob(failJob.job.id, (job) => job.status === 'failed', 30000);
    const failedJobRecord = await Job.findById(failJob.job.id).lean();
    const failedPublishRecord = await PublishJob.findOne({ videoId: video._id, socialAccountId: failAccount._id }).lean();

    const workerAlive = worker ? !worker.killed && worker.exitCode === null : true;

    const validAccount = await SocialAccount.findOne({ platform: 'facebook', accountId: 'mock-facebook-page-1', status: 'connected' }).lean();
    if (!validAccount) {
      throw new Error('No valid mock Facebook account available for the post-failure success test.');
    }
    const validJob = await enqueuePublishJob(video._id.toString(), validAccount._id.toString());
    const successfulJob = await waitForJob(validJob.job.id, (job) => job.status === 'completed', 30000);
    const successJobRecord = await Job.findById(validJob.job.id).lean();
    const successPublishRecord = await PublishJob.findOne({ videoId: video._id, socialAccountId: validAccount._id }).lean();

    console.log(JSON.stringify({
      instagram: igResult,
      failureIsolation: {
        failJobId: failJob.job.id,
        failedStatus: failedJobRecord?.status ?? null,
        failedError: failedJobRecord?.error ?? null,
        failedPublishStatus: failedPublishRecord?.status ?? null,
        failedPublishError: failedPublishRecord?.error ?? null,
        workerAlive,
      },
      subsequentSuccess: {
        validJobId: validJob.job.id,
        successStatus: successJobRecord?.status ?? null,
        successPublishStatus: successPublishRecord?.status ?? null,
        successExternalPostId: successPublishRecord?.externalPostId ?? null,
      },
    }, null, 2));
  } finally {
    if (worker) {
      worker.kill('SIGTERM');
      await wait(1500);
    }
  }
})();
