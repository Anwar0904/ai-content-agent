"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Filter,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import {FaFacebook,FaInstagram} from 'react-icons/fa'
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  VideoPublishAction,
} from "@/components/videos/VideoPublishAction";

import type {
  PublishingWorkspaceData,
  PublishingRow,
  PublishingVideo,
} from "@/services/publishing/workspaceData";

type ActivityFilter =
  | "all"
  | "active"
  | "published"
  | "failed";

export function PublishingWorkspace({
  data,
}: {
  data:
    | PublishingWorkspaceData
    | null;
}) {
  const [search, setSearch] =
    useState("");

  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<ActivityFilter>(
      "all",
    );

  if (!data) {
    return (
      <PublishingError />
    );
  }

  const {
    videos,
    accounts,
    rows,
  } = data;

  const readyVideos =
    videos.filter(
      (video) =>
        video.status ===
          "approved" &&
        video.rendered,
    );

  const republishableVideos =
    videos.filter(
      (video) =>
        video.status ===
          "published" &&
        video.rendered,
    );

  const activeRows =
    rows.filter(
      (row) =>
        row.status ===
          "queued" ||
        row.status ===
          "processing",
    );

  const publishedRows =
    rows.filter(
      (row) =>
        row.status ===
        "published",
    );

  const failedRows =
    rows.filter(
      (row) =>
        row.status ===
        "failed",
    );

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const visibleRows =
    useMemo(() => {
      return rows.filter(
        (row) => {
          const matchesFilter =
            activityFilter ===
              "all"
              ? true
              : activityFilter ===
                  "active"
                ? row.status ===
                    "queued" ||
                  row.status ===
                    "processing"
                : row.status ===
                  activityFilter;

          const matchesSearch =
            !normalizedSearch ||
            [
              row.title,
              row.destination,
              row.platform,
              row.status,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          return (
            matchesFilter &&
            matchesSearch
          );
        },
      );
    }, [
      rows,
      activityFilter,
      normalizedSearch,
    ]);

  return (
    <div className="space-y-7">
      {/* -------------------------------------------------------------- */}
      {/* Overview                                                      */}
      {/* -------------------------------------------------------------- */}

      <section
        aria-label="Publishing overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <MetricCard
          icon={Send}
          label="Ready to publish"
          value={
            readyVideos.length
          }
          note="Approved videos"
        />

        <MetricCard
          icon={Clock3}
          label="In progress"
          value={
            activeRows.length
          }
          note="Queued or publishing"
          emphasis={
            activeRows.length > 0
          }
        />

        <MetricCard
          icon={CheckCircle2}
          label="Published"
          value={
            publishedRows.length
          }
          note="Successful deliveries"
        />

        <MetricCard
          icon={CircleAlert}
          label="Failed"
          value={
            failedRows.length
          }
          note="Needs attention"
          danger={
            failedRows.length > 0
          }
        />
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Accounts                                                      */}
      {/* -------------------------------------------------------------- */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Destinations
            </p>

            <h2 className="mt-1 text-base font-semibold text-zinc-950">
              Connected accounts
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              These accounts are available for publishing.
            </p>
          </div>

          <Link
            href="/social-accounts"
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Manage accounts
          </Link>
        </div>

        {accounts.length >
        0 ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {accounts.map(
              (account) => (
                <AccountChip
                  key={
                    account.id
                  }
                  platform={
                    account.platform
                  }
                  name={
                    account.name
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
            <p className="text-sm font-semibold text-zinc-900">
              No publishing accounts connected
            </p>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Connect a Facebook or Instagram destination before trying to publish.
            </p>

            <Link
              href="/social-accounts"
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Connect account
            </Link>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Active publishing                                             */}
      {/* -------------------------------------------------------------- */}

      {activeRows.length >
        0 && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={18}
              />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-blue-950">
                {activeRows.length}{" "}
                {activeRows.length ===
                1
                  ? "publication is"
                  : "publications are"}{" "}
                in progress
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                The worker is processing these publishing jobs. Their status will update when you refresh or revisit this page.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {activeRows
              .slice(0, 4)
              .map((row) => (
                <PublishingMiniRow
                  key={
                    row.id
                  }
                  row={row}
                />
              ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Ready to publish                                              */}
      {/* -------------------------------------------------------------- */}

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Ready
            </p>

            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              Ready to publish
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Approved videos that can be sent to a connected destination.
            </p>
          </div>

          <span className="text-sm font-medium text-zinc-500">
            {
              readyVideos.length
            }{" "}
            {readyVideos.length ===
            1
              ? "video"
              : "videos"}
          </span>
        </div>

        {readyVideos.length >
        0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {readyVideos.map(
              (video) => (
                <PublishVideoCard
                  key={
                    video.id
                  }
                  video={
                    video
                  }
                  rows={rows}
                  accounts={
                    accounts
                  }
                />
              ),
            )}
          </div>
        ) : (
          <EmptyPublishingState
            title="No videos are waiting to be published"
            description="Approve a rendered video first. It will appear here automatically."
          />
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Republish                                                     */}
      {/* -------------------------------------------------------------- */}

      {republishableVideos.length >
        0 && (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Reuse
              </p>

              <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                Publish again
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Previously published videos can be sent again without removing their earlier history.
              </p>
            </div>

            <span className="text-sm font-medium text-zinc-500">
              {
                republishableVideos.length
              }{" "}
              available
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {republishableVideos
              .slice(0, 6)
              .map((video) => (
                <PublishVideoCard
                  key={
                    video.id
                  }
                  video={
                    video
                  }
                  rows={rows}
                  accounts={
                    accounts
                  }
                />
              ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Activity                                                      */}
      {/* -------------------------------------------------------------- */}

      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
            History
          </p>

          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            Publishing activity
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Every first publication and republishing attempt is preserved here.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto]">
            <label className="relative block">
              <span className="sr-only">
                Search publishing activity
              </span>

              <Search
                aria-hidden="true"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Search video, account, or platform..."
                className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">
                Filter activity
              </span>

              <Filter
                aria-hidden="true"
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <select
                value={
                  activityFilter
                }
                onChange={(
                  event,
                ) =>
                  setActivityFilter(
                    event
                      .target
                      .value as ActivityFilter,
                  )
                }
                className="min-h-11 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-10 pr-9 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="all">
                  All activity
                </option>

                <option value="active">
                  In progress
                </option>

                <option value="published">
                  Published
                </option>

                <option value="failed">
                  Failed
                </option>
              </select>

              <ChevronDown
                aria-hidden="true"
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </label>

            {(search ||
              activityFilter !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActivityFilter(
                    "all",
                  );
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
              >
                <X
                  aria-hidden="true"
                  size={15}
                />
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Showing{" "}
            {
              visibleRows.length
            }{" "}
            of {rows.length} attempts
          </div>
        </div>

        {visibleRows.length >
        0 ? (
          <div className="space-y-3">
            {visibleRows.map(
              (row) => (
                <PublishingActivityCard
                  key={
                    row.id
                  }
                  row={row}
                />
              ),
            )}
          </div>
        ) : (
          <EmptyPublishingState
            title="No publishing activity matches"
            description="Try changing your search or filter."
          />
        )}
      </section>
    </div>
  );
}

/* ========================================================================== */
/* VIDEO CARD                                                                 */
/* ========================================================================== */

function PublishVideoCard({
  video,
  rows,
  accounts,
}: {
  video: PublishingVideo;

  rows: PublishingRow[];

  accounts:
    PublishingWorkspaceData["accounts"];
}) {
  const videoRows =
    rows.filter(
      (row) =>
        row.videoId ===
        video.id,
    );

  const successfulCount =
    videoRows.filter(
      (row) =>
        row.status ===
        "published",
    ).length;

  const active =
    videoRows.some(
      (row) =>
        row.status ===
          "queued" ||
        row.status ===
          "processing",
    );

  const isRepublish =
    video.status ===
      "published" ||
    successfulCount > 0;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          {isRepublish ? (
            <RefreshCw
              aria-hidden="true"
              size={17}
            />
          ) : (
            <Send
              aria-hidden="true"
              size={17}
            />
          )}
        </span>

        <StatusBadge
          status={
            video.status
          }
        />
      </div>

      <div className="mt-4 flex-1">
        <Link
          href={`/videos/${video.id}`}
          className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950 transition hover:text-zinc-700"
        >
          {video.title}
        </Link>

        {video.campaignId && (
          <Link
            href={`/campaigns/${video.campaignId}`}
            className="mt-1.5 block truncate text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            {video.campaign}
          </Link>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {video.duration >
            0 && (
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
              {formatDuration(
                video.duration,
              )}
            </span>
          )}

          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            Rendered
          </span>

          {successfulCount >
            0 && (
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
              Published{" "}
              {
                successfulCount
              }{" "}
              {successfulCount ===
              1
                ? "time"
                : "times"}
            </span>
          )}
        </div>

        {active && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">
            <LoaderCircle
              aria-hidden="true"
              size={14}
              className="mt-0.5 shrink-0 animate-spin"
            />

            A publishing attempt is already in progress.
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <VideoPublishAction
          videoId={video.id}
          title={video.title}
          rendered={
            video.rendered
          }
          mode={
            isRepublish
              ? "republish"
              : "publish"
          }
          publishing={{
            accounts,
            rows:
              videoRows,
          }}
        />

        <Link
          href={`/videos/${video.id}`}
          className="mt-2 inline-flex min-h-9 w-full items-center justify-center text-xs font-semibold text-zinc-500 transition hover:text-zinc-950"
        >
          View video
        </Link>
      </div>
    </article>
  );
}

/* ========================================================================== */
/* ACTIVITY                                                                   */
/* ========================================================================== */

function PublishingActivityCard({
  row,
}: {
  row: PublishingRow;
}) {
  const PlatformIcon =
    row.platform ===
    "facebook"
      ? FaFacebook
      : FaInstagram;

  const active =
    row.status ===
      "queued" ||
    row.status ===
      "processing";

  const failed =
    row.status ===
    "failed";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
        failed
          ? "border-red-200"
          : active
            ? "border-blue-200"
            : "border-zinc-200"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              row.platform ===
              "facebook"
                ? "bg-blue-50 text-blue-700"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            <PlatformIcon
              aria-hidden="true"
              size={17}
            />
          </span>

          <div className="min-w-0">
            <Link
              href={`/videos/${row.videoId}`}
              className="line-clamp-1 text-sm font-semibold text-zinc-950 transition hover:text-zinc-700"
            >
              {row.title}
            </Link>

            <p className="mt-1 truncate text-xs text-zinc-500">
              {platformLabel(
                row.platform,
              )}
              {" · "}
              {row.destination}
            </p>

            <p className="mt-1 text-[11px] text-zinc-400">
              {row.publishedAt
                ? `Published ${formatActivityDate(
                    row.publishedAt,
                  )}`
                : `Started ${formatActivityDate(
                    row.createdAt,
                  )}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.mock && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Test
            </span>
          )}

          <StatusBadge
            status={
              row.status
            }
          />
        </div>
      </div>

      {row.error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
          <AlertTriangle
            aria-hidden="true"
            size={14}
            className="mt-0.5 shrink-0"
          />

          <span>
            {row.error}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
        <Link
          href={`/videos/${row.videoId}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          View video
        </Link>

        {row.externalPostId && (
          <span className="inline-flex min-h-9 items-center rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
            Post ID:{" "}
            {truncateIdentifier(
              row.externalPostId,
            )}
          </span>
        )}
      </div>
    </article>
  );
}

function PublishingMiniRow({
  row,
}: {
  row: PublishingRow;
}) {
  return (
    <Link
      href={`/videos/${row.videoId}`}
      className="flex items-center justify-between gap-4 rounded-lg bg-white/70 px-3 py-2.5 transition hover:bg-white"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-blue-950">
          {row.title}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-blue-700">
          {platformLabel(
            row.platform,
          )}
          {" · "}
          {row.destination}
        </p>
      </div>

      <StatusBadge
        status={row.status}
      />
    </Link>
  );
}

/* ========================================================================== */
/* METRICS                                                                    */
/* ========================================================================== */

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  danger = false,
  emphasis = false,
}: {
  icon: typeof Send;
  label: string;
  value: number;
  note: string;
  danger?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        danger
          ? "border-red-200 bg-red-50"
          : emphasis
            ? "border-blue-200 bg-blue-50"
            : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`text-xs font-medium ${
            danger
              ? "text-red-700"
              : emphasis
                ? "text-blue-700"
                : "text-zinc-500"
          }`}
        >
          {label}
        </span>

        <Icon
          aria-hidden="true"
          size={15}
          className={
            danger
              ? "text-red-600"
              : emphasis
                ? "text-blue-600"
                : "text-zinc-400"
          }
        />
      </div>

      <strong
        className={`mt-3 block text-3xl font-semibold tracking-tight ${
          danger
            ? "text-red-950"
            : emphasis
              ? "text-blue-950"
              : "text-zinc-950"
        }`}
      >
        {value}
      </strong>

      <p
        className={`mt-1 text-xs ${
          danger
            ? "text-red-600"
            : emphasis
              ? "text-blue-600"
              : "text-zinc-500"
        }`}
      >
        {note}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* ACCOUNT CHIP                                                               */
/* ========================================================================== */

function AccountChip({
  platform,
  name,
}: {
  platform: string;
  name: string;
}) {
  const Icon =
    platform ===
    "facebook"
      ? FaFacebook
      : FaInstagram;

  return (
    <div className="inline-flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
        <Icon
          aria-hidden="true"
          size={15}
        />
      </span>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-900">
          {name}
        </p>

        <p className="mt-0.5 text-[11px] capitalize text-zinc-500">
          {platform}
          {" · Connected"}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* EMPTY / ERROR                                                              */
/* ========================================================================== */

function EmptyPublishingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200">
        <Share2
          aria-hidden="true"
          size={18}
        />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-zinc-950">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function PublishingError() {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <CircleAlert
          aria-hidden="true"
          size={19}
        />
      </div>

      <h2 className="mt-4 text-base font-semibold text-red-950">
        Publishing information is unavailable
      </h2>

      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-red-700">
        We couldn't load publishing history or connected destinations. Try refreshing the page.
      </p>
    </section>
  );
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function formatDuration(
  seconds: number,
): string {
  const safe =
    Math.max(
      0,
      Math.round(seconds),
    );

  const minutes =
    Math.floor(
      safe / 60,
    );

  return `${minutes}:${String(
    safe % 60,
  ).padStart(2, "0")}`;
}

function platformLabel(
  platform: string,
): string {
  switch (
    platform.toLowerCase()
  ) {
    case "facebook":
      return "Facebook";

    case "instagram":
      return "Instagram";

    default:
      return platform
        .replaceAll(
          "_",
          " ",
        )
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase(),
        );
  }
}

function formatActivityDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "recently";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function truncateIdentifier(
  value: string,
): string {
  if (
    value.length <= 18
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}…${value.slice(-6)}`;
}