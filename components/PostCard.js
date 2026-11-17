"use client";

import { formatCount, timeAgo } from "../lib/format";

export default function PostCard({ post, onOpen }) {
  const img = post.thumbnail_url || post.media_url;
  const isVideo = post.media_type === "VIDEO" || post.media_product_type === "REELS";

  return (
    <div className="card" onClick={() => onOpen(post)}>
      <div className="card-media">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#222" }} />
        )}
        <span className="badge">{post.multiplier ? `${post.multiplier}x` : "—"}</span>
        <span className="badge-time">{timeAgo(post.timestamp)}</span>
        {isVideo && <span className="play-icon">▶</span>}
        <span className="platform-tag">
          {post.media_product_type === "REELS" ? "Reel" : "Post"} · Instagram
        </span>
      </div>
      <div className="card-meta">
        <p className="card-caption">{post.caption || "(no caption)"}</p>
        <div className="card-account">
          {post.account.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={post.account.profile_picture_url} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="avatar" />
          )}
          <span>@{post.account.username}</span>
          <span>· {formatCount(post.account.followers_count)}</span>
        </div>
        <div className="topline">
          ❤ {formatCount(post.like_count)} · 💬 {formatCount(post.comments_count)}
        </div>
      </div>
    </div>
  );
}
