# DEPLOY.md — Production Deployment Playbook

Step-by-step manual for taking LE-REMINDER from local dev to production: Turso (database) + Vercel (frontend/API). Phase 0.5 context: this app has exactly one authorized user, gated by GitHub OAuth + an email whitelist (see `packages/auth`, `CLAUDE.md`'s Phase 0.5 Constraints).

Do these in order — GitHub OAuth and Vercel env vars both depend on knowing your production URL, and the schema push depends on the Turso database existing.

---

## 1. Turso Production Setup

**Install the CLI** (skip if already installed):
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

**Create the production database:**
```bash
turso db create le-reminder-prod
```

**Get the connection URL:**
```bash
turso db show le-reminder-prod --url
# → libsql://le-reminder-prod-<your-org>.turso.io
```

**Get an auth token:**
```bash
turso db tokens create le-reminder-prod
# → a long JWT — this is TURSO_AUTH_TOKEN
```

**Push the schema** (routines, completion_events, and the Phase 0.5 auth tables — user/session/account/verification, plus todos):

Run this from the repo root. Pass the production credentials inline on the command — **do not** write them into `apps/web/.env`, which is reserved for the local SQLite file per the local/production DB separation rule. Mixing them risks a local `bun dev` accidentally writing to production data.

```bash
DATABASE_URL="libsql://le-reminder-prod-<your-org>.turso.io" \
TURSO_AUTH_TOKEN="<the-token-from-above>" \
bun run db:push
```

Confirm it worked:
```bash
turso db shell le-reminder-prod ".tables"
# → routines, completion_events, user, session, account, verification, todos
```

Re-run `bun run db:push` (with the same inline env vars) any time `packages/db/src/schema/*` changes and needs to reach production — it's not part of the Vercel build step, so it won't happen automatically on deploy.

---

## 2. GitHub OAuth Setup

You already have a GitHub OAuth App for local dev (`http://localhost:3001` callback). For production:

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → your OAuth App (or **New OAuth App** if you'd rather keep dev and prod separate — recommended, so testing locally never risks breaking the prod callback).
2. Set **Homepage URL** to your Vercel production domain, e.g. `https://le-reminder.vercel.app`.
3. Set **Authorization callback URL** to:
   ```
   https://le-reminder.vercel.app/api/auth/callback/github
   ```
   (swap in your actual production domain — the exact one Vercel assigns or your custom domain, once attached).
4. If you reused the existing app, note the callback URL change means local dev sign-in will break until you switch it back (or add a second callback if GitHub's OAuth App settings allow multiple — they don't for classic OAuth Apps, one more reason a second app is cleaner).
5. Copy the app's **Client ID** and (regenerate if needed) **Client Secret** — these go into Vercel in the next step.

---

## 3. Vercel Deployment

**Project setup:**
- Import the GitHub repo into Vercel.
- **Root Directory**: `apps/web` (this is a Bun workspace monorepo — the Next.js app doesn't live at the repo root).
- Framework Preset: Next.js (auto-detected).

**Environment Variables** — paste all of these into Vercel's dashboard (Project → Settings → Environment Variables), scoped to Production (and Preview if you want PR previews to also require auth against the same whitelist):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://le-reminder-prod-<your-org>.turso.io` (from Step 1) |
| `TURSO_AUTH_TOKEN` | The token from Step 1 |
| `BETTER_AUTH_SECRET` | A fresh secret — `openssl rand -base64 32`. **Do not reuse your local dev secret.** |
| `BETTER_AUTH_URL` | Your production URL, e.g. `https://le-reminder.vercel.app` (no trailing slash) |
| `GITHUB_CLIENT_ID` | From Step 2 |
| `GITHUB_CLIENT_SECRET` | From Step 2 |
| `ALLOWED_EMAIL` | The one GitHub account email allowed to sign in |
| `VIN_SECRET_KEY` | A fresh secret — `openssl rand -base64 32`. Bearer credential for VIN's `POST /api/agent/routines`. **Do not reuse your local dev value.** |
| `AGENT_USER_ID` | Any stable non-secret identifier (e.g. `vin-agent`) — not a real user id, see `apps/web/src/app/api/agent/routines/route.ts`'s comment. VIN must send this exact value back in its request body. |

**Deploy**, then verify:
- Visiting the production URL redirects to `/login` (proxy gating working — see `apps/web/src/proxy.ts`).
- "Continue with GitHub" completes the OAuth round-trip and lands on `/` (whitelist + session working).
- A GitHub account other than `ALLOWED_EMAIL` is rejected at sign-in (test this once, from a second account if you have one — it's the whole point of this phase).
- `POST /api/agent/routines` with the right `Authorization: Bearer <VIN_SECRET_KEY>` and matching `userId` in the body creates a routine; wrong bearer, wrong `userId`, or a missing/invalid body all get rejected (401/400) without touching the database.

**One thing the CI workflow does *not* do by itself**: `.github/workflows/ci.yml` failing doesn't automatically stop Vercel from deploying — GitHub Actions and Vercel's Git integration are separate systems. To actually make broken code block production, add a GitHub branch protection rule on `main` (Settings → Branches → Branch protection rules) requiring the `Type Check` and `Lint & Format` checks to pass before merging. Vercel's production deploy is normally tied to pushes on `main`, so gating merges to `main` is what gates production.
