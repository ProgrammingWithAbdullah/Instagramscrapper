# Instagram Scrapper

A local dashboard that tracks a curated list of **public** Instagram accounts (currently
50, across **Nutrition** and **Fitness** niches), pulls their recent posts/Reels via
Meta's official **Business Discovery API**, and lets you browse/filter/sort them by
engagement — similar in spirit to tools like Volume's Library view. Each post can also
get an on-demand **AI-generated "why this worked" breakdown** via Gemini.

This project only uses data Meta's own Business Discovery API exposes for public
Business/Creator accounts (profile stats + public post metadata). It does **not**
download or rehost video files — the "Open on Instagram" link always points at the
original post.

## How it works

1. `scripts/sync.js` (or the "Resync accounts" button in the UI) calls Instagram's
   `business_discovery` field for every account in [`data/accounts.json`](data/accounts.json)
   and writes the result to `data/cache.json` (gitignored — it's local cache, not
   source data).
2. The Next.js API routes (`app/api/*`) read that cache, compute an engagement
   "multiplier" per post (its likes+comments vs. that account's own recent average),
   and apply whatever filters/sort the UI requests.
3. The UI (`app/page.js`) is a single-page library view: niche tabs, subcategory
   pills, Posted-by / Type / Account-size / Sort filters, a search box, and a
   responsive grid of post cards. Clicking a card opens a detail modal with stats and
   a button to generate an AI breakdown (cached to `data/breakdowns.json` after first
   generation, so you're not re-billed for the same post).

### Known data limits (by design, not a bug)

- **No raw view/play counts.** Business Discovery does not expose video view counts
  for accounts you don't own — only `like_count` and `comments_count` are available.
  Ranking is therefore based on an **engagement multiplier** (this post's
  likes+comments vs. that account's own recent average), not literal "views".
- **Feed posts vs. Reels** are distinguished using the `media_product_type` field
  (`FEED` vs `REELS`), which is reliable and tested.
- **Stories are not available** at all via Business Discovery (ephemeral content
  isn't exposed through this endpoint regardless of account type).
- The AI breakdown is generated from **caption + metadata only** (Gemini cannot watch
  the actual video/image) — it's a best-effort, labeled analysis, not a transcript.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get your Meta credentials

You need one Instagram **Business/Creator** account linked to a Facebook Page you
manage — this is just your "calling" identity for the API, it has nothing to do with
the accounts you're monitoring.

1. Create a Meta app at [developers.facebook.com/apps](https://developers.facebook.com/apps)
   (type: Business), under "API setup with Facebook login," add these permissions:
   `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`,
   `pages_show_list`, `business_management`.
2. In [Graph API Explorer](https://developers.facebook.com/tools/explorer), select
   your app, add the same 5 permissions, and run:
   ```
   me/accounts?fields=name,instagram_business_account
   ```
   The `instagram_business_account.id` in the response is your `IG_BUSINESS_ACCOUNT_ID`.
3. **Get a long-lived token** (Graph API Explorer's default token only lasts ~1 hour).
   Exchange your short-lived token for a 60-day one:
   ```
   GET https://graph.facebook.com/v23.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=YOUR_APP_ID
     &client_secret=YOUR_APP_SECRET
     &fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
   ```
   Use the `access_token` from the response as `IG_ACCESS_TOKEN`. You'll need to
   repeat this (or set up a System User token in Business Manager, which doesn't
   expire) every ~60 days.
4. Get a Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `IG_BUSINESS_ACCOUNT_ID`, `IG_ACCESS_TOKEN`, and `GEMINI_API_KEY` in `.env`.
**Never commit `.env`** — it's already gitignored.

### 4. Pull the data

```bash
npm run sync
```

This fetches up to 50 recent posts per account for all 50 accounts into
`data/cache.json`. Takes a minute or two. Re-run it any time to refresh (or use the
"Resync accounts" button once the app is running).

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Editing the tracked accounts

Edit [`data/accounts.json`](data/accounts.json) — each entry is:

```json
{ "username": "someaccount", "niche": "Fitness", "subcategory": "Strength", "type": "creator" }
```

`niche` and `subcategory` drive the filter pills in the UI; `type` is `"creator"` or
`"brand"` and feeds the "Posted by" filter. Re-run `npm run sync` after editing.

## Project structure

```
app/                Next.js App Router pages + API routes
  api/posts/         GET filtered/sorted posts from cache
  api/filters/       GET available niches/subcategories
  api/breakdown/     POST -> generate (or return cached) Gemini breakdown for a post
  api/sync/          POST -> trigger a full resync from the UI
components/          PostCard, PostModal (React client components)
lib/                 instagram.js (Business Discovery), gemini.js, sync.js, store.js, posts.js, format.js
data/accounts.json   the 50 tracked accounts (committed)
data/cache.json      fetched post data (gitignored, generated by sync)
scripts/sync.js      CLI entry point for npm run sync
```

## Tech stack

- Next.js 14 (App Router, JavaScript, no TypeScript)
- Plain JSON-file storage for the local cache (no database server required)
- `@google/generative-ai` (Gemini) for on-demand content breakdowns
- Meta Graph API (Business Discovery) for Instagram data
