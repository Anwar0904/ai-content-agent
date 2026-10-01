"use client";

import {
  CircleAlert,
  LoaderCircle,
  Repeat2,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface VideoPublishingRow {
  id: string;
  jobId?: string;

  videoId: string;
  accountId: string;

  title: string;
  destination: string;
  platform: string;

  mock: boolean;
  status: string;

  createdAt: string;
  publishedAt?: string;

  externalPostId?: string;
  error?: string;
}

export interface VideoPublishingAccount {
  id: string;
  name: string;
  accountId: string;
  platform: string;
  status: string;
}

export interface VideoPublishingData {
  accounts: VideoPublishingAccount[];
  rows: VideoPublishingRow[];
}

export function VideoPublishAction({
  videoId,
  title,
  rendered,
  publishing,
  mode = "publish",
}: {
  videoId: string;
  title: string;
  rendered: boolean;
  publishing: VideoPublishingData | null;
  mode?: "publish" | "republish";
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const previousPublications = useMemo(
    () =>
      publishing?.rows.filter(
        (row) => row.status === "published",
      ) ?? [],
    [publishing],
  );

  const hasPublishedBefore =
    previousPublications.length > 0;

  const isRepublish =
    mode === "republish" ||
    hasPublishedBefore;

  const activePublishingRows = useMemo(
    () =>
      publishing?.rows.filter(
        (row) =>
          row.status === "queued" ||
          row.status === "processing",
      ) ?? [],
    [publishing],
  );

  const availableAccounts =
    publishing?.accounts.filter(
      (account) =>
        account.status === "connected",
    ) ?? [];

  function accountHasActivePublish(
    accountId: string,
  ) {
    return activePublishingRows.some(
      (row) => row.accountId === accountId,
    );
  }

  async function submitPublish() {
    if (
      !selectedAccountId ||
      isSubmitting
    ) {
      return;
    }

    if (
      accountHasActivePublish(
        selectedAccountId,
      )
    ) {
      setError(
        "This video is already being published to the selected account.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/videos/${videoId}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            socialAccountId:
              selectedAccountId,
          }),
        },
      );

      const result =
        (await response.json()) as {
          error?: {
            message?: string;
          };
        };

      if (!response.ok) {
        setError(
          result.error?.message ??
            `The video could not be ${
              isRepublish
                ? "republished"
                : "published"
            }.`,
        );
        return;
      }

      setOpen(false);
      setSelectedAccountId("");
      router.refresh();
    } catch {
      setError(
        `The video could not be ${
          isRepublish
            ? "republished"
            : "published"
        }. Check your connection and try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!rendered) {
    return null;
  }

  if (publishing === null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
        Publishing destinations are unavailable right now.
      </div>
    );
  }

  if (availableAccounts.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-medium text-zinc-700">
          No connected publishing account is available.
        </p>

        <a
          href="/social-accounts"
          className="mt-2 inline-flex text-xs font-semibold text-zinc-900 hover:underline"
        >
          Manage social accounts
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
      >
        {isRepublish ? (
          <>
            <Repeat2
              aria-hidden="true"
              size={15}
            />
            Republish video
          </>
        ) : (
          <>
            <Send
              aria-hidden="true"
              size={15}
            />
            Publish video
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-dialog-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        >
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2
                  id="publish-dialog-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  {isRepublish
                    ? "Republish video"
                    : "Publish video"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {isRepublish
                    ? "This creates a new social post. Previous publication history will remain unchanged."
                    : "Choose where you want to publish this video."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close publishing dialog"
                disabled={isSubmitting}
                onClick={() =>
                  setOpen(false)
                }
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X
                  aria-hidden="true"
                  size={17}
                />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Video
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {title}
                </p>
              </div>

              {previousPublications.length >
                0 && (
                <section className="rounded-xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Previously published
                  </p>

                  <div className="mt-3 space-y-3">
                    {previousPublications
                      .slice(0, 3)
                      .map((row) => (
                        <div
                          key={row.id}
                          className="flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-zinc-800">
                              {row.platform ===
                              "facebook"
                                ? "Facebook"
                                : "Instagram"}
                              {" · "}
                              {
                                row.destination
                              }
                            </p>

                            {row.publishedAt && (
                              <p className="mt-0.5 text-[11px] text-zinc-400">
                                {new Intl.DateTimeFormat(
                                  "en",
                                  {
                                    month:
                                      "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                ).format(
                                  new Date(
                                    row.publishedAt,
                                  ),
                                )}
                              </p>
                            )}
                          </div>

                          {row.mock && (
                            <span className="shrink-0 text-[10px] font-semibold text-amber-700">
                              TEST
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}

              <fieldset>
                <legend className="text-sm font-semibold text-zinc-900">
                  Destination
                </legend>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Select a connected account for this publishing attempt.
                </p>

                <div className="mt-3 space-y-2">
                  {availableAccounts.map(
                    (account) => {
                      const busy =
                        accountHasActivePublish(
                          account.id,
                        );

                      const selected =
                        selectedAccountId ===
                        account.id;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          disabled={
                            busy ||
                            isSubmitting
                          }
                          onClick={() =>
                            setSelectedAccountId(
                              account.id,
                            )
                          }
                          className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900">
                              {account.platform ===
                              "facebook"
                                ? "Facebook"
                                : "Instagram"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              {
                                account.name
                              }
                            </p>

                            {busy && (
                              <p className="mt-1 text-[11px] font-medium text-amber-700">
                                Publishing already in progress
                              </p>
                            )}
                          </div>

                          <span
                            aria-hidden="true"
                            className={`size-4 shrink-0 rounded-full border ${
                              selected
                                ? "border-[5px] border-zinc-900"
                                : "border-zinc-300"
                            }`}
                          />
                        </button>
                      );
                    },
                  )}
                </div>
              </fieldset>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                    size={14}
                  />

                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  setOpen(false)
                }
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !selectedAccountId ||
                  isSubmitting
                }
                onClick={
                  submitPublish
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin"
                      size={15}
                    />

                    {isRepublish
                      ? "Republishing..."
                      : "Publishing..."}
                  </>
                ) : isRepublish ? (
                  <>
                    <Repeat2
                      aria-hidden="true"
                      size={15}
                    />
                    Republish
                  </>
                ) : (
                  <>
                    <Send
                      aria-hidden="true"
                      size={15}
                    />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}