const { GoogleGenerativeAI } = require("@google/generative-ai");

const BREAKDOWN_SCHEMA = `Return ONLY valid JSON (no markdown fences) matching exactly this shape:
{
  "why_it_worked": "1-2 sentence explanation of why this post likely performed well for this account",
  "format": "short label, e.g. 'Talking head', 'Carousel listicle', 'Before/after', 'Meme/relatable', 'Tutorial'",
  "hook": "a short quoted guess at the opening hook/line, based on the caption and media type",
  "first_two_seconds": "one sentence describing what a viewer likely sees/reads first",
  "beats": ["3-5 short strings, each one beat/step of how the post is structured, in order"],
  "script_to_copy": "a short reusable script/template another creator in the same niche could adapt, 2-4 sentences"
}`;

function buildPrompt(post, account) {
  const engagement = post.like_count + post.comments_count;
  const avg = account.avg_engagement || 0;
  const multiplier = avg > 0 ? (engagement / avg).toFixed(1) : "N/A";

  return `You are a short-form social content strategist. Analyze this Instagram post and explain why it likely worked, using ONLY the metadata given below (you cannot watch the video or see the image). Be specific and concrete, not generic. If the media type is VIDEO or REELS, infer a plausible hook/structure from the caption and typical patterns for this niche; say "likely" rather than asserting you saw it.

Account: @${account.username} (niche: ${account.niche}, subcategory: ${account.subcategory})
Account average engagement (likes+comments) across their recent posts: ${avg}
This post's engagement: ${engagement} (${multiplier}x their average)
Media type: ${post.media_type} / ${post.media_product_type}
Likes: ${post.like_count} | Comments: ${post.comments_count}
Caption: """${(post.caption || "(no caption)").slice(0, 1200)}"""

${BREAKDOWN_SCHEMA}`;
}

async function generateBreakdown(post, account) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment (.env).");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(buildPrompt(post, account));
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned non-JSON output: " + text.slice(0, 200));
  }
}

module.exports = { generateBreakdown };
