export default function VideoDetailLoading() {
  return (
    <div aria-label="Loading video details" className="loading-stack" role="status">
      <div className="skeleton skeleton-line" style={{ width: "180px" }} />
      <div className="video-detail-overview">
        <div className="skeleton skeleton-panel video-detail-loading-player" />
        <div className="loading-stack"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  );
}