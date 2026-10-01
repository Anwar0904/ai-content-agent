import {
  Send,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/PageHeader";
import { PublishingWorkspace } from "@/components/publishing/PublishingWorkspace";
import { getPublishingWorkspace } from "@/services/publishing/workspaceData";

export const dynamic = "force-dynamic";

export default async function PublishingPage() {
  const data =
    await getPublishingWorkspace();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Distribution"
        title="Publishing"
        description="Publish approved videos, track active deliveries, and review previous publishing attempts."
        action={
          <Link
            href="/social-accounts"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <Send
              aria-hidden="true"
              size={15}
            />
            Social accounts
          </Link>
        }
      />

      <PublishingWorkspace
        data={data}
      />
    </div>
  );
}