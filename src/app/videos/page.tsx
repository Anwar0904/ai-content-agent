import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { VideosWorkspace } from "@/components/videos/VideosWorkspace";
import { getVideoRows } from "@/services/dashboard/dashboardData";
import { getPublishingWorkspace } from "@/services/publishing/workspaceData";

export const dynamic = "force-dynamic";

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ generated?: string }> }) {
  const [videos, publishing, { generated }] = await Promise.all([getVideoRows(), getPublishingWorkspace(), searchParams]);
  const generatedCount = Number(generated ?? 0);
  return <>
    <PageHeader title="Videos" description="Manage video review, approval and publishing." action={<Link className="primary-link" href="/campaigns/new">Create campaign</Link>} />
    {generatedCount > 0 && <div className="success-alert" role="status">{generatedCount} videos generated successfully.</div>}
    {videos === null ? <ErrorState description="Videos could not be loaded. Check the database connection and try again." /> : <VideosWorkspace publishing={publishing ? { accounts: publishing.accounts, rows: publishing.rows } : null} videos={videos.map((video) => ({
      id: video.id, title: video.title, campaign: video.campaign, status: video.status,
      updatedAt: (video.updatedAt ?? video.createdAt).toISOString(),
      duration: video.scenes.reduce((sum, scene) => sum + scene.duration, 0),
      thumbnail: [...video.scenes].sort((a, b) => a.order - b.order).find((scene) => scene.assetPath)?.assetPath,
      rendered: !!video.videoPath,
    }))} />}
  </>;
}
