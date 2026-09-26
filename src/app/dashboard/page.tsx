import {
  BadgeCheck,
  Clapperboard,
  FolderKanban,
  Plus,
  Send,
  Share2,
  ArrowRight,
  Database,
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
      note: data ? "All campaigns" : "Database unavailable",
      icon: FolderKanban,
    },
    {
      label: "Videos",
      value: data?.stats.videos ?? "—",
      note: data ? "Across all campaigns" : "Database unavailable",
      icon: Clapperboard,
    },
    {
      label: "Ready for review",
      value: data?.stats.ready ?? "—",
      note: data ? "In review or approved" : "Database unavailable",
      icon: BadgeCheck,
    },
    {
      label: "Published",
      value: data?.stats.published ?? "—",
      note: data ? "Completed publish jobs" : "Database unavailable",
      icon: Send,
    },
  ];

  return (
    <>
      <PageHeader
        action={
          <Link className="primary-link" href="/campaigns/new">
            <Plus aria-hidden="true" size={15} /> Create campaign
          </Link>
        }
        description="Manage campaigns, review content, and monitor publishing activity."
        title="Dashboard"
      />

      <section aria-label="Workspace overview" className="stat-grid">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      {!data && (
        <div className="database-note" role="status">
          <Database aria-hidden="true" size={15} />
          <span>Live totals are unavailable. Check the database connection to load workspace data.</span>
        </div>
      )}

      <div className="dashboard-columns">
        <section aria-labelledby="activity-heading" className="panel">
          <div className="panel-header">
            <h2 className="section-heading" id="activity-heading">Recent activity</h2>
            <span className="section-caption">Latest updates</span>
          </div>
          {data ? (
            <RecentActivity items={data.activity} />
          ) : (
            <div className="activity-empty">
              <div className="empty-icon"><Database aria-hidden="true" size={17} /></div>
              <h3 className="empty-title">Activity is unavailable</h3>
              <p className="empty-description">Recent updates will appear when the database is connected.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="quick-actions-heading" className="panel">
          <div className="panel-header">
            <h2 className="section-heading" id="quick-actions-heading">Quick actions</h2>
          </div>
          <div className="quick-actions">
            <Link className="quick-action" href="/campaigns/new">
              <span className="quick-action-leading">
                <Plus aria-hidden="true" className="quick-action-icon" size={15} />
                Create campaign
              </span>
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
            <Link className="quick-action" href="/videos">
              <span className="quick-action-leading">
                <Clapperboard aria-hidden="true" className="quick-action-icon" size={15} />
                Review videos
              </span>
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
            <Link className="quick-action" href="/social-accounts">
              <span className="quick-action-leading">
                <Share2 aria-hidden="true" className="quick-action-icon" size={15} />
                Manage social accounts
              </span>
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}