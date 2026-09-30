import { Share2 } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SocialAccountsManager } from "@/components/social/SocialAccountsManager";
import { getSocialAccountRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

export default async function SocialAccountsPage() {
  const accounts = await getSocialAccountRows();

  return (
    <>
      <PageHeader
        description="Manage local development connections for your publishing destinations."
        title="Social accounts"
      />
      {accounts === null ? (
        <ErrorState description="Social accounts couldn't be loaded. Check the database connection and try again." />
      ) : null}
      {accounts !== null && <SocialAccountsManager accounts={accounts} />}
      {accounts?.length === 0 && (
        <div className="callout">
          <Share2 aria-hidden="true" size={15} />
          <span>This is a local OAuth shell. It does not contact Meta and does not store access tokens.</span>
        </div>
      )}
    </>
  );
}