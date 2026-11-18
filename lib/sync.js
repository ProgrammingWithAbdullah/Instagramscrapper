const accounts = require("../data/accounts.json");
const { fetchAccountMedia } = require("./instagram");
const { writeAccount, writeMeta } = require("./store");

// Bounded-concurrency pool instead of one-at-a-time-with-delay, so a full
// 50-account sync finishes well inside a serverless function's time limit
// (used by both the "Resync accounts" button and the Vercel Cron job).
const CONCURRENCY = 5;

async function runSync({ onProgress } = {}) {
  const queue = [...accounts];
  let synced = 0;
  let failures = 0;

  async function worker() {
    while (queue.length) {
      const acct = queue.shift();
      try {
        const data = await fetchAccountMedia(acct.username, 50);
        await writeAccount({
          ...acct,
          followers_count: data.followers_count,
          media_count: data.media_count,
          profile_picture_url: data.profile_picture_url,
          media: data.media,
          fetched_at: new Date().toISOString(),
        });
        synced += 1;
        onProgress?.({ username: acct.username, ok: true, count: data.media.length });
      } catch (err) {
        failures += 1;
        // Previous successful sync for this account (if any) is left in
        // place in Redis since we simply don't overwrite it on failure.
        onProgress?.({ username: acct.username, ok: false, error: err.message });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, accounts.length) }, worker)
  );

  await writeMeta({ updatedAt: new Date().toISOString() });
  return { total: accounts.length, synced, failures };
}

module.exports = { runSync };
