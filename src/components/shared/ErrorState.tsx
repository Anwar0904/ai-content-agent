"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function ErrorState({
  title = "Information is unavailable",
  description = "We couldn't load this information right now. Please try again.",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();

  return (
    <div className="empty-panel" role="status">
      <span className="empty-icon"><CircleAlert aria-hidden="true" size={18} /></span>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-description">{description}</p>
      <button className="secondary-link empty-action" onClick={() => router.refresh()} type="button">
        <RotateCw aria-hidden="true" size={14} /> Try again
      </button>
    </div>
  );
}