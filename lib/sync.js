const accounts = require("../data/accounts.json");
const { fetchAccountMedia } = require("./instagram");
const { readCache, writeCache } = require("./store");

const DELAY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSync({ onProgress } = {}) {
  const existing = readCache();
  const byUsername = new Map(existing.accounts.map((a) => [a.username, a]));

  const results = [];
  let failures = 0;

  for (const acct of accounts) {
    try {
      const data = await fetchAccountMedia(acct.username, 50);
      results.push({
        ...acct,
        followers_count: data.followers_count,
        media_count: data.media_count,
        profile_picture_url: data.profile_picture_url,
        media: data.media,
        fetched_at: new Date().toISOString(),
      });
      onProgress?.({ username: acct.username, ok: true, count: data.media.length });
    } catch (err) {
      failures += 1;
      const previous = byUsername.get(acct.username);
      if (previous) results.push(previous);
      onProgress?.({ username: acct.username, ok: false, error: err.message });
    }
    await sleep(DELAY_MS);
  }

  writeCache({ updatedAt: new Date().toISOString(), accounts: results });
  return { total: accounts.length, synced: results.length, failures };
}

module.exports = { runSync };
