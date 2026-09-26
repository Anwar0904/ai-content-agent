import { Send } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatDate";
import { getPublishJobRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function PublishingPage() {
  const jobs = await getPublishJobRows();

  return (
    <>
      <PageHeader
        description="Monitor delivery status across your connected publishing destinations."
        title="Publishing"
      />
      {jobs === null ? (
        <ErrorState description="Publishing jobs couldn't be loaded. Check the database connection and try again." />
      ) : jobs.length === 0 ? (
        <EmptyState
          description="Approved content will appear here when you publish or schedule it."
          icon={Send}
          title="No publishing jobs yet"
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Video</th>
                <th scope="col">Destination</th>
                <th scope="col">Status</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Published</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td><span className="table-primary">{job.video}</span></td>
                  <td>{job.destination}</td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>{formatDate(job.scheduledAt)}</td>
                  <td>{formatDate(job.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}