# The Shrinking Word

A daily browser-based word puzzle game. Each day, players reduce a 7-letter word to a single letter by removing one letter at a time — each step forming a valid English word.

**Stack:** React + TypeScript + Vite · AWS Amplify Gen 2 · Supabase · Anthropic Claude API

---

## Local Setup

### 1. Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com)
- A [Supabase](https://supabase.com) project
- AWS account with Amplify access

### 2. Clone and install

```bash
git clone <your-repo-url>
cd shrinking-word
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your credentials:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings
- `ANTHROPIC_API_KEY` from the Anthropic console
- `ADMIN_SECRET` — generate with `openssl rand -hex 32`
- `VITE_*_URL` — fill in after deploying the backend (see Deploy section)

### 4. Set up Supabase database

In your Supabase project SQL editor, run the migration:

```sql
-- Copy contents of supabase/migrations/001_init.sql and execute
```

### 5. Generate the word list module

The ENABLE word list (public domain) is in `public/wordlist.txt`. Generate the Lambda-bundled version:

```bash
npm run generate-wordlist
```

This creates `amplify/functions/shared/wordlist-data.ts` (auto-generated, do not edit manually).

### 6. Seed initial puzzle data

```bash
npm run seed
```

This inserts 7 days of pre-validated puzzles into Supabase.

### 7. Run locally

```bash
npm run dev
```

The frontend will load at `http://localhost:5173`. Note: the game requires the backend Lambda functions to be running — use the Amplify sandbox (see Deploy section) or mock the API calls locally.

---

## Deployment (AWS Amplify)

### Backend (Lambda functions + EventBridge cron)

```bash
# Deploy to sandbox (for development)
npx ampx sandbox

# Or deploy to a named branch
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
```

After deploying, note the function URLs output by Amplify. Copy them into your `.env` as the `VITE_*_URL` variables.

### Frontend (Amplify Hosting)

1. Push this repository to GitHub/GitLab/CodeCommit
2. In the AWS Amplify Console, connect your repository
3. Amplify will use `amplify.yml` for the build configuration
4. Set environment variables in the Amplify Console under **Environment variables**

---

## Generating a Puzzle Manually

The puzzle generation Lambda runs automatically at **00:00 UTC daily** via EventBridge Scheduler.

To trigger it manually (useful during development):

```bash
curl -X POST "${VITE_GENERATE_PUZZLE_URL}" \
  -H "x-admin-secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json"
```

This generates tomorrow's puzzle using Claude (`claude-sonnet-4-6`) and stores it in Supabase.

---

## Architecture

```
Frontend (React SPA)
  ├── Vite build → Amplify Hosting (S3 + CloudFront)
  ├── /wordlist.txt → client-side dictionary (ENABLE, public domain)
  └── Calls Lambda function URLs:
       ├── GET  /get-puzzle       → today's word
       ├── POST /submit-score     → leaderboard entry
       └── GET  /get-leaderboard  → ranked scores

Backend (AWS Amplify Gen 2)
  ├── get-puzzle Lambda           → Supabase query
  ├── generate-puzzle Lambda      → Claude API + BFS validator + Supabase
  ├── submit-score Lambda         → IP hashing + Supabase insert
  ├── get-leaderboard Lambda      → Supabase query
  └── EventBridge Scheduler       → daily cron at 00:00 UTC
```

### Dictionary

The app uses the **ENABLE** (Enhanced North American Benchmark LExicon) word list, which is in the public domain. Single letters "A" and "I" are explicitly included as valid words.

- Client-side: fetched from `/wordlist.txt` at startup, parsed into a `Set<string>`
- Server-side: bundled via `amplify/functions/shared/wordlist-data.ts` (auto-generated)

### Puzzle Generation

1. Claude (`claude-sonnet-4-6`, temperature 0.9) generates a candidate 7-letter word
2. BFS solvability validator confirms at least one valid path exists
3. If invalid, retry up to 5 times with failure context
4. If all retries fail, select from a pre-validated fallback word list
5. Store in Supabase with tomorrow's date

### Scoring & Leaderboard

- No login required
- One submission per IP per day (soft constraint via hashed IP)
- Ranking: fastest time → fewest steps → earliest submission
- Player name stored in `localStorage` for returning players

---

## Environment Variables Reference

| Variable | Where Used | Description |
|---|---|---|
| `SUPABASE_URL` | Lambda | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Lambda | Full database access key (server-side only) |
| `ANTHROPIC_API_KEY` | generate-puzzle Lambda | Anthropic API key |
| `ADMIN_SECRET` | generate-puzzle Lambda | Secret for manual puzzle trigger |
| `ALLOWED_ORIGIN` | Lambda (CORS) | Allowed frontend origin (use `*` in dev) |
| `VITE_GET_PUZZLE_URL` | Frontend | Lambda function URL for get-puzzle |
| `VITE_SUBMIT_SCORE_URL` | Frontend | Lambda function URL for submit-score |
| `VITE_GET_LEADERBOARD_URL` | Frontend | Lambda function URL for get-leaderboard |
| `VITE_GENERATE_PUZZLE_URL` | Frontend (admin) | Lambda function URL for generate-puzzle |
