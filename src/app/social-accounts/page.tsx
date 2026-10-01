import {
  Plus,
  Share2,
} from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SocialAccountsManager } from "@/components/social/SocialAccountsManager";
import { getSocialAccountRows } from "@/services/dashboard/dashboardData";

export const dynamic = "force-dynamic";

interface SocialAccountsSearchParams {
  facebookOAuth?: string;
  addPage?: string;
}

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SocialAccountsSearchParams>;
}) {
  const [query, accounts] =
    await Promise.all([
      searchParams,
      getSocialAccountRows(),
    ]);

  if (accounts === null) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Publishing destinations"
          title="Social accounts"
          description="Connect and manage the accounts your videos can be published to."
        />

        <ErrorState
          title="Social accounts couldn't be loaded"
          description="We couldn't load your publishing destinations. Check the database connection and try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Publishing destinations"
        title="Social accounts"
        description="Connect Facebook Pages and manage the destinations available when publishing videos."
        action={
          <Link
            href="/publishing"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <Share2
              aria-hidden="true"
              size={15}
            />
            Publishing
          </Link>
        }
      />

      <SocialAccountsManager
        accounts={accounts}
        oauthStatus={
          query.facebookOAuth
        }
        startWithAdd={
          query.addPage === "1"
        }
      />
    </div>
  );
}