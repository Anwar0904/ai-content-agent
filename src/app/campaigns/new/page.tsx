import {
  ArrowLeft,
  Clapperboard,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewCampaignPage() {
  return (
    <div className="space-y-7">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      >
        <ArrowLeft
          aria-hidden="true"
          size={15}
        />
        Back to campaigns
      </Link>

      <PageHeader
        eyebrow="New campaign"
        title="Create a content campaign"
        description="Tell us what you want to create. You can review every generated video before anything is published."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <CampaignForm />
        </main>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Sparkles
                aria-hidden="true"
                size={18}
              />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-zinc-950">
              What happens next?
            </h2>

            <div className="mt-4 space-y-4">
              <Step
                number="1"
                title="Create campaign"
                description="Save your campaign brief and video settings."
              />

              <Step
                number="2"
                title="Generate videos"
                description="AI creates individual videos from your campaign."
              />

              <Step
                number="3"
                title="Review"
                description="Watch every rendered video before approving it."
              />

              <Step
                number="4"
                title="Publish"
                description="Choose a connected social account when you're ready."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
            <Clapperboard
              aria-hidden="true"
              size={20}
              className="text-zinc-300"
            />

            <h2 className="mt-3 text-sm font-semibold">
              You stay in control
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-zinc-300">
              Creating a campaign does not publish anything automatically.
              Generated videos remain available for review first.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
        {number}
      </span>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}