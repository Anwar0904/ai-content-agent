import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatDate";
import { getVideoRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string }>;
}) {
  const videos = await getVideoRows();
  const { generated } = await searchParams;
  const generatedCount = Number(generated ?? 0);

  return (
    <>
      <PageHeader
        description="Review video drafts and follow their progress through the content workflow."
        title="Videos"
      />
      {generatedCount > 0 && (
        <div className="success-alert" role="status">
          {generatedCount} videos generated successfully.
        </div>
      )}
      {videos === null ? (
        <ErrorState description="Videos couldn't be loaded. Check the database connection and try again." />
      ) : videos.length === 0 ? (
        <EmptyState
          action={{ href: "/campaigns/new", label: "Create campaign" }}
          description="Create a campaign to start generating your first videos."
          icon={Clapperboard}
          title="No videos yet"
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Video</th>
                <th scope="col">Campaign</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td><span className="table-primary">{video.title}</span></td>
                  <td>{video.campaign}</td>
                  <td><StatusBadge status={video.status} /></td>
                  <td>{formatDate(video.createdAt)}</td>
                  <td><span className="section-caption">Not available</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}