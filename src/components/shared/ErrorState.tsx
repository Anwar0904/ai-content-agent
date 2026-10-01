"use client";

import {
  CircleAlert,
  RotateCw,
} from "lucide-react";
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
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <CircleAlert
          aria-hidden="true"
          size={19}
        />
      </div>

      <h2 className="mt-4 text-base font-semibold text-red-950">
        {title}
      </h2>

      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-red-700">
        {description}
      </p>

      <button
        type="button"
        onClick={() =>
          router.refresh()
        }
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-100"
      >
        <RotateCw
          aria-hidden="true"
          size={14}
        />
        Try again
      </button>
    </section>
  );
}