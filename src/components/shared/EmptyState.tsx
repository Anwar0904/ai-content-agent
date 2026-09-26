import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  compact?: boolean;
}) {
  return (
    <div className={compact ? "activity-empty" : "empty-panel"}>
      <span className="empty-icon"><Icon aria-hidden="true" size={18} strokeWidth={1.7} /></span>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-description">{description}</p>
      {action && (
        <Link className="primary-link empty-action" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  );
}