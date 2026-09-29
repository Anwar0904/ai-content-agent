import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SceneAssetPreview } from "@/components/videos/SceneAssetPreview";
import { VideoDetailActions } from "@/components/videos/VideoDetailActions";
import { getVideoDetail } from "@/services/video/videoDetails";
import { formatDate } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({
  params,
}: PageProps<"/videos/[id]">) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id) || !isValidObjectId(id)) notFound();

  let video;
  try {
    video = await getVideoDetail(id);
  } catch {
    return <ErrorState title="Video unavailable" description="This video couldn't be loaded. Check the database connection and try again." />;
  }
  if (!video) notFound();

  return (
    <>
      <Link className="back-link" href="/videos"><ArrowLeft aria-hidden="true" size={15} /> Back to Videos</Link>
      <PageHeader description="Inspect the generated content, scenes, and final render." title={video.title} />

      <section aria-label="Video preview and details" className="video-detail-overview">
        <div className="video-detail-player">
          {video.videoPath ? (
            <video aria-label={`Preview of ${video.title}`} className="video-detail-media" controls playsInline src={video.videoPath} />
          ) : (
            <div className="video-not-rendered">
              <h2>Video not rendered yet</h2>
              <p>Render this video to generate the final MP4.</p>
              <VideoDetailActions canRender={video.scenes.length > 0} initialJob={video.renderJob} status={video.status} videoId={video.id} />
            </div>
          )}
        </div>

        <div className="video-detail-summary">
          <h2 className="section-heading">Video details</h2>
          <dl className="video-facts">
            <div><dt>Template</dt><dd>{video.templateLabel}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge status={video.status} /></dd></div>
            <div><dt>Created</dt><dd>{formatDate(video.createdAt)}</dd></div>
          </dl>
          <section className="detail-copy-block">
            <h3>Hook</h3>
            <p>{video.hook}</p>
          </section>
        </div>
      </section>

      <section aria-labelledby="script-heading" className="detail-section">
        <h2 className="section-heading" id="script-heading">Script</h2>
        <p className="detail-long-copy">{video.script}</p>
      </section>

      <section aria-labelledby="caption-heading" className="detail-section">
        <h2 className="section-heading" id="caption-heading">Caption</h2>
        <p className="detail-long-copy">{video.caption}</p>
      </section>

      <section aria-labelledby="hashtags-heading" className="detail-section">
        <h2 className="section-heading" id="hashtags-heading">Hashtags</h2>
        {video.hashtags.length ? (
          <p className="hashtag-list">{video.hashtags.map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join("  ")}</p>
        ) : (
          <p className="detail-empty">No hashtags saved for this video.</p>
        )}
      </section>

      <section aria-labelledby="scenes-heading" className="detail-section">
        <div className="detail-section-heading-row">
          <h2 className="section-heading" id="scenes-heading">Scenes</h2>
          <span className="section-caption">{video.scenes.length} {video.scenes.length === 1 ? "scene" : "scenes"}</span>
        </div>
        {video.scenes.length ? (
          <div className="video-detail-scenes">
            {[...video.scenes].sort((left, right) => left.order - right.order).map((scene) => (
              <article className="video-detail-scene" key={scene.order}>
                <SceneAssetPreview assetPath={scene.assetPath} order={scene.order} />
                <div className="video-detail-scene-copy">
                  <div className="video-detail-scene-heading">
                    <h3>Scene {String(scene.order).padStart(2, "0")}</h3>
                    <span><Clock3 aria-hidden="true" size={13} /> {scene.duration}s</span>
                  </div>
                  <h4>Narration</h4>
                  <p>{scene.narration}</p>
                  <div className="scene-provider-line">
                    <span>Asset provider</span>
                    <strong>{scene.assetProvider ? scene.assetProvider[0].toUpperCase() + scene.assetProvider.slice(1) : "Unavailable"}</strong>
                    {scene.assetType && <span className="scene-asset-type">{scene.assetType === "ai" ? "AI" : scene.assetType === "stock" ? "Stock" : "Local"}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="detail-empty">No scenes have been generated for this video.</p>
        )}
      </section>

      <section aria-label="Video actions" className="video-detail-actions-section">
        <VideoDetailActions status={video.status} videoId={video.id} />
        <p className="section-caption">
          {video.status === "review" && "Approve or reject this video before it can enter the publishing flow."}
          {video.status === "approved" && "This video is approved and ready for future publishing."}
          {video.status === "rejected" && "This video is rejected and excluded from the publishing flow."}
          {!['review', 'approved', 'rejected'].includes(video.status) && "Review status will appear here once the video reaches the approval stage."}
        </p>
      </section>
    </>
  );
}