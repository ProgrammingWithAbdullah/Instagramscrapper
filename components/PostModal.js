"use client";

import { useEffect, useState } from "react";
import { formatCount, timeAgo } from "../lib/format";

export default function PostModal({ post, onClose }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBreakdown(null);
    setError(null);
  }, [post?.id]);

  async function loadBreakdown() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate breakdown");
      setBreakdown(json.breakdown);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!post) return null;
  const img = post.media_url || post.thumbnail_url;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {post.account.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="avatar" style={{ width: 32, height: 32 }} src={post.account.profile_picture_url} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <div>
              <div style={{ fontWeight: 600 }}>
                @{post.account.username} · {formatCount(post.account.followers_count)} followers
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
                {post.account.niche} · {post.account.subcategory} · {timeAgo(post.timestamp)} ago
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-media">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <a href={post.permalink} target="_blank" rel="noreferrer" className="btn" style={{ display: "inline-block", marginTop: 10 }}>
              Open on Instagram ↗
            </a>
          </div>

          <div>
            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-label">Multiplier</div>
                <div className="stat-value">{post.multiplier}x</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Likes</div>
                <div className="stat-value">{formatCount(post.like_count)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Comments</div>
                <div className="stat-value">{formatCount(post.comments_count)}</div>
              </div>
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Account avg engagement: {formatCount(post.account.avg_engagement)} · This post:{" "}
              {formatCount(post.engagement)}
            </div>

            <div className="section-label">Caption</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {post.caption || "(no caption)"}
            </div>

            <div className="section-label" style={{ marginTop: 18 }}>
              AI Breakdown
            </div>
            {!breakdown && !loading && (
              <button className="btn primary" onClick={loadBreakdown}>
                Generate AI breakdown
              </button>
            )}
            {loading && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Asking Gemini…</div>}
            {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}

            {breakdown && (
              <>
                <div className="section-box">
                  <strong>Why it worked:</strong> {breakdown.why_it_worked}
                </div>

                <div className="section-label">Format</div>
                <div>{breakdown.format}</div>

                <div className="section-label">Hook</div>
                <div>“{breakdown.hook}”</div>

                <div className="section-label">First two seconds</div>
                <div>{breakdown.first_two_seconds}</div>

                <div className="section-label">Beats</div>
                <ol className="beats-list">
                  {(breakdown.beats || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ol>

                <div className="section-label">Script to copy</div>
                <div className="script-box">{breakdown.script_to_copy}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
