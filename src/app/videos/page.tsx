import { Clapperboard } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { VideosWorkspace } from "@/components/videos/VideosWorkspace";
import { getVideoRows } from "@/services/dashboard/dashboardData";
import { getPublishingWorkspace } from "@/services/publishing/workspaceData";

export const dynamic = "force-dynamic";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{
    campaign?: string;
    status?: string;
  }>;
}) {
  const [{ campaign, status }, videos, publishing] = await Promise.all([
    searchParams,
    getVideoRows(),
    getPublishingWorkspace(),
  ]);

  if (videos === null) {
    return (
      <div className="space-y-7">
        <ErrorState description="We couldn't load your videos. Check the database connection and try again." />
      </div>
    );
  }

  const compactVideos = videos.map((video) => ({
    id: video.id,
    campaignId: video.campaignId ?? "",
    campaign: video.campaign ?? "Campaign unavailable",
    title: video.title,
    status: video.status,
    createdAt: (() => {
      const value =
        video.createdAt instanceof Date
          ? video.createdAt
          : new Date(video.createdAt);

      return value.toISOString();
    })(),
    updatedAt: (() => {
      const fallback = video.updatedAt ?? video.createdAt;
      const value =
        fallback instanceof Date ? fallback : new Date(fallback);

      return value.toISOString();
    })(),
    duration: video.scenes.reduce(
      (total, scene) => total + (scene.duration ?? 0),
      0,
    ),
    rendered: Boolean(video.videoPath),
    template: video.templateLabel ?? "Custom video",
    videoPath: video.videoPath,
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Media"
        title="Videos"
        description="Review generated videos, track publishing, and keep each campaign moving toward approval."
      />

      {videos.length === 0 ? (
        <EmptyState
          action={{
            href: "/campaigns",
            label: "Browse campaigns",
          }}
          description="Create a campaign and generate your first set of videos to review here."
          icon={Clapperboard}
          title="No videos yet"
        />
      ) : (
        <VideosWorkspace
          initialCampaignId={campaign}
          initialStatus={status}
          publishing={publishing}
          videos={compactVideos}
        />
      )}
    </div>
  );
}
