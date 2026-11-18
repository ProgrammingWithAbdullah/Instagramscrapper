# Instagram Scrapper

A dashboard that tracks a curated list of **public** Instagram accounts (currently
50, across **Nutrition** and **Fitness** niches), pulls their recent posts/Reels via
Meta's official **Business Discovery API**, and lets you browse/filter/sort them by
engagement — similar in spirit to tools like Volume's Library view. Each post can also
get an on-demand **AI-generated "why this worked" breakdown** via Gemini. Runs locally
or deploys to Vercel (see [Deploying to Vercel](#deploying-to-vercel)).

This project only uses data Meta's own Business Discovery API exposes for public
Business/Creator accounts (profile stats + public post metadata). It does **not**
download or rehost video files — the "Open on Instagram" link always points at the
original post.

## How it works

1. `scripts/sync.js` (or the "Resync accounts" button in the UI, or the Vercel Cron
   job) calls Instagram's `business_discovery` field for every account in
   [`data/accounts.json`](data/accounts.json) and writes each account's result to
   **Upstash Redis** (one key per account, so a 50-account sync stays well inside a
   serverless function's time limit and a single failed account never wipes out the
   rest of the cache).
2. The Next.js API routes (`app/api/*`) read that cache, compute an engagement
   "multiplier" per post (its likes+comments vs. that account's own recent average),
   and apply whatever filters/sort the UI requests.
3. The UI (`app/page.js`) is a single-page library view: niche tabs, subcategory
   pills, Posted-by / Type / Account-size / Sort filters, a search box, and a
   responsive grid of post cards. Clicking a card opens a detail modal with stats and
   a button to generate an AI breakdown (cached in Redis after first generation, so
   you're not re-billed for the same post).

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

### 3. Get a Redis database (Upstash)

Posts and AI breakdowns are stored in Redis, not local files — same database whether
you're running locally or on Vercel.

- **Easiest if you're also deploying to Vercel**: skip this step for now and do it in
  [Deploying to Vercel](#deploying-to-vercel) below — the Marketplace integration
  creates the database and gives you a way to pull its credentials into `.env` locally
  too (`vercel env pull .env.development.local`).
- **Or create one directly**: sign up free at [upstash.com](https://upstash.com),
  create a Redis database, and copy its **REST URL** and **REST Token** from the
  database's dashboard.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `IG_BUSINESS_ACCOUNT_ID`, `IG_ACCESS_TOKEN`, `GEMINI_API_KEY`,
`KV_REST_API_URL`, and `KV_REST_API_TOKEN` in `.env`. **Never commit `.env`** — it's
already gitignored.

### 5. Pull the data

```bash
npm run sync
```

This fetches up to 50 recent posts per account for all 50 accounts and writes each
account into Redis. Takes well under a minute. Re-run it any time to refresh (or use
the "Resync accounts" button once the app is running).

### 6. Run the app

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

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this there) and
   [import it into Vercel](https://vercel.com/new).
2. In the Vercel project, go to **Storage** → **Create Database** (or **Marketplace**
   → search **Upstash**) → add an **Upstash Redis** database and connect it to this
   project. This automatically sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you
   — you don't need to copy/paste those two.
3. In **Settings → Environment Variables**, add the rest by hand:
   | Variable | Value |
   |---|---|
   | `IG_BUSINESS_ACCOUNT_ID` | same value as your local `.env` |
   | `IG_ACCESS_TOKEN` | same value as your local `.env` (remember it expires ~60 days — see step 2 of Setup) |
   | `GEMINI_API_KEY` | same value as your local `.env` |

   `CRON_SECRET` does **not** need to be added manually — Vercel sets it automatically
   the first time it detects a `crons` entry in `vercel.json` (already included in
   this repo) and attaches it to the cron request for you.
4. Deploy. The first deploy will show **0 posts** until data exists in Redis — either:
   - click **Resync accounts** in the deployed app once, or
   - wait for the daily cron job (`vercel.json` runs it at 06:00 UTC — edit the
     `schedule` there to change that; Hobby plan allows once/day), or
   - run `npm run sync` locally against the **same** Redis database (pull its
     credentials into your local `.env` with `vercel env pull .env.development.local`,
     or reuse the values you already have).
5. To develop locally against the same deployed database afterward:
   ```bash
   vercel link
   vercel env pull .env.development.local
   ```

## Project structure

```
app/                Next.js App Router pages + API routes
  api/posts/         GET filtered/sorted posts from the cache
  api/filters/       GET available niches/subcategories
  api/breakdown/     POST -> generate (or return cached) Gemini breakdown for a post
  api/sync/          POST -> trigger a full resync from the UI
  api/cron/sync/     GET -> same resync, called by Vercel Cron (protected by CRON_SECRET)
components/          PostCard, PostModal (React client components)
lib/                 instagram.js (Business Discovery), gemini.js, sync.js, store.js, kv.js, posts.js, format.js
data/accounts.json   the 50 tracked accounts (committed; this is the only thing in data/)
scripts/sync.js      CLI entry point for npm run sync
vercel.json          Cron schedule for the daily auto-resync
```

## Tech stack

- Next.js 15 (App Router, JavaScript, no TypeScript)
- Upstash Redis (via Vercel Marketplace, or standalone) for all synced data and cached AI breakdowns
- `@google/generative-ai` (Gemini) for on-demand content breakdowns
- Meta Graph API (Business Discovery) for Instagram data
