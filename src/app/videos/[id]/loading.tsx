export default function VideoDetailLoading() {
  return (
    <div
      aria-label="Loading video details"
      role="status"
      className="animate-pulse space-y-7"
    >
      <div className="h-4 w-32 rounded bg-zinc-200" />

      <div>
        <div className="h-3 w-24 rounded bg-zinc-200" />
        <div className="mt-3 h-8 w-2/3 max-w-xl rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-full max-w-lg rounded bg-zinc-100" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="h-16 border-b border-zinc-100 p-5">
            <div className="h-4 w-32 rounded bg-zinc-200" />
          </div>

          <div className="flex min-h-[520px] items-center justify-center bg-zinc-950 p-6">
            <div className="aspect-[9/16] w-full max-w-[380px] rounded-xl bg-zinc-800" />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="h-5 w-36 rounded bg-zinc-200" />
            <div className="mt-5 h-11 rounded-lg bg-zinc-200" />
            <div className="mt-3 h-11 rounded-lg bg-zinc-100" />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="h-4 w-28 rounded bg-zinc-200" />

            <div className="mt-5 space-y-4">
              <div className="h-10 rounded bg-zinc-100" />
              <div className="h-10 rounded bg-zinc-100" />
              <div className="h-10 rounded bg-zinc-100" />
            </div>
          </div>
        </div>
      </div>

      <div className="h-44 rounded-2xl border border-zinc-200 bg-zinc-100" />
      <div className="h-56 rounded-2xl border border-zinc-200 bg-zinc-100" />
    </div>
  );
}