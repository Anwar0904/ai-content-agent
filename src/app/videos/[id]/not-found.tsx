import {
  ArrowLeft,
  Clapperboard,
} from "lucide-react";
import Link from "next/link";

export default function VideoNotFound() {
  return (
    <section
      role="status"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <Clapperboard
          aria-hidden="true"
          size={24}
        />
      </div>

      <h1 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950">
        Video not found
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        This video may have been removed, or the link may no longer be valid.
      </p>

      <Link
        href="/videos"
        className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        <ArrowLeft
          aria-hidden="true"
          size={15}
        />
        Back to videos
      </Link>
    </section>
  );
}