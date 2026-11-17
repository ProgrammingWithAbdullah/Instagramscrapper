const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(process.cwd(), "data", "cache.json");
const BREAKDOWNS_PATH = path.join(process.cwd(), "data", "breakdowns.json");

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readCache() {
  return readJsonSafe(CACHE_PATH, { updatedAt: null, accounts: [] });
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function readBreakdowns() {
  return readJsonSafe(BREAKDOWNS_PATH, {});
}

function writeBreakdown(postId, breakdown) {
  const all = readBreakdowns();
  all[postId] = breakdown;
  fs.mkdirSync(path.dirname(BREAKDOWNS_PATH), { recursive: true });
  fs.writeFileSync(BREAKDOWNS_PATH, JSON.stringify(all, null, 2), "utf-8");
}

module.exports = { readCache, writeCache, readBreakdowns, writeBreakdown, CACHE_PATH };
