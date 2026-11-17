import { NextResponse } from "next/server";
import { findPostAndAccount } from "../../../lib/posts";
import { readBreakdowns, writeBreakdown } from "../../../lib/store";
import { generateBreakdown } from "../../../lib/gemini";

export async function POST(request) {
  const { postId } = await request.json();
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const cached = readBreakdowns();
  if (cached[postId]) {
    return NextResponse.json({ breakdown: cached[postId], cached: true });
  }

  const found = findPostAndAccount(postId);
  if (!found) {
    return NextResponse.json({ error: "Post not found in cache" }, { status: 404 });
  }

  try {
    const breakdown = await generateBreakdown(found.post, found.account);
    writeBreakdown(postId, breakdown);
    return NextResponse.json({ breakdown, cached: false });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
