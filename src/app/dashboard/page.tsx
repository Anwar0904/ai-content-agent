import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clapperboard,
  Database,
  FolderKanban,
  Plus,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { getDashboardData } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const stats = [
    {
      label: "Campaigns",
      value: data?.stats.campaigns ?? "—",
      note: data ? "Content campaigns" : "Unavailable",
      icon: FolderKanban,
      href: "/campaigns",
    },
    {
      label: "Videos",
      value: data?.stats.videos ?? "—",
      note: data ? "Generated videos" : "Unavailable",
      icon: Clapperboard,
      href: "/videos",
    },
    {
      label: "Ready for review",
      value: data?.stats.ready ?? "—",
      note: data ? "Waiting for your decision" : "Unavailable",
      icon: BadgeCheck,
      href: "/videos",
    },
    {
      label: "Published",
      value: data?.stats.published ?? "—",
      note: data ? "Successfully published" : "Unavailable",
      icon: Send,
      href: "/publishing",
    },
  ];

  const hasFailures =
    data !== null &&
    (data.attention.failedVideos > 0 ||
      data.attention.failedPublishing > 0);

  const hasReviewQueue = Boolean(data && data.stats.ready > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content workspace"
        title="Dashboard"
        description="Create content, review generated videos, and keep track of publishing from one place."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" size={16} />
            Create campaign
          </Link>
        }
      />

      {!data && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900"
        >
          <Database
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={17}
          />

          <div>
            <p className="font-semibold">Workspace data is unavailable</p>
            <p className="mt-0.5 text-amber-800">
              We couldn&apos;t load your live dashboard information. Check
              the database connection and refresh the page.
            </p>
          </div>
        </div>
      )}

      <section
        aria-label="Workspace overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {data && (hasReviewQueue || hasFailures) && (
        <section
          aria-labelledby="attention-heading"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  size={18}
                  className="text-amber-600"
                />
                <h2
                  id="attention-heading"
                  className="text-base font-semibold text-zinc-950"
                >
                  Needs your attention
                </h2>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Items that may need review or action.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {data.stats.ready > 0 && (
              <AttentionItem
                href="/videos"
                value={data.stats.ready}
                title="Videos ready for review"
                description="Watch them and approve or reject before publishing."
              />
            )}

            {data.attention.failedVideos > 0 && (
              <AttentionItem
                href="/videos"
                value={data.attention.failedVideos}
                title="Video renders failed"
                description="Open the video library to review failed renders."
                destructive
              />
            )}

            {data.attention.failedPublishing > 0 && (
              <AttentionItem
                href="/publishing"
                value={data.attention.failedPublishing}
                title="Publishing attempts failed"
                description="Review the failed delivery attempts and account state."
                destructive
              />
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section
          aria-labelledby="activity-heading"
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="activity-heading"
                className="text-base font-semibold text-zinc-950"
              >
                Recent activity
              </h2>

              <p className="mt-0.5 text-sm text-zinc-500">
                Latest updates across your workspace.
              </p>
            </div>
          </div>

          {data ? (
            <RecentActivity items={data.activity} />
          ) : (
            <div className="flex min-h-60 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                <Database aria-hidden="true" size={19} />
              </div>

              <h3 className="font-semibold text-zinc-900">
                Activity is unavailable
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
                Recent workspace activity will appear here when the database
                connection is available.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section
            aria-labelledby="quick-actions-heading"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-4">
              <h2
                id="quick-actions-heading"
                className="text-base font-semibold text-zinc-950"
              >
                Quick actions
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Jump back into your main workflow.
              </p>
            </div>

            <div className="space-y-2">
              <QuickAction
                href="/campaigns/new"
                icon={Plus}
                title="Create campaign"
                description="Generate a new batch of content."
              />

              <QuickAction
                href="/videos"
                icon={Clapperboard}
                title="Review videos"
                description="Watch, approve, or reject generated videos."
              />

              <QuickAction
                href="/social-accounts"
                icon={Share2}
                title="Social accounts"
                description="Manage your publishing destinations."
              />

              <QuickAction
                href="/publishing"
                icon={Send}
                title="Publishing"
                description="Track queued and completed posts."
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <Sparkles aria-hidden="true" size={18} />
            </div>

            <h2 className="mt-4 text-base font-semibold">
              Create your next video
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-zinc-300">
              Start with a campaign and let the content pipeline generate
              videos for review.
            </p>

            <Link
              href="/campaigns/new"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-zinc-200"
            >
              Start a campaign
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-zinc-200 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition group-hover:bg-white">
        <Icon aria-hidden="true" size={16} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900">
          {title}
        </span>

        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
          {description}
        </span>
      </span>

      <ArrowRight
        aria-hidden="true"
        size={15}
        className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700"
      />
    </Link>
  );
}

function AttentionItem({
  href,
  value,
  title,
  description,
  destructive = false,
}: {
  href: string;
  value: number;
  title: string;
  description: string;
  destructive?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            destructive
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {value}
        </span>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {description}
          </p>

          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
            View
            <ArrowRight
              aria-hidden="true"
              size={13}
              className="transition group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}