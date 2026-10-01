import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clapperboard,
  Clock3,
  FolderKanban,
  PlayCircle,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatDate";
import { getCampaignDetail } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  const campaign = await getCampaignDetail(id);

  if (!campaign) {
    notFound();
  }

  const totalVideos = campaign.videos.length;

  const readyCount = campaign.videos.filter(
    (video) => video.status === "review",
  ).length;

  const approvedCount = campaign.videos.filter(
    (video) => video.status === "approved",
  ).length;

  const publishedCount = campaign.videos.filter(
    (video) => video.status === "published",
  ).length;

  const failedCount = campaign.videos.filter(
    (video) => video.status === "failed",
  ).length;

  const processingCount = campaign.videos.filter((video) =>
    ["generating", "rendering", "processing", "queued"].includes(
      video.status,
    ),
  ).length;

  const completionPercent =
    campaign.videoCount > 0
      ? Math.min(
          100,
          Math.round((totalVideos / campaign.videoCount) * 100),
        )
      : 0;

  return (
    <div className="space-y-7">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" size={15} />
        Back to campaigns
      </Link>

      <PageHeader
        eyebrow="Campaign"
        title={campaign.title}
        description="Review campaign progress, watch generated videos, and decide what is ready to move forward."
        action={<StatusBadge status={campaign.status} />}
      />

      <section
        aria-label="Campaign progress"
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          <SummaryCard
            label="Videos"
            value={totalVideos}
            note={`${campaign.videoCount} planned`}
            icon={Clapperboard}
          />

          <SummaryCard
            label="Ready for review"
            value={readyCount}
            note="Waiting for your decision"
            icon={Sparkles}
          />

          <SummaryCard
            label="Approved"
            value={approvedCount}
            note="Ready for publishing"
            icon={BadgeCheck}
          />

          <SummaryCard
            label="Published"
            value={publishedCount}
            note="Successfully delivered"
            icon={PlayCircle}
          />
        </div>

        <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Campaign progress
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {totalVideos} of {campaign.videoCount} planned videos created
              </p>
            </div>

            <span className="text-sm font-semibold text-zinc-700">
              {completionPercent}%
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
            aria-label={`${completionPercent}% campaign completion`}
          >
            <div
              className="h-full rounded-full bg-zinc-900 transition-[width]"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </section>

      {(failedCount > 0 || processingCount > 0) && (
        <section
          aria-label="Campaign attention"
          className="grid gap-3 md:grid-cols-2"
        >
          {processingCount > 0 && (
            <AttentionCard
              icon={Clock3}
              title={`${processingCount} ${
                processingCount === 1 ? "video is" : "videos are"
              } still processing`}
              description="The video library will update as rendering completes."
            />
          )}

          {failedCount > 0 && (
            <AttentionCard
              icon={AlertTriangle}
              title={`${failedCount} ${
                failedCount === 1 ? "video failed" : "videos failed"
              }`}
              description="Open the failed video to review the error and available recovery options."
              danger
            />
          )}
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-950">
            Campaign details
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            The brief and creative settings used for this campaign.
          </p>
        </div>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampaignFact
            icon={FolderKanban}
            label="Topic"
            value={campaign.topic}
          />

          <CampaignFact
            icon={Users}
            label="Audience"
            value={campaign.audience}
          />

          <CampaignFact
            icon={Sparkles}
            label="Style"
            value={campaign.style ?? "Not set"}
          />

          <CampaignFact
            icon={Clock3}
            label="Duration"
            value={
              campaign.durationMin && campaign.durationMax
                ? `${campaign.durationMin}–${campaign.durationMax} seconds`
                : "Not set"
            }
          />

          <CampaignFact
            icon={Clapperboard}
            label="Planned videos"
            value={`${campaign.videoCount}`}
          />

          <CampaignFact
            icon={CalendarDays}
            label="Created"
            value={formatDate(campaign.createdAt)}
          />
        </dl>
      </section>

      <section
        aria-labelledby="campaign-videos-heading"
        className="space-y-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="campaign-videos-heading"
              className="text-lg font-semibold text-zinc-950"
            >
              Campaign videos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Watch, review, and manage every video generated for this campaign.
            </p>
          </div>

          <span className="text-sm font-medium text-zinc-500">
            {totalVideos} {totalVideos === 1 ? "video" : "videos"}
          </span>
        </div>

        {campaign.videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200">
              <Clapperboard aria-hidden="true" size={19} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-zinc-900">
              No videos yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
              Generate content for this campaign to start building its video
              library.
            </p>

            <Link
              href="/campaigns"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Back to campaigns
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {campaign.videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Clapperboard;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-zinc-600">
          {label}
        </span>

        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Icon aria-hidden="true" size={15} />
        </span>
      </div>

      <div className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
        {value}
      </div>

      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {note}
      </p>
    </div>
  );
}

function CampaignFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clapperboard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        <Icon aria-hidden="true" size={14} />
      </span>

      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </dt>

        <dd className="mt-1 text-sm font-medium leading-5 text-zinc-800">
          {value}
        </dd>
      </div>
    </div>
  );
}

function AttentionCard({
  icon: Icon,
  title,
  description,
  danger = false,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
        danger
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <Icon
        aria-hidden="true"
        size={17}
        className={`mt-0.5 shrink-0 ${
          danger ? "text-red-700" : "text-amber-700"
        }`}
      />

      <div>
        <h3
          className={`text-sm font-semibold ${
            danger ? "text-red-900" : "text-amber-900"
          }`}
        >
          {title}
        </h3>

        <p
          className={`mt-0.5 text-sm leading-5 ${
            danger ? "text-red-700" : "text-amber-800"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function VideoCard({
  video,
}: {
  video: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
    videoPath?: string;
    templateLabel?: string;
  };
}) {
  const isPlayable = Boolean(video.videoPath);

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <Link
        href={`/videos/${video.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900"
      >
        <div className="relative aspect-[9/16] max-h-[420px] w-full overflow-hidden bg-zinc-950">
          {isPlayable ? (
            <>
              <video
                aria-label={`Preview of ${video.title}`}
                className="h-full w-full object-cover"
                playsInline
                preload="metadata"
                src={video.videoPath}
              />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-zinc-900 opacity-0 shadow-sm transition group-hover:opacity-100">
                  <PlayCircle aria-hidden="true" size={21} />
                </span>
              </div>
            </>
          ) : (
            <VideoPlaceholder status={video.status} />
          )}

          <div className="absolute left-3 top-3">
            <StatusBadge status={video.status} />
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div>
          <Link
            href={`/videos/${video.id}`}
            className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950 transition hover:text-zinc-700"
          >
            {video.title}
          </Link>

          <p className="mt-1 text-xs text-zinc-500">
            {video.templateLabel ?? "Custom video"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <span className="text-xs text-zinc-400">
            {formatDate(video.updatedAt ?? video.createdAt)}
          </span>

          <Link
            href={`/videos/${video.id}`}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {video.status === "review" ? "Review video" : "View video"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function VideoPlaceholder({
  status,
}: {
  status: string;
}) {
  const message =
    status === "rendering"
      ? "Rendering video"
      : status === "failed"
        ? "Render failed"
        : status === "generating"
          ? "Generating video"
          : "Video not ready";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-zinc-400">
      <span className="flex size-12 items-center justify-center rounded-xl bg-white/10">
        <Clapperboard aria-hidden="true" size={22} />
      </span>

      <span className="text-sm font-medium">
        {message}
      </span>
    </div>
  );
}