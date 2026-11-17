// Pulls the latest posts/Reels for every account in data/accounts.json via
// Instagram's Business Discovery API and writes the result to data/cache.json.
// Run with: npm run sync

require("dotenv").config({ path: ".env" });

const { runSync } = require("../lib/sync");

async function main() {
  const summary = await runSync({
    onProgress: ({ username, ok, count, error }) => {
      console.log(ok ? `@${username}: ok (${count} posts)` : `@${username}: FAILED - ${error}`);
    },
  });
  console.log(
    `\nDone. ${summary.synced}/${summary.total} accounts in cache, ${summary.failures} failed this run.`
  );
  console.log("Cache written to data/cache.json");
}

main().catch((err) => {
  console.error("Sync script crashed:", err);
  process.exit(1);
});
