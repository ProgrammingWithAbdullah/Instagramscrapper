"use client";

import { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";

export default function Home() {
  const [niches, setNiches] = useState([]);
  const [niche, setNiche] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [postedBy, setPostedBy] = useState("everyone");
  const [type, setType] = useState("any");
  const [accountSize, setAccountSize] = useState("any");
  const [sort, setSort] = useState("best");
  const [search, setSearch] = useState("");

  const [posts, setPosts] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        setNiches(data.niches || []);
        if (data.niches?.length && !niche) setNiche(data.niches[0].niche);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (niche) params.set("niche", niche);
    if (subcategory) params.set("subcategory", subcategory);
    params.set("postedBy", postedBy);
    params.set("type", type);
    params.set("accountSize", accountSize);
    params.set("sort", sort);
    if (search) params.set("search", search);

    setLoading(true);
    fetch(`/api/posts?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setUpdatedAt(data.updatedAt);
      })
      .finally(() => setLoading(false));
  }, [niche, subcategory, postedBy, type, accountSize, sort, search]);

  const activeNicheData = useMemo(
    () => niches.find((n) => n.niche === niche),
    [niches, niche]
  );

  async function handleResync() {
    setSyncing(true);
    setSyncMsg("Syncing all accounts — this can take a minute…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setSyncMsg(`Synced ${json.summary.synced}/${json.summary.total} accounts (${json.summary.failures} failed).`);
      } else {
        setSyncMsg(`Sync failed: ${json.error}`);
      }
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
      // refresh current view
      setSort((s) => s);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">📊 IG Scrapper</div>
        <div className="nav-item active">Library</div>
        <div className="nav-item">Accounts</div>
        <div className="nav-item">Settings</div>
      </aside>

      <main className="main">
        <div className="header-row">
          <h1 className="title">
            Library
            {updatedAt && (
              <span className="updated-at">
                Updated {new Date(updatedAt).toLocaleString()}
              </span>
            )}
          </h1>
          <button className="btn primary" onClick={handleResync} disabled={syncing}>
            {syncing ? "Syncing…" : "Resync accounts"}
          </button>
        </div>
        {syncMsg && <div style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 10 }}>{syncMsg}</div>}

        <div className="pill-row">
          {niches.map((n) => (
            <button
              key={n.niche}
              className={`pill ${niche === n.niche ? "active" : ""}`}
              onClick={() => {
                setNiche(n.niche);
                setSubcategory(null);
              }}
            >
              {n.niche}
            </button>
          ))}
        </div>

        {activeNicheData && (
          <div className="pill-row">
            <button
              className={`pill ${!subcategory ? "active" : ""}`}
              onClick={() => setSubcategory(null)}
            >
              All of {niche}
            </button>
            {activeNicheData.subcategories.map((s) => (
              <button
                key={s}
                className={`pill ${subcategory === s ? "active" : ""}`}
                onClick={() => setSubcategory(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="filter-bar">
          <div className="select-pill">
            <select value={postedBy} onChange={(e) => setPostedBy(e.target.value)}>
              <option value="everyone">Posted by: Everyone</option>
              <option value="creators">Creators</option>
              <option value="brands">Brands</option>
            </select>
          </div>
          <div className="select-pill">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="any">Type: Any</option>
              <option value="post">Posts</option>
              <option value="reel">Reels</option>
            </select>
          </div>
          <div className="select-pill">
            <select value={accountSize} onChange={(e) => setAccountSize(e.target.value)}>
              <option value="any">Account size: Any</option>
              <option value="under_10k">Under 10k</option>
              <option value="10k_100k">10k to 100k</option>
              <option value="100k_plus">100k+</option>
            </select>
          </div>
          <div className="select-pill">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="best">Sort: Best (multiplier)</option>
              <option value="newest">Newest</option>
              <option value="likes">Most likes</option>
              <option value="comments">Most comments</option>
              <option value="rate">Highest engagement rate</option>
            </select>
          </div>
          <input
            className="search-box"
            placeholder="Search caption or @account"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="count-row">
          {loading ? "Loading…" : `${posts.length} posts`}
        </div>

        <div className="grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onOpen={setSelectedPost} />
          ))}
        </div>

        {!loading && posts.length === 0 && (
          <div style={{ color: "var(--text-dim)", marginTop: 40 }}>
            No cached posts yet. Fill in your .env (see README), then click
            &quot;Resync accounts&quot; above or run <code>npm run sync</code> in a terminal.
          </div>
        )}
      </main>

      <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}
