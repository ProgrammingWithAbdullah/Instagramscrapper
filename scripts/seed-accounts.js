// One-time bootstrap: if Redis has no accounts config yet, seed it from
// data/accounts.json (the original hardcoded list), adding the default
// per-account post limit (50). Safe to re-run — it's a no-op if accounts
// are already configured, so it never clobbers edits made from the UI.
// Run with: npm run seed

require("dotenv").config({ path: ".env" });

const seedAccounts = require("../data/accounts.json");
const { readAccountsConfig, writeAccountsConfig } = require("../lib/store");

async function main() {
  const existing = await readAccountsConfig();
  if (existing.length > 0) {
    console.log(
      `Accounts config already has ${existing.length} accounts — not overwriting. ` +
        "Delete the 'ig:accounts:config' Redis key first if you really want to reseed."
    );
    return;
  }

  const seeded = seedAccounts.map((a) => ({ ...a, limit: 50 }));
  await writeAccountsConfig(seeded);
  console.log(`Seeded ${seeded.length} accounts into Redis from data/accounts.json.`);
}

main().catch((err) => {
  console.error("Seed script crashed:", err);
  process.exit(1);
});
