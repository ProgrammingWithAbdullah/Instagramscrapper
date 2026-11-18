import { NextResponse } from "next/server";
import { runSync } from "../../../../lib/sync";

export const maxDuration = 60;

// Vercel Cron hits this on schedule (see vercel.json) with
// `Authorization: Bearer $CRON_SECRET` automatically attached once
// CRON_SECRET is set as an env var on the project.
export async function GET(request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runSync();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
