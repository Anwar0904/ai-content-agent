import {
  ArrowUpRight,
  CircleCheck,
  Clapperboard,
  FolderKanban,
  Send,
} from "lucide-react";
import Link from "next/link";

import type { ActivityItem } from "@/services/dashboard/dashboardData";
import { EmptyState } from "@/components/shared/EmptyState";

const activityIcons = {
  campaign: FolderKanban,
  video: Clapperboard,
  publishing: Send,
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const difference = date.getTime() - now.getTime();

  const minutes = Math.round(difference / 60_000);

  if (Math.abs(minutes) < 60) {
    if (Math.abs(minutes) <= 1) {
      return "Just now";
    }

    return new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    }).format(minutes, "minute");
  }

  const hours = Math.round(difference / 3_600_000);

  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    }).format(hours, "hour");
  }

  const days = Math.round(difference / 86_400_000);

  if (Math.abs(days) < 7) {
    return new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    }).format(days, "day");
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  }).format(date);
}

export function RecentActivity({
  items,
}: {
  items: ActivityItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-10 sm:px-6">
        <EmptyState
          compact
          description="Campaign, video, and publishing updates will appear here as you work."
          icon={CircleCheck}
          title="No recent activity"
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100">
      {items.map((item) => {
        const Icon = activityIcons[item.kind];

        return (
          <Link
            key={`${item.kind}-${item.id}`}
            href={item.href}
            className="group flex items-start gap-3 px-5 py-4 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 sm:px-6"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <Icon
                aria-hidden="true"
                size={16}
                strokeWidth={1.8}
              />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {item.label}
                  </p>

                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    {item.detail}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <time
                    dateTime={item.createdAt.toISOString()}
                    title={item.createdAt.toLocaleString()}
                    className="hidden text-xs text-zinc-400 sm:block"
                  >
                    {formatRelativeDate(item.createdAt)}
                  </time>

                  <ArrowUpRight
                    aria-hidden="true"
                    size={14}
                    className="text-zinc-300 transition group-hover:text-zinc-600"
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}