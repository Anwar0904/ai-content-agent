import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {eyebrow}
          </p>
        )}

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-[15px]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {action}
        </div>
      )}
    </header>
  );
}