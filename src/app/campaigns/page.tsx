import {
  FolderKanban,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { CampaignActions } from "@/components/campaigns/CampaignActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatDate";
import { getCampaignRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
  }>;
}) {
  const campaigns = await getCampaignRows();
  const { created } = await searchParams;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Content"
        title="Campaigns"
        description="Create campaigns, generate video ideas, and follow each campaign from concept to review."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" size={16} />
            New campaign
          </Link>
        }
      />

      {created === "1" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Sparkles aria-hidden="true" size={16} />
          </div>

          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Campaign created
            </p>

            <p className="mt-0.5 text-sm text-emerald-800">
              Your campaign is ready. You can now generate its videos.
            </p>
          </div>
        </div>
      )}

      {campaigns === null ? (
        <ErrorState description="We couldn't load your campaigns. Check the database connection and try again." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          action={{
            href: "/campaigns/new",
            label: "Create your first campaign",
          }}
          description="Start with a topic and audience. We'll help turn it into a set of videos you can review and publish."
          icon={FolderKanban}
          title="No campaigns yet"
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              {campaigns.length}{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </p>

            <Link
              href="/campaigns/new"
              className="hidden text-sm font-semibold text-zinc-700 transition hover:text-zinc-950 sm:inline-flex"
            >
              Create another campaign
            </Link>
          </div>

          <section
            aria-label="Campaign list"
            className="grid gap-4 xl:grid-cols-2"
          >
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="group flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex-1 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="group/title inline-flex max-w-full items-center"
                      >
                        <h2 className="truncate text-base font-semibold text-zinc-950 transition group-hover/title:text-zinc-700 sm:text-lg">
                          {campaign.title}
                        </h2>
                      </Link>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {campaign.topic}
                      </p>
                    </div>

                    <StatusBadge status={campaign.status} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                    <CampaignFact
                      label="Audience"
                      value={campaign.audience}
                    />

                    <CampaignFact
                      label="Videos"
                      value={`${campaign.videoCount}`}
                    />

                    <CampaignFact
                      label="Style"
                      value={campaign.style ?? "Not set"}
                    />

                    <CampaignFact
                      label="Duration"
                      value={
                        campaign.durationMin && campaign.durationMax
                          ? `${campaign.durationMin}–${campaign.durationMax}s`
                          : "Not set"
                      }
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                    <span>
                      Created {formatDate(campaign.createdAt)}
                    </span>

                    {campaign.actualVideoCount !== undefined && (
                      <>
                        <span
                          aria-hidden="true"
                          className="size-1 rounded-full bg-zinc-300"
                        />

                        <span>
                          {campaign.actualVideoCount} of{" "}
                          {campaign.videoCount} videos created
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  >
                    View campaign
                  </Link>

                  <CampaignActions
                    campaignId={campaign.id}
                    campaignStatus={campaign.status}
                    videoCount={campaign.videoCount}
                    actualVideoCount={campaign.actualVideoCount ?? 0}
                  />
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function CampaignFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>

      <dd
        className="mt-1 truncate text-sm font-medium text-zinc-800"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}