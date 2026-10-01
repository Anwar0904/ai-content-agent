"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Globe2, Plus, LoaderCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PublishingRow, PublishingWorkspaceData } from "@/services/publishing/workspaceData";
import styles from "./publishing.module.css";

const active = (status: string) => status === "queued" || status === "processing";
const platformLabel = (platform: string) => platform === "facebook" ? "Facebook" : "Instagram";
const date = (value?: string) => value ? `${new Date(value).toISOString().slice(0, 19).replace("T", " ")} UTC` : "—";

export function PublishingWorkspace({ data }: { data: PublishingWorkspaceData | null }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const details = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [filter, setFilter] = useState("All");
  const [platform, setPlatform] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [facebookCheck, setFacebookCheck] = useState<{ accountIds: string; pageIds: string[]; error: string } | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [added, setAdded] = useState<PublishingRow[]>([]);
  const [updates, setUpdates] = useState<Record<string, Partial<PublishingRow>>>({});
  const rows = [...added.filter((row) => !data?.rows.some((stored) => stored.jobId === row.jobId)), ...(data?.rows ?? [])]
    .map((row) => ({ ...row, ...(row.jobId ? updates[row.jobId] : {}) }));
  const pollingIds = rows.filter((row) => row.jobId && active(row.status)).map((row) => row.jobId!).sort().join(",");
  const connectedFacebookIds = data?.accounts.filter((account) => account.platform === "facebook" && account.status === "connected" && /^\d+$/.test(account.accountId)).map((account) => account.accountId).join(",") ?? "";
  const currentFacebookCheck = facebookCheck?.accountIds === connectedFacebookIds ? facebookCheck : null;
  const facebookPageIds = currentFacebookCheck?.pageIds ?? null;
  const facebookCheckError = currentFacebookCheck?.error ?? "";

  useEffect(() => {
    if (!connectedFacebookIds) return;
    let cancelled = false;
    void fetch("/api/social-accounts/facebook/pages", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { pages?: { id: string; connected: boolean }[]; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message || "Facebook access couldn't be checked.");
        if (!cancelled) setFacebookCheck({ accountIds: connectedFacebookIds, pageIds: (body.pages ?? []).filter((page) => page.connected).map((page) => page.id), error: "" });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setFacebookCheck({ accountIds: connectedFacebookIds, pageIds: [], error: cause instanceof Error ? cause.message : "Facebook access couldn't be checked." });
      });
    return () => { cancelled = true; };
  }, [connectedFacebookIds]);

  useEffect(() => {
    if (!pollingIds) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const results = await Promise.all(pollingIds.split(",").map(async (id) => {
          const response = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok || !body.data?.job) throw new Error();
          const job = body.data.job;
          return [id, { status: job.status === "completed" ? "published" : job.status, error: job.error, externalPostId: job.result?.externalPostId, publishedAt: job.result?.publishedAt || job.completedAt }] as const;
        }));
        if (cancelled) return;
        setUpdates((current) => ({ ...current, ...Object.fromEntries(results) }));
        if (results.some(([, job]) => !active(job.status))) router.refresh();
        if (results.some(([, job]) => active(job.status))) timer = setTimeout(() => void poll(), 2500);
      } catch {
        if (!cancelled) setError("Live status is unavailable. Refresh status to check before publishing again.");
      }
    }
    timer = setTimeout(() => void poll(), 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pollingIds, router]);

  const accounts = data?.accounts.filter((account) => account.status === "connected" && (account.platform !== "facebook" || facebookPageIds?.includes(account.accountId))) ?? [];
  const video = data?.videos.find((item) => item.id === videoId);
  const account = accounts.find((item) => item.id === accountId);
  const matching = rows.filter((row) => row.videoId === videoId && row.accountId === accountId);
  const duplicate = matching.some((row) => active(row.status)) ? "Publishing already in progress" : matching.some((row) => row.status === "published") ? "Already published to this destination. A second publication is disabled." : "";
  const shown = rows.filter((row) => (platform === "all" || row.platform === platform) && (filter === "All" || (filter === "In progress" ? active(row.status) : row.status === filter.toLowerCase())));
  const detail = rows.find((row) => row.id === selectedRow);

  function openPublish() {
    setVideoId(data?.videos[0]?.id ?? "");
    setAccountId(accounts[0]?.id ?? "");
    setError("");
    dialog.current?.showModal();
  }

  async function publish() {
    if (submitting.current || uncertain || !video || !account || duplicate) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/videos/${video.id}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialAccountId: account.id }),
      });
      const body = await response.json();
      if (!response.ok || !body.data?.job) {
        if (response.status >= 500 || response.ok) setUncertain(true);
        setError(response.status >= 500 ? "The request could not be confirmed. Check publishing history before trying again." : body.error?.message || "Publishing could not be confirmed. Check publishing history.");
        return;
      }
      const job = body.data.job;
      setAdded((current) => [{ id: job.id, jobId: job.id, videoId: video.id, accountId: account.id, title: video.title, destination: account.name, platform: account.platform, mock: account.platform === "instagram", status: job.status === "completed" ? "published" : job.status, createdAt: job.createdAt || new Date().toISOString() }, ...current.filter((row) => row.jobId !== job.id)]);
      setMessage("Publishing request received. Delivery status will update here.");
      dialog.current?.close();
      router.refresh();
    } catch {
      setUncertain(true);
      setError("The request could not be confirmed. Check publishing history before trying again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Publishing" description="Publish approved videos to your connected social accounts and monitor delivery status." action={<button className="primary-link" onClick={openPublish}><Plus size={16} aria-hidden="true" /> Publish video</button>} />
      {!data && <p className="form-alert" role="alert">Publishing data could not be loaded. Check the database connection and refresh status.</p>}
      {facebookCheckError && <p className="form-alert" role="alert">Facebook publishing destinations are disabled. {facebookCheckError} A workspace administrator must restore Meta access.</p>}
      {connectedFacebookIds && !currentFacebookCheck && <p className="social-account-copy" role="status">Checking Facebook publishing access…</p>}
      {message && <p className={styles.notice} role="status">{message}</p>}
      {error && <p className="form-alert" role="alert">{error}</p>}
      <section className={styles.summary} aria-label="Publishing summary">
        {[["Ready to publish", data?.videos.length], ["In progress", rows.filter((row) => active(row.status)).length], ["Published", rows.filter((row) => row.status === "published").length], ["Failed", rows.filter((row) => row.status === "failed").length]].map(([label, count]) => <div className={styles.stat} key={label}><span>{label}</span><strong>{data ? count : "—"}</strong></div>)}
      </section>
      <section className={styles.destinations} aria-label="Connected destinations">
        <div className={styles.toolbar}><h2>Connected destinations</h2><Link href="/social-accounts">Manage social accounts</Link></div>
        <div className={styles.accounts}>
          {data?.accounts.map((item) => {
            const facebookAvailable = item.platform !== "facebook" || facebookPageIds?.includes(item.accountId) === true;
            const status = item.status !== "connected" ? "not connected" : item.platform === "facebook" && !currentFacebookCheck ? "processing" : facebookAvailable ? "connected" : "failed";
            const health = item.platform === "instagram" ? "Test destination" : item.status !== "connected" ? "Disconnected" : !currentFacebookCheck ? "Checking access" : facebookAvailable ? "Publishing access active" : facebookCheckError ? "Access check failed" : "Page unavailable";
            return <div className={styles.account} key={item.id}>{item.platform === "facebook" ? <Globe2 size={17} aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}<div><strong>{platformLabel(item.platform)} · {item.name}</strong><small>{health}</small></div><StatusBadge status={status} /></div>;
          })}
          {data && !accounts.length && <p>No publishing destinations are connected. <Link href="/social-accounts">Manage social accounts</Link></p>}
        </div>
      </section>
      <section aria-label="Publishing history">
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Filter status">{["All", "In progress", "Published", "Failed"].map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div className={styles.filters}><label>Platform <select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="all">All</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label><button onClick={() => router.refresh()}>Refresh status</button></div>
        </div>
        {data && rows.length === 0 ? <div className={styles.empty}><h2>No publishing activity yet.</h2><p>Publish your first approved video to a connected destination.</p><button className="primary-link" onClick={openPublish}>Publish video</button></div> : <div className="data-table-wrap"><table className="data-table"><thead><tr>{["Video", "Destination", "Status", "Created", "Published", "Actions"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
          {shown.map((row) => <tr key={row.id}><td><Link className="table-primary" href={`/videos/${row.videoId}`}>{row.title}</Link></td><td><strong>{platformLabel(row.platform)}</strong><div>{row.destination}</div><span className={styles.tag}>{row.mock ? row.platform === "facebook" ? "Legacy mock" : "Mock" : "Real connection"}</span></td><td><span className={styles.status}>{row.status === "processing" && <LoaderCircle className="button-spinner" size={13} aria-hidden="true" />}<StatusBadge status={row.status} /></span></td><td>{date(row.createdAt)}</td><td>{date(row.publishedAt)}</td><td><button className="secondary-link" aria-label={`${row.status === "failed" ? "View error" : "View details"} for ${row.title}`} onClick={() => { setSelectedRow(row.id); details.current?.showModal(); }}>{row.status === "failed" ? "View error" : active(row.status) ? "View status" : "View details"}</button></td></tr>)}
          {data && rows.length > 0 && !shown.length && <tr><td colSpan={6}>No publishing activity matches these filters.</td></tr>}
        </tbody></table></div>}
      </section>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="publish-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
        <h2 id="publish-title">Publish video</h2><p>Choose one approved video and one destination.</p>
        {!data ? <p role="alert">Publishing data is unavailable. Close this dialog and refresh status.</p> : <>
          {!data.videos.length ? <p>No approved videos are ready to publish. Approve a rendered video before publishing. <Link href="/videos">Browse videos</Link></p> : <label className={styles.field}>Video<select value={videoId} disabled={busy} onChange={(event) => setVideoId(event.target.value)}>{data.videos.map((item) => <option key={item.id} value={item.id}>{item.title} · Approved{item.duration ? ` · ${Math.round(item.duration)}s` : ""}</option>)}</select></label>}
          {!accounts.length ? <p>{connectedFacebookIds && !currentFacebookCheck ? "Checking Facebook access before showing destinations… " : "No publishing destinations are currently available. "}<Link href="/social-accounts">Manage social accounts</Link></p> : <label className={styles.field}>Destination<select value={accountId} disabled={busy} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{platformLabel(item.platform)} · {item.name} · Connected{item.platform === "instagram" ? " (Test)" : ""}</option>)}</select></label>}
          {video && account && <div className={styles.review}><small>REVIEW PUBLICATION</small><strong>{video.title}</strong><p>→ {platformLabel(account.platform)} · {account.name}</p><p>{account.platform === "facebook" ? "This is a real Facebook publication." : "Instagram uses the current mock publishing flow."}</p></div>}
        </>}
        {duplicate && <p role="status">{duplicate}</p>}{error && <p className="form-alert" role="alert">{error}</p>}{uncertain && <p>Submission is disabled until you reload and check the existing job history.</p>}
        <div className={styles.footer}><button className="secondary-link" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button className="primary-link" disabled={busy || uncertain || !video || !account || !!duplicate} onClick={() => void publish()}>{busy ? "Submitting…" : "Publish now"}</button></div><span className={styles.loading} role="status">{busy ? "Submitting publishing request…" : ""}</span>
      </dialog>
      <dialog ref={details} className={styles.dialog} aria-labelledby="details-title"><h2 id="details-title">Publication details</h2>{detail && <><h3>{detail.title}</h3><dl className={styles.facts}><dt>Platform</dt><dd>{platformLabel(detail.platform)}</dd><dt>Destination</dt><dd>{detail.destination}</dd><dt>Status</dt><dd><StatusBadge status={detail.status} /></dd><dt>External post ID</dt><dd>{detail.externalPostId || "—"}</dd><dt>Published</dt><dd>{date(detail.publishedAt)}</dd></dl>{detail.status === "failed" && <p className="form-alert">{detail.error || "No additional error details were recorded."}</p>}{active(detail.status) && <p>{detail.jobId ? "Status updates automatically while this job is active." : "Legacy record; no active worker job is linked."}</p>}</>}<div className={styles.footer}><button className="secondary-link" onClick={() => details.current?.close()}>Close</button></div></dialog>
    </>
  );
}
