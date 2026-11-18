import { NextResponse } from "next/server";
import { runSync } from "../../../lib/sync";

export const maxDuration = 60; // syncing ~50 accounts at concurrency 5

// Triggers a full resync of all accounts. Can take a while (50 accounts x ~0.4s
// delay each, plus network time) — intended for occasional manual use from the UI.
export async function POST() {
  try {
    const summary = await runSync();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
