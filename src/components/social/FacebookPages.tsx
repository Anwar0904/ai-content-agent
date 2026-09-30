"use client";

import { useEffect, useState } from "react";
import type { SocialAccountRow } from "@/services/dashboard/dashboardData";

type Page = { id: string; name: string; connected: boolean };

export function FacebookPages({ accounts }: { accounts: SocialAccountRow[] }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [accountIds, setAccountIds] = useState<Record<string, string>>(() => Object.fromEntries(accounts.filter((account) => account.platform === "facebook").map((account) => [account.accountId, account.id])));
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/social-accounts/facebook/pages", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to load Facebook Pages.");
      setPages(body.pages);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Facebook Pages.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/social-accounts/facebook/pages", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Unable to load Facebook Pages.");
        if (!controller.signal.aborted) {
          setPages(body.pages);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load Facebook Pages. Refresh Pages to try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  async function changeConnection(page: Page) {
    setBusy(true);
    setError(null);
    try {
      if (page.connected && !accountIds[page.id]) throw new Error("Reload this page to disconnect this account.");
      const response = page.connected
        ? await fetch(`/api/social-accounts/${accountIds[page.id]}`, { method: "DELETE" })
        : await fetch("/api/social-accounts/facebook/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.id }),
        });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Unable to update Facebook connection.");
      if (!page.connected) setAccountIds((current) => ({ ...current, [page.id]: body.account.id }));
      setPages((current) => current.map((item) => item.id === page.id ? { ...item, connected: !page.connected } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update Facebook connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="account-card" aria-busy={busy}>
      <h2 className="account-option-title">Facebook Pages</h2>
      <p className="account-option-description">Connect a Facebook Page that this app can publish to.</p>
      <button className="secondary-link account-action" type="button" disabled={busy} onClick={() => void refresh()}>Refresh Pages</button>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {busy && <p role="status">Loading…</p>}
      {loaded && pages.length === 0 && <p>No Facebook Pages were found for the configured Meta account.</p>}
      {pages.map((page) => (
        <div className="account-card-status" key={page.id}>
          <h3 className="account-option-title">{page.name}</h3>
          <p>Page ID: {page.id}</p>
          <p role="status">{page.connected ? "Connected" : "Not connected"}</p>
          <button className="secondary-link account-action" type="button" disabled={busy} onClick={() => void changeConnection(page)}>{page.connected ? "Disconnect" : "Connect Page"}</button>
        </div>
      ))}
    </article>
  );
}
