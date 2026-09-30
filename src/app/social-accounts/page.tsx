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
        description="Manage connections for your publishing destinations."
        title="Social accounts"
      />
      {accounts === null ? (
        <ErrorState description="Social accounts couldn't be loaded. Check the database connection and try again." />
      ) : null}
      {accounts !== null && <SocialAccountsManager accounts={accounts} />}
    </>
  );
}
