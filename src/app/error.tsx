"use client";

import { CircleAlert } from "lucide-react";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="empty-panel" role="alert">
      <span className="empty-icon"><CircleAlert aria-hidden="true" size={18} /></span>
      <h1 className="empty-title">Something went wrong</h1>
      <p className="empty-description">We couldn&apos;t load this information right now.</p>
      <button className="secondary-link empty-action" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}