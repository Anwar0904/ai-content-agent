const progressStatuses = new Set([
  "generating",
  "rendering",
  "processing",
  "queued",
]);

const successStatuses = new Set([
  "ready",
  "approved",
  "published",
  "completed",
  "connected",
]);

const dangerStatuses = new Set([
  "failed",
  "rejected",
  "expired",
  "reauthorization_required",
]);

const statusLabels: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  rendering: "Rendering",
  review: "Ready for review",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  failed: "Failed",
  queued: "Queued",
  processing: "Publishing",
  connected: "Connected",
  expired: "Reauthorization required",
  reauthorization_required: "Reauthorization required",
  disconnected: "Disconnected",
  ready: "Ready",
  completed: "Completed",
};

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status?.toLowerCase().trim() || "unknown";

  const label =
    statusLabels[normalized] ??
    normalized
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );

  const tone = dangerStatuses.has(normalized)
    ? "border-red-200 bg-red-50 text-red-700"
    : successStatuses.has(normalized)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : progressStatuses.has(normalized) ||
          normalized === "review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-600";

  const dotTone = dangerStatuses.has(normalized)
    ? "bg-red-500"
    : successStatuses.has(normalized)
      ? "bg-emerald-500"
      : progressStatuses.has(normalized) ||
          normalized === "review"
        ? "bg-amber-500"
        : "bg-zinc-400";

  const shouldPulse =
    normalized === "generating" ||
    normalized === "rendering" ||
    normalized === "processing";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <span className="relative flex size-2 shrink-0">
        {shouldPulse && (
          <span
            aria-hidden="true"
            className={`absolute inline-flex size-full animate-ping rounded-full opacity-40 ${dotTone}`}
          />
        )}

        <span
          aria-hidden="true"
          className={`relative inline-flex size-2 rounded-full ${dotTone}`}
        />
      </span>

      <span className="truncate">
        {label}
      </span>
    </span>
  );
}