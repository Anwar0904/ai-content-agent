import { Camera, CirclePlus, Globe2, Share2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getSocialAccountRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function SocialAccountsPage() {
  const accounts = await getSocialAccountRows();

  return (
    <>
      <PageHeader
        action={
          <button
            className="primary-link disabled-action"
            disabled
            title="Account connections are not available yet"
            type="button"
          >
            <CirclePlus aria-hidden="true" size={15} /> Connect account
          </button>
        }
        description="Manage the destinations available to your publishing workflow."
        title="Social accounts"
      />
      {accounts === null ? (
        <ErrorState description="Social accounts couldn't be loaded. Check the database connection and try again." />
      ) : accounts.length === 0 ? (
        <>
          <EmptyState
            description="Connect Facebook Pages and Instagram accounts to publish approved content from one place."
            icon={Share2}
            title="No social accounts connected"
          />
          <section aria-label="Supported account types" className="account-grid" style={{ marginTop: 18 }}>
            <article className="account-option">
              <span className="platform-mark"><Globe2 aria-hidden="true" size={18} /></span>
              <div>
                <div className="account-option-title">Facebook Pages</div>
                <div className="account-option-description">Publishing destination</div>
              </div>
            </article>
            <article className="account-option">
              <span className="platform-mark"><Camera aria-hidden="true" size={18} /></span>
              <div>
                <div className="account-option-title">Instagram</div>
                <div className="account-option-description">Publishing destination</div>
              </div>
            </article>
          </section>
        </>
      ) : (
        <section aria-label="Connected accounts" className="account-grid">
          {accounts.map((account) => {
            const Icon = account.platform === "facebook" ? Globe2 : Camera;
            return (
              <article className="account-option" key={account.id}>
                <span className="platform-mark"><Icon aria-hidden="true" size={18} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="account-option-title">{account.accountName}</div>
                  <div className="account-option-description">
                    {account.platform === "facebook" ? "Facebook" : "Instagram"}
                    {account.username ? ` · @${account.username}` : ""}
                  </div>
                </div>
                <StatusBadge status={account.status} />
              </article>
            );
          })}
        </section>
      )}
      {accounts?.length === 0 && (
        <div className="callout">
          <Share2 aria-hidden="true" size={15} />
          <span>Account connections are not enabled yet. No credentials or access tokens are displayed here.</span>
        </div>
      )}
    </>
  );
}