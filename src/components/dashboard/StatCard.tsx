import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <article className="stat-card">
      <div className="stat-topline">
        <span>{label}</span>
        <span className="stat-icon"><Icon aria-hidden="true" size={15} strokeWidth={1.8} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}