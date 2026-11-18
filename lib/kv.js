const { Redis } = require("@upstash/redis");

let client = null;

/**
 * Upstash Redis client. Works both with the modern Vercel Marketplace
 * (Upstash) env var names and the legacy "Vercel KV" names that the
 * integration still writes for backwards compatibility.
 */
function getRedis() {
  if (client) return client;

  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN) in environment."
    );
  }

  client = new Redis({ url, token });
  return client;
}

module.exports = { getRedis };
