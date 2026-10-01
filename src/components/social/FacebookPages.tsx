"use client";

import { LoaderCircle, Plus, RefreshCw, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import type { SocialAccountRow } from "@/services/dashboard/dashboardData";

type Page = { id: string; name: string; connected: boolean };
type PageErrorCode = "not_configured" | "reauthorization_required" | "permission_required" | "unavailable";

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function FacebookPages({ accounts, oauthStatus, startWithAdd = false }: { accounts: SocialAccountRow[]; oauthStatus?: string; startWithAdd?: boolean }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [accountRows, setAccountRows] = useState(accounts);
  const [pageId, setPageId] = useState("");
  const [adding, setAdding] = useState(false);
  const [connectingPageId, setConnectingPageId] = useState<string | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(startWithAdd);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(startWithAdd);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<PageErrorCode | null>(null);
  const hasConnectedFacebook = accountRows.some((account) => account.platform === "facebook" && account.status === "connected" && /^\d+$/.test(account.accountId));
  const hasExpiredFacebook = accountRows.some((account) => account.platform === "facebook" && account.status === "expired" && /^\d+$/.test(account.accountId));

  useEffect(() => {
    if (!startWithAdd) return;
    let cancelled = false;
    void fetch("/api/social-accounts/facebook/pages", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { pages?: Page[]; error?: { code?: PageErrorCode; message?: string } };
        if (!response.ok) throw Object.assign(new Error(body.error?.message || "Facebook couldn't be reached. Try again."), { code: body.error?.code });
        if (!cancelled) {
          setPages(body.pages ?? []);
          setLoaded(true);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const failure = cause as { code?: PageErrorCode; message?: string };
        setErrorCode(failure.code ?? "unavailable");
        setError(failure.message ?? "Facebook couldn't be reached. Try again.");
      })
      .finally(() => { if (!cancelled) setLoadingPages(false); });
    return () => { cancelled = true; };
  }, [startWithAdd]);

  async function refresh() {
    setLoadingPages(true);
    setError(null);
    setErrorCode(null);
    try {
      const response = await fetch("/api/social-accounts/facebook/pages", { cache: "no-store" });
      const body = await response.json() as { pages?: Page[]; error?: { code?: PageErrorCode; message?: string } };
      if (!response.ok) {
        setErrorCode(body.error?.code ?? "unavailable");
        throw new Error(body.error?.message || "Facebook couldn't be reached. Try again.");
      }
      setPages(body.pages ?? []);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Facebook couldn't be reached. Try again.");
    } finally {
      setLoadingPages(false);
    }
  }

  async function addPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{1,32}$/.test(pageId)) return;
    setAdding(true);
    setError(null);
    setErrorCode(null);
    try {
      await connectPage(pageId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't add this Facebook Page.");
    } finally {
      setAdding(false);
    }
  }

  async function connectPage(selectedPageId: string) {
    setConnectingPageId(selectedPageId);
    setError(null);
    setErrorCode(null);
    try {
      const response = await fetch("/api/social-accounts/facebook/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selectedPageId }),
      });
      const body = await response.json() as { account?: SocialAccountRow; error?: { code?: PageErrorCode; message?: string } };
      if (!response.ok || !body.account) {
        setErrorCode(body.error?.code ?? "unavailable");
        throw new Error(body.error?.message || "We couldn't add this Facebook Page.");
      }
      const account = { ...body.account, createdAt: new Date(), updatedAt: new Date() };
      setAccountRows((current) => [account, ...current.filter((row) => row.id !== account.id)]);
      setPages((current) => current.map((page) => page.id === account.accountId ? { ...page, connected: true } : page));
      setPageId("");
    } finally {
      setConnectingPageId(null);
    }
  }

  async function disconnect(account: SocialAccountRow) {
    const confirmed = window.confirm(`Disconnect ${account.accountName}? Publishing to this Page will no longer be available.`);
    if (!confirmed) return;
    setBusyAccountId(account.id);
    setError(null);
    try {
      const response = await fetch(`/api/social-accounts/${account.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "This Facebook Page couldn't be disconnected.");
      setAccountRows((current) => current.map((row) => row.id === account.id ? { ...row, status: "disconnected" } : row));
      setPages((current) => current.map((page) => page.id === account.accountId ? { ...page, connected: false } : page));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This Facebook Page couldn't be disconnected.");
    } finally {
      setBusyAccountId(null);
    }
  }

  const managedAccounts = accountRows.filter((account) => account.platform === "facebook" && account.status !== "disconnected" && /^\d+$/.test(account.accountId));

  return (
    <section className="social-account-section" aria-labelledby="facebook-pages-title">
      <div className="social-account-section-heading">
        <div>
          <h2 id="facebook-pages-title" className="section-heading">Facebook Pages</h2>
          <p className="social-account-copy">Manage the Pages available for publishing.</p>
        </div>
        {hasConnectedFacebook ? (
          <button className="primary-link" type="button" aria-expanded={addOpen} onClick={() => { setAddOpen((open) => !open); setError(null); }}>
            <Plus aria-hidden="true" size={15} /> {addOpen ? "Close" : "Add Facebook Page"}
          </button>
        ) : <form className="oauth-action-form" action="/api/social-accounts/oauth/facebook/start" method="get"><button className="primary-link" type="submit">{hasExpiredFacebook ? "Reconnect Facebook" : "Connect Facebook"}</button></form>}
      </div>
      {oauthStatus === "connected" && <p className="success-alert" role="status">Facebook is connected. Choose the Pages you want to use for publishing.</p>}
      {oauthStatus === "denied" && <p className="form-alert social-account-alert" role="alert">Facebook authorization was cancelled. You can connect Facebook again when you’re ready.</p>}
      {oauthStatus === "failed" && <p className="form-alert social-account-alert" role="alert">Facebook could not be connected. Check the Meta app settings and try again.</p>}
      {oauthStatus === "invalid-state" && <p className="form-alert social-account-alert" role="alert">The Facebook authorization session expired or could not be verified. Start the connection again.</p>}
      {oauthStatus === "not-configured" && <p className="form-alert social-account-alert" role="alert">Facebook sign-in needs a Meta App ID, App Secret, callback URL, and encryption key configured on the server.</p>}
      {error && (
        <div className="form-alert social-account-alert">
          <p role="alert">{error}</p>
          {errorCode === "unavailable" && <button className="secondary-link" type="button" disabled={loadingPages} onClick={() => void refresh()}>Try again</button>}
          {(errorCode === "reauthorization_required" || errorCode === "permission_required") && <form className="oauth-action-form" action="/api/social-accounts/oauth/facebook/start" method="get"><button className="secondary-link" type="submit">Reconnect Facebook</button></form>}
          {errorCode === "not_configured" && <form className="oauth-action-form" action="/api/social-accounts/oauth/facebook/start" method="get"><button className="secondary-link" type="submit">Connect Facebook</button></form>}
        </div>
      )}
      {addOpen && (
        <section className="account-add-panel" aria-labelledby="add-facebook-page-title">
          <h3 id="add-facebook-page-title">Add a Facebook Page</h3>
          <p>Enter a Page ID or find Pages available to this workspace. We verify the ID with Meta and use the Page name returned by Facebook.</p>
          <form className="account-add-form" onSubmit={(event) => void addPage(event)}>
            <div className="form-field">
              <label className="form-label" htmlFor="facebook-page-id">Facebook Page ID</label>
              <input className="form-control" id="facebook-page-id" name="pageId" inputMode="numeric" pattern="[0-9]{1,32}" required value={pageId} onChange={(event) => setPageId(event.target.value)} placeholder="For example, 123456789012345" aria-describedby="facebook-page-id-hint" />
              <p id="facebook-page-id-hint" className="form-hint">Only Pages available to this workspace’s Facebook connection can be added. Page names are verified automatically.</p>
            </div>
            <button className="primary-link" disabled={adding || loadingPages || connectingPageId !== null} type="submit">
              {adding ? <LoaderCircle aria-hidden="true" className="button-spinner" size={15} /> : <Plus aria-hidden="true" size={15} />}
              {adding ? "Adding Page…" : "Add Page"}
            </button>
            <button className="secondary-link" disabled={loadingPages || adding || connectingPageId !== null} onClick={() => void refresh()} type="button">
              {loadingPages ? <LoaderCircle aria-hidden="true" className="button-spinner" size={15} /> : <RefreshCw aria-hidden="true" size={15} />}
              {loadingPages ? "Finding Pages…" : "Find available Pages"}
            </button>
          </form>
          {loaded && pages.length === 0 && <p className="social-account-copy" role="status">No Facebook Pages are available to this workspace connection.</p>}
          {pages.length > 0 && (
            <ul className="available-pages" aria-label="Available Facebook Pages">
              {pages.map((page) => (
                <li key={page.id}>
                  <div><strong>{page.name}</strong><span>Page ID: {page.id}</span></div>
                  {page.connected ? <span className="account-state account-state-connected">Connected</span> : <button className="secondary-link" type="button" disabled={adding || loadingPages || connectingPageId !== null} onClick={() => void connectPage(page.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "We couldn't add this Facebook Page."))}>{connectingPageId === page.id ? "Connecting…" : "Connect Page"}</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className="connected-account-list" aria-live="polite">
        {!managedAccounts.length ? (
          <div className="social-empty-state">
            <h3>No Facebook Pages connected</h3>
            <p>Add a Page to make it available as a publishing destination.</p>
            {!addOpen && <button className="secondary-link" type="button" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" size={14} /> Add Facebook Page</button>}
          </div>
        ) : managedAccounts.map((account) => (
          <article className="connected-account" key={account.id}>
            <span className="platform-mark" aria-hidden="true">f</span>
            <div className="connected-account-details">
              <h3>{account.accountName}</h3>
              <p>Facebook Page · ID {account.accountId}</p>
              <p>Connected {formatDate(account.updatedAt)}</p>
              {account.status === "connected" ? <span className="account-state account-state-connected">Connected</span> : <span className="account-state account-state-expired">Reauthorization required</span>}
            </div>
            {account.status === "connected" ? (
              <button className="secondary-link connected-account-action" type="button" disabled={busyAccountId === account.id} onClick={() => void disconnect(account)}>
                {busyAccountId === account.id ? <LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> : <Unplug aria-hidden="true" size={14} />}
                {busyAccountId === account.id ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : <form className="oauth-action-form connected-account-action" action="/api/social-accounts/oauth/facebook/start" method="get"><button className="secondary-link" type="submit">Reconnect</button></form>}
          </article>
        ))}
      </div>
    </section>
  );
}
