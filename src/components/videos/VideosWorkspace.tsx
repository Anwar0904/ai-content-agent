"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { VideoDetailActions } from "./VideoDetailActions";
import type { VideoPublishingData } from "./VideoPublishAction";
import styles from "./videos.module.css";

export interface CompactVideo {
  id: string; title: string; campaign: string; status: string;
  updatedAt: string; duration: number; thumbnail?: string; rendered: boolean;
}

const statusOptions = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "generating", label: "Generating" },
  { value: "rendering", label: "Rendering" },
  { value: "review", label: "Ready for review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

export function VideosWorkspace({ videos, publishing }: { videos: CompactVideo[]; publishing: VideoPublishingData | null }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const shown = videos.filter((video) => (filter === "all" || video.status === filter) && `${video.title} ${video.campaign}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <section className={styles.summary} aria-label="Video summary">{[["All videos", videos.length], ["Needs review", videos.filter((video) => video.status === "review").length], ["Approved", videos.filter((video) => video.status === "approved").length], ["Published", videos.filter((video) => video.status === "published").length]].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</section>
    <div className={styles.toolbar}><label>Search videos<input type="search" value={search} placeholder="Title or campaign…" onChange={(event) => setSearch(event.target.value)} /></label><label>Status<select value={filter} onChange={(event) => setFilter(event.target.value)}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
    {!videos.length ? <div className={styles.empty}><h2>No videos yet</h2><p>Create a campaign to start preparing videos.</p><Link className="primary-link" href="/campaigns/new">Create campaign</Link></div> : <div className="data-table-wrap"><table className={`data-table ${styles.table}`}><thead><tr>{["Video", "Status", "Campaign", "Updated", "Publishing", "Actions"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{shown.map((video) => {
      const history = publishing?.rows.filter((row) => row.videoId === video.id) ?? [];
      const active = history.find((row) => row.status === "queued" || row.status === "processing");
      const publication = active ?? history[0];
      return <tr key={video.id}><td><div className={styles.titleCell}>{video.thumbnail ? <Image className={styles.thumbnail} src={video.thumbnail} alt="" width={72} height={72} /> : <span className={styles.placeholder} aria-hidden="true">Video</span>}<div><Link className="video-title-link" href={`/videos/${video.id}`}>{video.title}</Link><small>{video.duration > 0 ? `${Math.floor(video.duration / 60)}:${String(Math.round(video.duration % 60)).padStart(2, "0")} · ` : ""}{video.rendered ? "Rendered video" : "Awaiting render"}</small></div></div></td><td><StatusBadge status={video.status} />{video.status === "review" && <small>Review required</small>}</td><td>{video.campaign}</td><td>{video.updatedAt.slice(0, 10)}<small>UTC</small></td><td>{publication ? <Link href="/publishing"><StatusBadge status={publication.status} /><small>{publication.platform === "facebook" ? "Facebook" : "Instagram"} · {publication.destination}</small></Link> : publishing === null ? "Unavailable" : video.status === "approved" && video.rendered ? "Ready" : "Not ready"}</td><td><div className={styles.rowActions}><Link className="secondary-link" href={`/videos/${video.id}`}>View video</Link>{(video.status === "review" || video.status === "approved") && <VideoDetailActions videoId={video.id} status={video.status} title={video.title} rendered={video.rendered} publishing={publishing ? { accounts: publishing.accounts, rows: history } : null} />}{video.status === "published" && <Link className="secondary-link" href="/publishing">View publication</Link>}</div></td></tr>;
    })}{!shown.length && <tr><td colSpan={6}>No videos match these filters.</td></tr>}</tbody></table></div>}
  </>;
}
