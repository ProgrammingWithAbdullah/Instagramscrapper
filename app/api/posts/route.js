import { NextResponse } from "next/server";
import { getAllPosts } from "../../../lib/posts";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const niche = searchParams.get("niche"); // "Nutrition" | "Fitness" | null
  const subcategory = searchParams.get("subcategory"); // or null
  const postedBy = searchParams.get("postedBy") || "everyone"; // everyone|creators|brands
  const type = searchParams.get("type") || "any"; // any|post|reel
  const accountSize = searchParams.get("accountSize") || "any"; // any|under_10k|10k_100k|100k_plus
  const sort = searchParams.get("sort") || "best"; // best|newest|likes|comments|rate
  const search = (searchParams.get("search") || "").toLowerCase().trim();

  const { updatedAt, rows } = await getAllPosts();

  let filtered = rows.filter((row) => {
    if (niche && row.account.niche !== niche) return false;
    if (subcategory && row.account.subcategory !== subcategory) return false;
    if (postedBy === "creators" && row.account.type !== "creator") return false;
    if (postedBy === "brands" && row.account.type !== "brand") return false;
    if (type === "post" && row.media_product_type !== "FEED") return false;
    if (type === "reel" && row.media_product_type !== "REELS") return false;
    if (accountSize !== "any" && row.account.follower_bucket !== accountSize)
      return false;
    if (
      search &&
      !row.account.username.toLowerCase().includes(search) &&
      !(row.caption || "").toLowerCase().includes(search)
    )
      return false;
    return true;
  });

  const sorters = {
    best: (a, b) => b.multiplier - a.multiplier,
    newest: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    likes: (a, b) => b.like_count - a.like_count,
    comments: (a, b) => b.comments_count - a.comments_count,
    rate: (a, b) => b.engagement_rate - a.engagement_rate,
  };
  filtered.sort(sorters[sort] || sorters.best);

  return NextResponse.json({ updatedAt, count: filtered.length, posts: filtered });
}
