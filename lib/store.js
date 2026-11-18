const { getRedis } = require("./kv");
const accounts = require("../data/accounts.json");

const META_KEY = "ig:meta";
const accountKey = (username) => `ig:account:${username}`;
const breakdownKey = (postId) => `ig:breakdown:${postId}`;

/** Reads the full cache: sync metadata + every tracked account's latest data. */
async function readCache() {
  const redis = getRedis();
  const meta = (await redis.get(META_KEY)) || {};

  const keys = accounts.map((a) => accountKey(a.username));
  const values = keys.length ? await redis.mget(...keys) : [];
  const accountsData = values.filter(Boolean);

  return { updatedAt: meta.updatedAt || null, accounts: accountsData };
}

/** Reads one account's cached data, or null if it hasn't been synced yet. */
async function readAccount(username) {
  const redis = getRedis();
  return (await redis.get(accountKey(username))) || null;
}

/** Writes one account's synced data. Called per-account during sync. */
async function writeAccount(account) {
  const redis = getRedis();
  await redis.set(accountKey(account.username), account);
}

/** Updates the sync-wide metadata (currently just updatedAt). */
async function writeMeta(meta) {
  const redis = getRedis();
  await redis.set(META_KEY, meta);
}

async function readBreakdown(postId) {
  const redis = getRedis();
  return (await redis.get(breakdownKey(postId))) || null;
}

async function writeBreakdown(postId, breakdown) {
  const redis = getRedis();
  await redis.set(breakdownKey(postId), breakdown);
}

module.exports = {
  readCache,
  readAccount,
  writeAccount,
  writeMeta,
  readBreakdown,
  writeBreakdown,
};
