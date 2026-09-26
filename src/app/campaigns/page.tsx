import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
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
  searchParams: Promise<{ created?: string }>;
}) {
  const campaigns = await getCampaignRows();
  const { created } = await searchParams;

  return (
    <>
      <PageHeader
        action={
          <Link className="primary-link" href="/campaigns/new">
            <Plus aria-hidden="true" size={15} /> Create campaign
          </Link>
        }
        description="Plan and track the content campaigns your team is producing."
        title="Campaigns"
      />

      {created === "1" && (
        <div className="success-alert" role="status">
          Campaign created successfully. It is ready for the next step.
        </div>
      )}

      {campaigns === null ? (
        <ErrorState description="Campaigns couldn't be loaded. Check the database connection and try again." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          action={{ href: "/campaigns/new", label: "Create campaign" }}
          description="Create your first campaign to start producing content."
          icon={FolderKanban}
          title="No campaigns yet"
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Campaign</th>
                <th scope="col">Topic</th>
                <th scope="col">Audience</th>
                <th scope="col">Videos</th>
                <th scope="col">Style</th>
                <th scope="col">Duration</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td><span className="table-primary">{campaign.title}</span></td>
                  <td>{campaign.topic}</td>
                  <td>{campaign.audience}</td>
                  <td>{campaign.videoCount}</td>
                  <td>{campaign.style ?? "—"}</td>
                  <td>{campaign.durationMin && campaign.durationMax ? `${campaign.durationMin}–${campaign.durationMax} sec` : "—"}</td>
                  <td><StatusBadge status={campaign.status} /></td>
                  <td>{formatDate(campaign.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}