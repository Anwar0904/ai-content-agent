const progressStatuses = new Set(["generating", "rendering", "processing", "queued"]);
const successStatuses = new Set(["ready", "approved", "published", "completed", "connected"]);
const dangerStatuses = new Set(["failed", "rejected", "expired"]);

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = dangerStatuses.has(normalized)
    ? "status-danger"
    : successStatuses.has(normalized)
      ? "status-success"
      : progressStatuses.has(normalized) || normalized === "review"
        ? "status-progress"
        : "status-neutral";

  return (
    <span className={`status-badge ${tone}`}>
      <span aria-hidden="true" className="status-dot" />
      {status.replaceAll("_", " ")}
    </span>
  );
}