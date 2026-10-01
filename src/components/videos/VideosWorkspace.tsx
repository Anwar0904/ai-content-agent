"use client";

import {
  Check,
  ChevronDown,
  CircleAlert,
  Clapperboard,
  Clock3,
  Filter,
  Play,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { VideoDetailActions } from "./VideoDetailActions";
import type { VideoPublishingData } from "./VideoPublishAction";

export interface CompactVideo {
  id: string;

  campaignId: string;
  campaign: string;

  title: string;
  status: string;

  createdAt: string;
  updatedAt: string;

  duration: number;

  thumbnail?: string;
  videoPath?: string;

  rendered: boolean;

  template: string;
}

interface VideosWorkspaceProps {
  videos: CompactVideo[];

  publishing:
    | VideoPublishingData
    | null;

  initialCampaignId?: string;
  initialStatus?: string;
}

const statusOptions = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "review",
    label: "Ready for review",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rendering",
    label: "Rendering",
  },
  {
    value: "published",
    label: "Published",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "generating",
    label: "Generating",
  },
];

export function VideosWorkspace({
  videos,
  publishing,
  initialCampaignId,
  initialStatus,
}: VideosWorkspaceProps) {
  const validInitialStatus =
    statusOptions.some(
      (item) =>
        item.value ===
        initialStatus,
    )
      ? initialStatus!
      : "all";

  const [filter, setFilter] =
    useState(validInitialStatus);

  const [campaignFilter, setCampaignFilter] =
    useState(
      initialCampaignId ?? "all",
    );

  const [search, setSearch] =
    useState("");

  const campaigns = useMemo(() => {
    const unique = new Map<
      string,
      string
    >();

    for (const video of videos) {
      if (
        video.campaignId &&
        !unique.has(video.campaignId)
      ) {
        unique.set(
          video.campaignId,
          video.campaign,
        );
      }
    }

    return [...unique.entries()]
      .map(([id, name]) => ({
        id,
        name,
      }))
      .sort((left, right) =>
        left.name.localeCompare(
          right.name,
        ),
      );
  }, [videos]);

  const normalizedSearch =
    search.trim().toLowerCase();

  const shown = useMemo(() => {
    return videos.filter(
      (video) => {
        const matchesStatus =
          filter === "all" ||
          video.status === filter;

        const matchesCampaign =
          campaignFilter === "all" ||
          video.campaignId ===
            campaignFilter;

        const matchesSearch =
          !normalizedSearch ||
          `${video.title} ${video.campaign} ${video.template}`
            .toLowerCase()
            .includes(
              normalizedSearch,
            );

        return (
          matchesStatus &&
          matchesCampaign &&
          matchesSearch
        );
      },
    );
  }, [
    videos,
    filter,
    campaignFilter,
    normalizedSearch,
  ]);

  const counts = useMemo(
    () => ({
      all: videos.length,

      review: videos.filter(
        (video) =>
          video.status === "review",
      ).length,

      approved: videos.filter(
        (video) =>
          video.status === "approved",
      ).length,

      processing:
        videos.filter((video) =>
          [
            "generating",
            "rendering",
            "queued",
            "processing",
          ].includes(video.status),
        ).length,

      published: videos.filter(
        (video) =>
          video.status === "published",
      ).length,

      failed: videos.filter(
        (video) =>
          video.status === "failed",
      ).length,
    }),
    [videos],
  );

  const hasFilters =
    filter !== "all" ||
    campaignFilter !== "all" ||
    search.trim().length > 0;

  function clearFilters() {
    setFilter("all");
    setCampaignFilter("all");
    setSearch("");
  }

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------- */}
      {/* Summary                                                        */}
      {/* -------------------------------------------------------------- */}

      <section
        aria-label="Video library summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <SummaryFilter
          active={filter === "all"}
          label="All videos"
          value={counts.all}
          onClick={() =>
            setFilter("all")
          }
        />

        <SummaryFilter
          active={
            filter === "review"
          }
          label="Needs review"
          value={counts.review}
          icon={Sparkles}
          onClick={() =>
            setFilter("review")
          }
        />

        <SummaryFilter
          active={
            filter === "approved"
          }
          label="Approved"
          value={counts.approved}
          icon={Check}
          onClick={() =>
            setFilter("approved")
          }
        />

        <SummaryFilter
          active={false}
          label="Processing"
          value={counts.processing}
          icon={Clock3}
          onClick={() => {
            setFilter(
              counts.processing > 0
                ? "rendering"
                : "all",
            );
          }}
        />

        <SummaryFilter
          active={
            filter === "published"
          }
          label="Published"
          value={counts.published}
          icon={Send}
          onClick={() =>
            setFilter("published")
          }
        />

        <SummaryFilter
          active={
            filter === "failed"
          }
          label="Failed"
          value={counts.failed}
          icon={CircleAlert}
          danger={
            counts.failed > 0
          }
          onClick={() =>
            setFilter("failed")
          }
        />
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Attention                                                      */}
      {/* -------------------------------------------------------------- */}

      {counts.review > 0 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Sparkles
                aria-hidden="true"
                size={17}
              />
            </span>

            <div>
              <h2 className="text-sm font-semibold text-amber-950">
                {counts.review}{" "}
                {counts.review === 1
                  ? "video needs"
                  : "videos need"}{" "}
                your review
              </h2>

              <p className="mt-0.5 text-sm text-amber-800">
                Watch each video before
                approving it for publishing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setFilter("review")
            }
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-800"
          >
            Review now
          </button>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Search and filters                                             */}
      {/* -------------------------------------------------------------- */}

      <section
        aria-label="Video filters"
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
          <label className="relative block">
            <span className="sr-only">
              Search videos
            </span>

            <Search
              aria-hidden="true"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="search"
              value={search}
              placeholder="Search title, campaign, or template..."
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
            />
          </label>

          <SelectFilter
            label="Status"
            value={filter}
            onChange={setFilter}
          >
            {statusOptions.map(
              (status) => (
                <option
                  key={
                    status.value
                  }
                  value={
                    status.value
                  }
                >
                  {status.label}
                </option>
              ),
            )}
          </SelectFilter>

          <SelectFilter
            label="Campaign"
            value={campaignFilter}
            onChange={
              setCampaignFilter
            }
          >
            <option value="all">
              All campaigns
            </option>

            {campaigns.map(
              (campaign) => (
                <option
                  key={campaign.id}
                  value={campaign.id}
                >
                  {campaign.name}
                </option>
              ),
            )}
          </SelectFilter>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <X
                aria-hidden="true"
                size={15}
              />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Filter
              aria-hidden="true"
              size={13}
            />

            <span>
              Showing {shown.length} of{" "}
              {videos.length}{" "}
              {videos.length === 1
                ? "video"
                : "videos"}
            </span>
          </div>

          {campaignFilter !==
            "all" && (
            <span className="text-xs font-medium text-zinc-500">
              Campaign filtered
            </span>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Library                                                        */}
      {/* -------------------------------------------------------------- */}

      {shown.length === 0 ? (
        <FilteredEmptyState
          filtered={hasFilters}
          clearFilters={
            clearFilters
          }
        />
      ) : (
        <section
          aria-label="Video library"
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {shown.map((video) => {
            const history =
              publishing?.rows.filter(
                (row) =>
                  row.videoId ===
                  video.id,
              ) ?? [];

            const active =
              history.find(
                (row) =>
                  row.status ===
                    "queued" ||
                  row.status ===
                    "processing",
              );

            const publication =
              active ??
              history[0];

            return (
              <VideoLibraryCard
                key={video.id}
                video={video}
                publication={
                  publication
                }
                history={history}
                publishing={
                  publishing
                }
              />
            );
          })}
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               VIDEO CARD                                   */
/* -------------------------------------------------------------------------- */

function VideoLibraryCard({
  video,
  publication,
  history,
  publishing,
}: {
  video: CompactVideo;

  publication?:
    VideoPublishingData["rows"][number];

  history:
    VideoPublishingData["rows"];

  publishing:
    VideoPublishingData | null;
}) {
  const needsReview =
    video.status === "review";

  const failed =
    video.status === "failed";

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
      {/* -------------------------------------------------------------- */}
      {/* Preview                                                        */}
      {/* -------------------------------------------------------------- */}

      <div className="relative bg-zinc-950">
        <Link
          href={`/videos/${video.id}`}
          aria-label={`View ${video.title}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <div className="relative mx-auto aspect-[9/16] max-h-[420px] overflow-hidden">
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <VideoPreviewPlaceholder
                status={
                  video.status
                }
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />

            {video.rendered && (
              <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-950 opacity-90 shadow-lg transition group-hover:scale-105">
                <Play
                  aria-hidden="true"
                  size={19}
                  fill="currentColor"
                />
              </span>
            )}

            <div className="absolute left-3 top-3">
              <StatusBadge
                status={video.status}
              />
            </div>

            {video.duration > 0 && (
              <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {formatDuration(
                  video.duration,
                )}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Content                                                        */}
      {/* -------------------------------------------------------------- */}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <Link
            href={`/videos/${video.id}`}
            className="line-clamp-2 text-[15px] font-semibold leading-5 text-zinc-950 transition hover:text-zinc-700"
          >
            {video.title}
          </Link>

          <Link
            href={`/campaigns/${video.campaignId}`}
            className="mt-1.5 block truncate text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            {video.campaign}
          </Link>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
              {video.template}
            </span>

            <span
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                video.rendered
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {video.rendered
                ? "Rendered"
                : "Not rendered"}
            </span>
          </div>

          {needsReview && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
              <Sparkles
                aria-hidden="true"
                size={14}
                className="mt-0.5 shrink-0"
              />

              <span>
                This video is ready
                for your review.
              </span>
            </div>
          )}

          {failed && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
              <CircleAlert
                aria-hidden="true"
                size={14}
                className="mt-0.5 shrink-0"
              />

              <span>
                Video generation or
                rendering failed.
                Open it for details.
              </span>
            </div>
          )}

          {publication && (
            <PublicationSummary
              publication={
                publication
              }
            />
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Footer                                                       */}
        {/* ------------------------------------------------------------ */}

        <div className="mt-4 border-t border-zinc-100 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400">
              Updated{" "}
              {formatRelativeDate(
                video.updatedAt,
              )}
            </span>

            {history.length > 1 && (
              <Link
                href="/publishing"
                className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
              >
                {history.length} publish
                attempts
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={`/videos/${video.id}`}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                needsReview
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Play
                aria-hidden="true"
                size={14}
              />

              {needsReview
                ? "Review video"
                : "View video"}
            </Link>

            {[
              "review",
              "approved",
              "published",
            ].includes(
              video.status,
            ) && (
              <VideoDetailActions
                videoId={video.id}
                status={video.status}
                title={video.title}
                rendered={
                  video.rendered
                }
                publishing={
                  publishing
                    ? {
                        accounts:
                          publishing.accounts,
                        rows:
                          history,
                      }
                    : null
                }
              />
            )}

            {video.status ===
              "published" && (
              <Link
                href="/publishing"
                className="inline-flex min-h-9 items-center justify-center text-xs font-semibold text-zinc-500 transition hover:text-zinc-950"
              >
                View publishing history
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*                           PUBLICATION SUMMARY                              */
/* -------------------------------------------------------------------------- */

function PublicationSummary({
  publication,
}: {
  publication:
    VideoPublishingData["rows"][number];
}) {
  const platform =
    publication.platform ===
    "facebook"
      ? "Facebook"
      : "Instagram";

  return (
    <Link
      href="/publishing"
      className="mt-4 block rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition hover:border-zinc-200 hover:bg-zinc-100/70"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Publishing
        </span>

        <StatusBadge
          status={
            publication.status
          }
        />
      </div>

      <p className="mt-2 truncate text-xs font-medium text-zinc-700">
        {platform}
        {" · "}
        {publication.destination}
      </p>

      {publication.mock && (
        <p className="mt-1 text-[11px] font-semibold text-amber-700">
          Test / Mock publishing
        </p>
      )}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                             SUMMARY FILTER                                 */
/* -------------------------------------------------------------------------- */

function SummaryFilter({
  label,
  value,
  icon: Icon = Clapperboard,
  active,
  danger = false,
  onClick,
}: {
  label: string;
  value: number;
  icon?: typeof Clapperboard;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group rounded-xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
        active
          ? "border-zinc-900 bg-zinc-950 text-white"
          : danger
            ? "border-red-200 bg-red-50 hover:border-red-300"
            : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-xs font-medium ${
            active
              ? "text-zinc-300"
              : danger
                ? "text-red-700"
                : "text-zinc-500"
          }`}
        >
          {label}
        </span>

        <Icon
          aria-hidden="true"
          size={14}
          className={
            active
              ? "text-zinc-300"
              : danger
                ? "text-red-600"
                : "text-zinc-400"
          }
        />
      </div>

      <strong
        className={`mt-2 block text-2xl font-semibold tracking-tight ${
          active
            ? "text-white"
            : danger
              ? "text-red-900"
              : "text-zinc-950"
        }`}
      >
        {value}
      </strong>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 SELECT                                     */
/* -------------------------------------------------------------------------- */

function SelectFilter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  children:
    React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">
        {label}
      </span>

      <SlidersHorizontal
        aria-hidden="true"
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
      />

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="min-h-11 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-10 pr-9 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
      >
        {children}
      </select>

      <ChevronDown
        aria-hidden="true"
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*                           VIDEO PLACEHOLDER                                */
/* -------------------------------------------------------------------------- */

function VideoPreviewPlaceholder({
  status,
}: {
  status: string;
}) {
  const content =
    getPlaceholderContent(
      status,
    );

  return (
    <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-zinc-300">
        {content.icon}
      </span>

      <p className="mt-4 text-sm font-semibold text-white">
        {content.title}
      </p>

      <p className="mt-1 max-w-[190px] text-xs leading-5 text-zinc-400">
        {content.description}
      </p>
    </div>
  );
}

function getPlaceholderContent(
  status: string,
) {
  switch (status) {
    case "generating":
      return {
        icon: (
          <Sparkles
            aria-hidden="true"
            size={21}
          />
        ),
        title:
          "Generating content",
        description:
          "Your video content is being prepared.",
      };

    case "rendering":
      return {
        icon: (
          <Clock3
            aria-hidden="true"
            size={21}
          />
        ),
        title:
          "Rendering video",
        description:
          "The final video is being assembled.",
      };

    case "failed":
      return {
        icon: (
          <CircleAlert
            aria-hidden="true"
            size={21}
          />
        ),
        title: "Render failed",
        description:
          "Open this video to review what happened.",
      };

    case "rejected":
      return {
        icon: (
          <CircleAlert
            aria-hidden="true"
            size={21}
          />
        ),
        title: "Video rejected",
        description:
          "This video was not approved for publishing.",
      };

    default:
      return {
        icon: (
          <Clapperboard
            aria-hidden="true"
            size={21}
          />
        ),
        title:
          "Preview not ready",
        description:
          "The video preview will appear here when available.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/*                              EMPTY FILTER                                  */
/* -------------------------------------------------------------------------- */

function FilteredEmptyState({
  filtered,
  clearFilters,
}: {
  filtered: boolean;
  clearFilters: () => void;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200">
        <Search
          aria-hidden="true"
          size={18}
        />
      </div>

      <h2 className="mt-4 text-sm font-semibold text-zinc-950">
        {filtered
          ? "No videos match your filters"
          : "No videos available"}
      </h2>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
        {filtered
          ? "Try changing the status, campaign, or search term."
          : "Videos will appear here after campaign generation."}
      </p>

      {filtered && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <X
            aria-hidden="true"
            size={14}
          />
          Clear filters
        </button>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                HELPERS                                     */
/* -------------------------------------------------------------------------- */

function formatDuration(
  seconds: number,
): string {
  const safe = Math.max(
    0,
    Math.round(seconds),
  );

  const minutes = Math.floor(
    safe / 60,
  );

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

function formatRelativeDate(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "recently";
  }

  const difference =
    date.getTime() -
    Date.now();

  const minutes =
    Math.round(
      difference / 60_000,
    );

  if (
    Math.abs(minutes) < 60
  ) {
    if (
      Math.abs(minutes) <= 1
    ) {
      return "just now";
    }

    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      minutes,
      "minute",
    );
  }

  const hours = Math.round(
    difference / 3_600_000,
  );

  if (
    Math.abs(hours) < 24
  ) {
    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      hours,
      "hour",
    );
  }

  const days = Math.round(
    difference / 86_400_000,
  );

  if (
    Math.abs(days) < 7
  ) {
    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      days,
      "day",
    );
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
}