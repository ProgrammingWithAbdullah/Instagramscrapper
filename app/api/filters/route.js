import { NextResponse } from "next/server";
import { readAccountsConfig } from "../../../lib/store";

// Returns the available niches and their subcategories, derived from the
// current (dynamic, user-editable) accounts list.
export async function GET() {
  const accounts = await readAccountsConfig();
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
