import { CircleCheck, Clapperboard, FolderKanban, Send } from "lucide-react";
import type { ActivityItem } from "@/services/dashboard/dashboardData";
import { EmptyState } from "@/components/shared/EmptyState";

const activityIcons = {
  campaign: FolderKanban,
  video: Clapperboard,
  publishing: Send,
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        description="Your campaign and publishing activity will appear here."
        icon={CircleCheck}
        title="No recent activity"
      />
    );
  }

  return (
    <div className="activity-list">
      {items.map((item) => {
        const Icon = activityIcons[item.kind];
        return (
          <article className="activity-row" key={`${item.kind}-${item.id}`}>
            <span className="activity-marker"><Icon aria-hidden="true" size={13} /></span>
            <div>
              <div className="activity-label">{item.label}</div>
              <div className="activity-detail">{item.detail}</div>
            </div>
            <time className="activity-time" dateTime={item.createdAt.toISOString()}>
              {formatDate(item.createdAt)}
            </time>
          </article>
        );
      })}
    </div>
  );
}