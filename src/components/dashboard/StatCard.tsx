import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
  href?: string;
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  href,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-zinc-600">
          {label}
        </span>

        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition group-hover:bg-zinc-200/70">
          <Icon
            aria-hidden="true"
            size={17}
            strokeWidth={1.8}
          />
        </span>
      </div>

      <div className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950">
        {value}
      </div>

      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
        {note}
      </p>
    </>
  );

  if (!href) {
    return (
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`View ${label.toLowerCase()}`}
      className="group block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}