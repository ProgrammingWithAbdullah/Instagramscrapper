import { NextResponse } from "next/server";
import {
  readAccountsConfig,
  writeAccountsConfig,
  deleteAccountCache,
} from "../../../lib/store";

export async function GET() {
  const accounts = await readAccountsConfig();
  return NextResponse.json({ accounts });
}

function normalizeUsername(raw) {
  return String(raw || "").trim().replace(/^@/, "");
}

// Replaces the whole tracked-accounts list in one call (the Accounts page
// edits a local table and saves it all at once, rather than one row per
// request). Accounts removed from the new list have their cached media
// cleaned up; accounts that stick around keep whatever was last synced.
export async function PUT(request) {
  const body = await request.json();
  const incoming = Array.isArray(body.accounts) ? body.accounts : null;
  if (!incoming) {
    return NextResponse.json({ error: "Body must be { accounts: [...] }" }, { status: 400 });
  }

  const seen = new Set();
  const cleaned = [];
  for (const raw of incoming) {
    const username = normalizeUsername(raw.username);
    if (!username) {
      return NextResponse.json({ error: "Every account needs a username" }, { status: 400 });
    }
    if (seen.has(username)) {
      return NextResponse.json({ error: `Duplicate account: @${username}` }, { status: 400 });
    }
    seen.add(username);

    const limit = Math.max(1, Math.min(Number(raw.limit) || 50, 50));
    cleaned.push({
      username,
      niche: String(raw.niche || "").trim() || "Uncategorized",
      subcategory: String(raw.subcategory || "").trim() || "General",
      type: raw.type === "brand" ? "brand" : "creator",
      limit,
    });
  }

  const previous = await readAccountsConfig();
  const previousUsernames = new Set(previous.map((a) => a.username));
  const nextUsernames = new Set(cleaned.map((a) => a.username));
  const removed = [...previousUsernames].filter((u) => !nextUsernames.has(u));

  await writeAccountsConfig(cleaned);
  await Promise.all(removed.map((username) => deleteAccountCache(username)));

  return NextResponse.json({ accounts: cleaned, removed });
}
