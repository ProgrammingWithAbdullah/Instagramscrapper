import { NextResponse } from "next/server";
import accounts from "../../../data/accounts.json";

// Returns the available niches and their subcategories, derived from the
// static accounts list (not the cache), so filters show up even before the
// first sync has run.
export async function GET() {
  const byNiche = {};

  for (const account of accounts) {
    if (!byNiche[account.niche]) byNiche[account.niche] = new Set();
    byNiche[account.niche].add(account.subcategory);
  }

  const niches = Object.entries(byNiche).map(([niche, subs]) => ({
    niche,
    subcategories: Array.from(subs).sort(),
  }));

  return NextResponse.json({ niches });
}
