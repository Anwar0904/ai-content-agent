"use client";

import { Camera, Check, LoaderCircle, Unplug } from "lucide-react";
import { FacebookPages } from "./FacebookPages";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { SocialAccountRow } from "@/services/dashboard/dashboardData";

const platforms = ["instagram"] as const;

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function SocialAccountsManager({ accounts }: { accounts: SocialAccountRow[] }) {
  const [accountRows, setAccountRows] = useState(accounts);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect(account: SocialAccountRow) {
    setBusyPlatform(account.platform);
    setError(null);
    try {
      const response = await fetch(`/api/social-accounts/${account.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "The account could not be disconnected.");
      setAccountRows((current) => current.map((row) => row.id === account.id ? { ...row, status: "expired" } : row));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account could not be disconnected.");
    } finally {
      setBusyPlatform(null);
    }
  }

  return (
    <>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <section aria-label="Social account connections" className="account-grid">
        <FacebookPages accounts={accounts} />
        {platforms.map((platform) => {
          const account = accountRows.find((row) => row.platform === platform);
          const isBusy = busyPlatform === platform;
          const Icon = Camera;
          const label = "Instagram";
          return (
            <article className="account-card" key={platform}>
              <div className="account-card-heading">
                <span className="platform-mark"><Icon aria-hidden="true" size={18} /></span>
                <div>
                  <h2 className="account-option-title">{label}</h2>
                  <p className="account-option-description">Publishing destination</p>
                </div>
              </div>
              {account && account.status === "connected" ? (
                <>
                  <div className="account-card-status"><StatusBadge status={account.status} /></div>
                  <dl className="account-facts">
                    <div><dt>Account</dt><dd>{account.accountName}</dd></div>
                    {account.username && <div><dt>Username</dt><dd>@{account.username}</dd></div>}
                    <div><dt>Connected</dt><dd>{formatDate(account.updatedAt)}</dd></div>
                  </dl>
                  <button className="secondary-link account-action" disabled={isBusy} onClick={() => disconnect(account)} type="button">
                    {isBusy ? <LoaderCircle aria-hidden="true" className="button-spinner" size={14} /> : <Unplug aria-hidden="true" size={14} />}
                    Disconnect
                  </button>
                </>
              ) : (
                <div className="account-card-disconnected">
                  <div><StatusBadge status="expired" /><p>Not connected</p></div>
                  <a className="primary-link account-action" href={`/api/social-accounts/oauth/${platform}/start`}>
                    <Check aria-hidden="true" size={14} /> Connect locally
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <p className="account-shell-note">Instagram uses a mock connection.</p>
    </>
  );
}
