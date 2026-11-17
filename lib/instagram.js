const GRAPH_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const MEDIA_FIELDS =
  "caption,like_count,comments_count,permalink,media_type,media_product_type,media_url,thumbnail_url,timestamp";

/**
 * Pulls up to `limit` recent posts/reels for a public Instagram professional
 * account via Meta's Business Discovery field, plus that account's own
 * profile_picture_url and follower/media counts.
 */
async function fetchAccountMedia(username, limit = 50) {
  const callerId = process.env.IG_BUSINESS_ACCOUNT_ID;
  const token = process.env.IG_ACCESS_TOKEN;

  if (!callerId || !token) {
    throw new Error(
      "Missing IG_BUSINESS_ACCOUNT_ID or IG_ACCESS_TOKEN in environment (.env)."
    );
  }

  const fields = `business_discovery.username(${username}){followers_count,media_count,profile_picture_url,media.limit(${limit}){${MEDIA_FIELDS}}}`;
  const url = `${GRAPH_BASE}/${callerId}?fields=${encodeURIComponent(
    fields
  )}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error) {
    const message = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Business Discovery failed for @${username}: ${message}`);
  }

  const discovery = json.business_discovery;
  if (!discovery) {
    throw new Error(`No business_discovery data returned for @${username}.`);
  }

  return {
    username,
    followers_count: discovery.followers_count ?? null,
    media_count: discovery.media_count ?? null,
    profile_picture_url: discovery.profile_picture_url ?? null,
    media: (discovery.media?.data || []).map((m) => ({
      id: m.id,
      caption: m.caption || "",
      like_count: m.like_count ?? 0,
      comments_count: m.comments_count ?? 0,
      permalink: m.permalink,
      media_type: m.media_type, // IMAGE | VIDEO | CAROUSEL_ALBUM
      media_product_type: m.media_product_type, // FEED | REELS
      media_url: m.media_url || null,
      thumbnail_url: m.thumbnail_url || null,
      timestamp: m.timestamp,
    })),
  };
}

module.exports = { fetchAccountMedia };
