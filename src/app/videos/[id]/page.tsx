import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clapperboard,
  Clock3,
  FileText,
  FolderKanban,
  Hash,
  MessageSquareText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SceneAssetPreview } from "@/components/videos/SceneAssetPreview";
import { VideoDetailActions } from "@/components/videos/VideoDetailActions";
import { VideoSceneActions } from "@/components/videos/VideoSceneActions";
import { formatDate } from "@/lib/formatDate";
import { getPublishingWorkspace } from "@/services/publishing/workspaceData";
import { getVideoDetail } from "@/services/video/videoDetails";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({
  params,
}: PageProps<"/videos/[id]">) {
  const { id } = await params;

  if (
    !/^[a-f\d]{24}$/i.test(id) ||
    !isValidObjectId(id)
  ) {
    notFound();
  }

  let video;

  try {
    video = await getVideoDetail(id);
  } catch {
    return (
      <div className="space-y-7">
        <ErrorState
          title="Video unavailable"
          description="We couldn't load this video. Check the database connection and try again."
        />
      </div>
    );
  }

  if (!video) {
    notFound();
  }

  const publishing =
    await getPublishingWorkspace();

  const videoPublishing = publishing
    ? {
        accounts: publishing.accounts,
        rows: publishing.rows.filter(
          (row) =>
            row.videoId === video.id,
        ),
      }
    : null;

  const hasMedia =
    Boolean(video.videoPath);

  const totalDuration =
    video.scenes.reduce(
      (total, scene) =>
        total +
        (scene.duration ?? 0),
      0,
    );

  return (
    <div className="space-y-7">
      {/* -------------------------------------------------------------- */}
      {/* Back                                                         */}
      {/* -------------------------------------------------------------- */}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/videos"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          <ArrowLeft
            aria-hidden="true"
            size={15}
          />
          Back to videos
        </Link>

        {video.campaignId &&
          video.campaignTitle && (
            <>
              <span
                aria-hidden="true"
                className="text-zinc-300"
              >
                /
              </span>

              <Link
                href={`/campaigns/${video.campaignId}`}
                className="max-w-[240px] truncate text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
              >
                {video.campaignTitle}
              </Link>
            </>
          )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Heading                                                       */}
      {/* -------------------------------------------------------------- */}

      <PageHeader
        eyebrow="Video review"
        title={video.title}
        description="Watch the final video, review its content, and decide whether it is ready to publish."
        action={
          <StatusBadge
            status={video.status}
          />
        }
      />

      {/* -------------------------------------------------------------- */}
      {/* Main review workspace                                         */}
      {/* -------------------------------------------------------------- */}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------------------------------------ */}
        {/* Player                                                      */}
        {/* ------------------------------------------------------------ */}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Video preview
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Review the final output before approving it.
              </p>
            </div>

            {totalDuration > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                <Clock3
                  aria-hidden="true"
                  size={12}
                />
                {formatDuration(
                  totalDuration,
                )}
              </span>
            )}
          </div>

          <div className="flex min-h-[520px] items-center justify-center bg-zinc-950 p-4 sm:p-6">
            {hasMedia ? (
              <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-xl bg-black shadow-2xl">
                <video
                  aria-label={`Preview of ${video.title}`}
                  className="aspect-[9/16] w-full bg-black object-contain"
                  controls
                  playsInline
                  preload="metadata"
                  src={video.videoPath}
                />
              </div>
            ) : (
              <VideoUnavailableState
                status={video.status}
                hasScenes={
                  video.scenes.length >
                  0
                }
              />
            )}
          </div>

          {video.videoPath && (
            <div className="border-t border-zinc-100 px-5 py-3 sm:px-6">
              <p className="text-xs leading-5 text-zinc-500">
                Watch the complete video before approving it for publishing.
              </p>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Review panel                                                */}
        {/* ------------------------------------------------------------ */}

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Review & actions
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  The available actions depend on the current video state.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <VideoDetailActions
                canRender={
                  !video.videoPath &&
                  video.scenes.length >
                    0 &&
                  [
                    "draft",
                    "review",
                    "approved",
                    "failed",
                  ].includes(
                    video.status,
                  )
                }
                initialJob={
                  video.renderJob
                }
                publishing={
                  videoPublishing
                }
                rendered={
                  Boolean(
                    video.videoPath,
                  )
                }
                status={
                  video.status
                }
                title={video.title}
                videoId={video.id}
              />
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Details                                                    */}
          {/* ---------------------------------------------------------- */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-950">
              Video details
            </h2>

            <dl className="mt-4 space-y-4">
              {video.campaignTitle && (
                <DetailRow
                  icon={FolderKanban}
                  label="Campaign"
                  value={
                    video.campaignTitle
                  }
                  href={
                    video.campaignId
                      ? `/campaigns/${video.campaignId}`
                      : undefined
                  }
                />
              )}

              <DetailRow
                icon={Clapperboard}
                label="Template"
                value={
                  video.templateLabel ||
                  "Custom video"
                }
              />

              <DetailRow
                icon={Clock3}
                label="Duration"
                value={
                  totalDuration > 0
                    ? formatDuration(
                        totalDuration,
                      )
                    : "Not available"
                }
              />

              <DetailRow
                icon={CalendarDays}
                label="Created"
                value={formatDate(
                  video.createdAt,
                )}
              />

              {video.reviewedAt && (
                <DetailRow
                  icon={BadgeCheck}
                  label="Reviewed"
                  value={formatDate(
                    video.reviewedAt,
                  )}
                />
              )}
            </dl>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* State message                                              */}
          {/* ---------------------------------------------------------- */}

          <VideoStateMessage
            status={video.status}
            rendered={
              Boolean(video.videoPath)
            }
          />
        </aside>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Hook                                                          */}
      {/* -------------------------------------------------------------- */}

      <ContentSection
        icon={Sparkles}
        eyebrow="Opening"
        title="Hook"
      >
        {video.hook?.trim() ? (
          <p className="text-base leading-7 text-zinc-700">
            {video.hook}
          </p>
        ) : (
          <EmptyCopy>
            No hook has been saved for this video.
          </EmptyCopy>
        )}
      </ContentSection>

      {/* -------------------------------------------------------------- */}
      {/* Script                                                        */}
      {/* -------------------------------------------------------------- */}

      <ContentSection
        icon={FileText}
        eyebrow="Narrative"
        title="Script"
      >
        {video.script?.trim() ? (
          <p className="whitespace-pre-line text-[15px] leading-7 text-zinc-700">
            {video.script}
          </p>
        ) : (
          <EmptyCopy>
            No script has been saved for this video.
          </EmptyCopy>
        )}
      </ContentSection>

      {/* -------------------------------------------------------------- */}
      {/* Caption + hashtags                                            */}
      {/* -------------------------------------------------------------- */}

      <div className="grid gap-6 lg:grid-cols-2">
        <ContentSection
          icon={MessageSquareText}
          eyebrow="Publishing copy"
          title="Caption"
        >
          {video.caption?.trim() ? (
            <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
              {video.caption}
            </p>
          ) : (
            <EmptyCopy>
              No caption has been saved for this video.
            </EmptyCopy>
          )}
        </ContentSection>

        <ContentSection
          icon={Hash}
          eyebrow="Discovery"
          title="Hashtags"
        >
          {video.hashtags.length >
          0 ? (
            <div className="flex flex-wrap gap-2">
              {video.hashtags.map(
                (tag, index) => {
                  const normalized =
                    tag.startsWith("#")
                      ? tag
                      : `#${tag}`;

                  return (
                    <span
                      key={`${normalized}-${index}`}
                      className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      {normalized}
                    </span>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyCopy>
              No hashtags have been saved for this video.
            </EmptyCopy>
          )}
        </ContentSection>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Scenes                                                        */}
      {/* -------------------------------------------------------------- */}

      <section
        id="scenes-heading"
        aria-labelledby="scenes-title"
        className="space-y-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Production
            </p>

            <h2
              id="scenes-title"
              className="mt-1 text-lg font-semibold text-zinc-950"
            >
              Scenes
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Review the narration and visual asset used for each scene.
            </p>
          </div>

          <span className="text-sm font-medium text-zinc-500">
            {video.scenes.length}{" "}
            {video.scenes.length ===
            1
              ? "scene"
              : "scenes"}
          </span>
        </div>

        {video.scenes.length >
        0 ? (
          <div className="space-y-4">
            {[...video.scenes]
              .sort(
                (left, right) =>
                  left.order -
                  right.order,
              )
              .map((scene) => (
                <article
                  key={scene.order}
                  className="grid gap-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:p-5"
                >
                  <SceneAssetPreview
                    assetPath={
                      scene.assetPath
                    }
                    order={
                      scene.order
                    }
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Scene{" "}
                        {String(
                          scene.order,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                        <Clock3
                          aria-hidden="true"
                          size={12}
                        />
                        {
                          scene.duration
                        }
                        s
                      </span>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Narration
                      </h4>

                      <p className="mt-1.5 text-sm leading-6 text-zinc-700">
                        {
                          scene.narration
                        }
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                      <span className="text-xs text-zinc-400">
                        Visual
                      </span>

                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600">
                        {formatAssetType(
                          scene.assetType,
                        )}
                      </span>

                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
                        {formatProvider(
                          scene.assetProvider,
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200">
              <Clapperboard
                aria-hidden="true"
                size={19}
              />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-zinc-950">
              Scenes aren&apos;t ready yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
              Generate the scene plan and visual assets before rendering the final video.
            </p>

            {video.status ===
              "draft" && (
              <div className="mx-auto mt-5 max-w-xs">
                <VideoSceneActions
                  scenes={[]}
                  videoId={
                    video.id
                  }
                />
              </div>
            )}
          </section>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Publication shortcut                                           */}
      {/* -------------------------------------------------------------- */}

      {video.status ===
        "published" && (
        <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">
              This video has been published
            </h2>

            <p className="mt-0.5 text-sm text-emerald-700">
              Open publishing history to review its delivery details.
            </p>
          </div>

          <Link
            href="/publishing"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <PlayCircle
              aria-hidden="true"
              size={15}
            />
            View publication
          </Link>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               UI HELPERS                                   */
/* -------------------------------------------------------------------------- */

function VideoUnavailableState({
  status,
  hasScenes,
}: {
  status: string;
  hasScenes: boolean;
}) {
  const content =
    status === "rendering"
      ? {
          title:
            "Rendering your video",
          description:
            "The final MP4 is being assembled. This page will show the video when rendering completes.",
          icon: Clock3,
        }
      : status === "failed"
        ? {
            title:
              "Video rendering failed",
            description:
              "The final video could not be created. Review the action panel to try again.",
            icon: Clapperboard,
          }
        : !hasScenes
          ? {
              title:
                "Scenes are not ready",
              description:
                "Generate the scene plan before rendering the final video.",
              icon: Sparkles,
            }
          : {
              title:
                "Video has not been rendered",
              description:
                "Render the scenes to create the final vertical MP4.",
              icon: Clapperboard,
            };

  const Icon =
    content.icon;

  return (
    <div className="flex max-w-sm flex-col items-center px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-zinc-300">
        <Icon
          aria-hidden="true"
          size={24}
        />
      </span>

      <h2 className="mt-4 text-base font-semibold text-white">
        {content.title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {content.description}
      </p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Clapperboard;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        <Icon
          aria-hidden="true"
          size={14}
        />
      </span>

      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </dt>

        <dd className="mt-1 truncate text-sm font-medium text-zinc-800">
          {href ? (
            <Link
              href={href}
              className="transition hover:text-zinc-950 hover:underline"
            >
              {value}
            </Link>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}

function ContentSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Icon
            aria-hidden="true"
            size={16}
          />
        </span>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-base font-semibold text-zinc-950">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function EmptyCopy({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm italic leading-6 text-zinc-400">
      {children}
    </p>
  );
}

function VideoStateMessage({
  status,
  rendered,
}: {
  status: string;
  rendered: boolean;
}) {
  if (
    status === "review"
  ) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Sparkles
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>
            <h2 className="text-sm font-semibold text-amber-950">
              Ready for your review
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Watch the complete video, then approve it if it is ready for publishing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    status === "approved"
  ) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <BadgeCheck
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <div>
            <h2 className="text-sm font-semibold text-emerald-950">
              Approved for publishing
            </h2>

            <p className="mt-1 text-sm leading-6 text-emerald-700">
              Choose a connected social account when you&apos;re ready to publish.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    status === "failed"
  ) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-950">
          Video needs attention
        </h2>

        <p className="mt-1 text-sm leading-6 text-red-700">
          Rendering failed. You can retry if the scenes are still available.
        </p>
      </div>
    );
  }

  if (
    status === "rendering"
  ) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-sm font-semibold text-blue-950">
          Rendering in progress
        </h2>

        <p className="mt-1 text-sm leading-6 text-blue-700">
          The worker is creating the final video. No action is required right now.
        </p>
      </div>
    );
  }

  if (
    status === "published"
  ) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-sm font-semibold text-emerald-950">
          Published
        </h2>

        <p className="mt-1 text-sm leading-6 text-emerald-700">
          This video has completed the publishing workflow.
        </p>
      </div>
    );
  }

  if (!rendered) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Final video not ready
        </h2>

        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Complete the remaining production steps before reviewing this video.
        </p>
      </div>
    );
  }

  return null;
}

function formatDuration(
  seconds: number,
): string {
  const safe = Math.max(
    0,
    Math.round(seconds),
  );

  const minutes =
    Math.floor(safe / 60);

  return `${minutes}:${String(
    safe % 60,
  ).padStart(2, "0")}`;
}

function formatAssetType(
  type?: string,
): string {
  switch (type) {
    case "ai":
      return "AI generated";
    case "stock":
      return "Stock";
    case "local":
      return "Local";
    default:
      return "Visual asset";
  }
}

function formatProvider(
  provider?: string,
): string {
  if (!provider) {
    return "Provider unavailable";
  }

  return (
    provider.charAt(0).toUpperCase() +
    provider.slice(1)
  );
}