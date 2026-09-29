import Link from "next/link";

export default function VideoNotFound() {
  return (
    <div className="empty-panel" role="status">
      <h1 className="empty-title">Video not found</h1>
      <p className="empty-description">The requested video does not exist.</p>
      <Link className="secondary-link empty-action" href="/videos">Back to Videos</Link>
    </div>
  );
}