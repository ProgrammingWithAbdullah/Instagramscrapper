const { getRedis } = require("./kv");

const META_KEY = "ig:meta";
const ACCOUNTS_CONFIG_KEY = "ig:accounts:config";
const accountKey = (username) => `ig:account:${username}`;
const breakdownKey = (postId) => `ig:breakdown:${postId}`;

/**
 * The editable list of tracked accounts (username/niche/subcategory/type/limit),
 * managed from the Accounts page. This is the source of truth for which
 * accounts sync pulls, replacing the old static data/accounts.json at runtime
 * (that file is now only used once, as seed data — see scripts/seed-accounts.js).
 */
async function readAccountsConfig() {
  const redis = getRedis();
  return (await redis.get(ACCOUNTS_CONFIG_KEY)) || [];
}

async function writeAccountsConfig(list) {
  const redis = getRedis();
  await redis.set(ACCOUNTS_CONFIG_KEY, list);
}

/** Reads the full cache: sync metadata + every tracked account's latest data. */
async function readCache() {
  const redis = getRedis();
  const meta = (await redis.get(META_KEY)) || {};
  const accounts = await readAccountsConfig();

  const keys = accounts.map((a) => accountKey(a.username));
  const values = keys.length ? await redis.mget(...keys) : [];
  const accountsData = values.filter(Boolean);

  return { updatedAt: meta.updatedAt || null, accounts: accountsData };
}

/** Deletes a tracked account's cached media (config removal is separate). */
async function deleteAccountCache(username) {
  const redis = getRedis();
  await redis.del(accountKey(username));
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
  readAccountsConfig,
  writeAccountsConfig,
  deleteAccountCache,
};
