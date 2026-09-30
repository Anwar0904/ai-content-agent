"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { PublishingWorkspaceData } from "@/services/publishing/workspaceData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import styles from "./videos.module.css";

export type VideoPublishingData = Pick<PublishingWorkspaceData, "accounts" | "rows">;
type TrackedJob = { id: string; status: string; error?: string };
const active = (status: string) => status === "queued" || status === "processing";

export function VideoPublishAction({ videoId, title, rendered, publishing }: {
  videoId: string; title: string; rendered: boolean; publishing: VideoPublishingData | null;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const lock = useRef(false);
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<TrackedJob | null>(null);
  const accounts = publishing?.accounts.filter((item) => item.status === "connected") ?? [];
  const account = accounts.find((item) => item.id === accountId);
  const history = publishing?.rows.filter((row) => row.videoId === videoId) ?? [];
  const initialActive = history.find((row) => row.jobId && active(row.status));
  const currentJob = job ?? (initialActive ? { id: initialActive.jobId!, status: initialActive.status } : null);
  const jobId = currentJob?.id;
  const jobStatus = currentJob?.status;
  const duplicate = history.some((row) => row.accountId === accountId && (active(row.status) || row.status === "published"));

  useEffect(() => {
    if (!jobId || !jobStatus || !active(jobStatus)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !body.data?.job) throw new Error();
        if (cancelled) return;
        const next = body.data.job as TrackedJob;
        setJob({ id: jobId!, status: next.status, error: next.error });
        if (next.status === "failed") setError(next.error || "Publishing failed. Check publication details before another attempt.");
        if (active(next.status)) timer = setTimeout(() => void poll(), 2500);
        else router.refresh();
      } catch {
        if (!cancelled) setError("Status could not be loaded. Check Publishing before trying again.");
      }
    }
    timer = setTimeout(() => void poll(), 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [jobId, jobStatus, router]);

  async function publish() {
    if (lock.current || uncertain || job || initialActive || !account || duplicate || !rendered) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/videos/${videoId}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialAccountId: account.id }) });
      const body = await response.json();
      if (!response.ok || !body.data?.job) {
        if (response.status >= 500 || response.ok) setUncertain(true);
        setError(body.error?.message || "Publishing could not be confirmed. Check Publishing before trying again.");
        return;
      }
      setJob(body.data.job);
      dialog.current?.close();
      router.refresh();
    } catch {
      setUncertain(true);
      setError("Publishing could not be confirmed. Check Publishing before trying again.");
    } finally { lock.current = false; setBusy(false); }
  }

  return <div className={styles.publishAction}>
    <button className="primary-link" type="button" disabled={busy || !!currentJob || uncertain} onClick={() => { setAccountId(accounts[0]?.id ?? ""); setError(""); dialog.current?.showModal(); }}>Publish</button>
    {currentJob && <span role="status"><StatusBadge status={currentJob.status === "completed" ? "published" : currentJob.status} /> <Link href="/publishing">View publication</Link></span>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={headingId} onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id={headingId}>Publish video</h2><p>{title}</p>
      {!rendered && <p role="alert">Render this approved video before publishing. <Link href={`/videos/${videoId}`}>Open video</Link></p>}
      {!publishing && <p role="alert">Publishing accounts could not be loaded.</p>}
      {!accounts.length ? <p>No publishing destinations are connected. <Link href="/social-accounts">Manage social accounts</Link></p> : <label className={styles.field}>Destination<select value={accountId} disabled={busy} onChange={(event) => setAccountId(event.target.value)}><option value="">Select destination</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.platform === "facebook" ? "Facebook" : "Instagram (mock)"} · {item.name} · Connected</option>)}</select></label>}
      <p>This will publish to the selected connected destination.</p>
      {account?.platform === "facebook" && <p className={styles.notice}>This will create a real Facebook publication.</p>}
      {duplicate && <p role="status">Already published or publishing to this destination. <Link href="/publishing">View publication</Link></p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className={styles.actions}><button className="secondary-link" disabled={busy} onClick={() => dialog.current?.close()} type="button">Cancel</button><button className="primary-link" type="button" disabled={busy || uncertain || !!currentJob || !account || !rendered || duplicate} onClick={() => void publish()}>{busy ? "Submitting…" : "Publish now"}</button></div>
      <span role="status">{busy ? "Submitting publication request…" : ""}</span>
    </dialog>
  </div>;
}
