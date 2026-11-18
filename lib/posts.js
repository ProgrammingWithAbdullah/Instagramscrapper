const { readCache } = require("./store");

function accountAvgEngagement(media) {
  if (!media.length) return 0;
  const total = media.reduce(
    (sum, m) => sum + (m.like_count || 0) + (m.comments_count || 0),
    0
  );
  return total / media.length;
}

function followerBucket(count) {
  if (count == null) return "unknown";
  if (count < 10000) return "under_10k";
  if (count < 100000) return "10k_100k";
  return "100k_plus";
}

/** Flattens the cache into one row per post, with derived fields. */
async function getAllPosts() {
  const cache = await readCache();
  const rows = [];

  for (const account of cache.accounts || []) {
    const media = account.media || [];
    const avgEngagement = accountAvgEngagement(media);

    for (const post of media) {
      const engagement = (post.like_count || 0) + (post.comments_count || 0);
      const multiplier = avgEngagement > 0 ? engagement / avgEngagement : 0;
      const engagementRate =
        account.followers_count > 0
          ? engagement / account.followers_count
          : 0;

      rows.push({
        id: post.id,
        caption: post.caption,
        like_count: post.like_count,
        comments_count: post.comments_count,
        permalink: post.permalink,
        media_type: post.media_type,
        media_product_type: post.media_product_type, // FEED | REELS
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        timestamp: post.timestamp,
        engagement,
        multiplier: Number(multiplier.toFixed(2)),
        engagement_rate: engagementRate,
        account: {
          username: account.username,
          niche: account.niche,
          subcategory: account.subcategory,
          type: account.type,
          followers_count: account.followers_count,
          follower_bucket: followerBucket(account.followers_count),
          profile_picture_url: account.profile_picture_url,
          avg_engagement: Math.round(avgEngagement),
        },
      });
    }
  }

  return { updatedAt: cache.updatedAt, rows };
}

async function findPostAndAccount(postId) {
  const cache = await readCache();
  for (const account of cache.accounts || []) {
    const post = (account.media || []).find((m) => m.id === postId);
    if (post) {
      const avgEngagement = accountAvgEngagement(account.media || []);
      return {
        post,
        account: { ...account, avg_engagement: Math.round(avgEngagement) },
      };
    }
  }
  return null;
}

module.exports = { getAllPosts, findPostAndAccount };
