# Phase 0.5 Retrospective — Locking Down LE-REMINDER

Covers the arc from "Phase 0 is deployed and open to anyone" to "single
whitelisted owner, CI pipeline, tablet-optimized, VIN has a scoped API" —
six commits, `b4142e0..96ac486` plus one follow-up audit commit, ~2,100
lines across 47 files, all on 2026-07-18.

This is written to be studied, not skimmed once. It covers what was built,
why each non-obvious decision went the way it did, two things that broke
in production and exactly why, and what's deliberately *not* fixed —
because "finished" for a single-user Phase 0 project doesn't mean "every
theoretical edge case is closed," and pretending otherwise would be the
least useful thing this document could do.

---

## 1. What shipped, in commit order

| Commit | What | Why it's its own slice |
|---|---|---|
| `1649970` | Better Auth (GitHub OAuth + email whitelist), `packages/auth`, `protectedProcedure`, `/login` + `/auth/loading`, Today's To-Do moved off localStorage onto Turso | The actual lockdown — everything else this phase depends on this landing first |
| `41b552d` | CI pipeline (typecheck + biome on push/PR to `main`), `DEPLOY.md` | Deploy readiness, no product code touched |
| `e811a4a` | Idle dimmer, query throttling, M2M agent API for VIN | Tablet kiosk mode + the automation surface, independent of auth internals |
| `9c78236` | Fix: `/auth/loading` hung forever after a real, successful OAuth round-trip | A production bug found by actually using the deployed app — see §3.2 |
| `96ac486` | Track the generated migration for the auth/todo tables | Repo hygiene — production was already fixed by hand; this just makes the repo match reality |
| `4c6e3eb` | `GET` on both agent routes, optimistic updates for routine complete/delete/pause | Requested after using the write-only agent API and feeling the mutation latency |
| *(unlabeled, this doc)* | 8-angle audit pass: 6 real bugs fixed, 3 documented as deliberate boundaries | See §4 |

---

## 2. Architecture decisions, and why they went the way they did

### 2.1 Better Auth lives in `packages/auth`, not `packages/core`

`packages/core` is the zero-dependency DDD/hexagonal domain — `Routine`,
`CompletionEvent`, `computeRoutineStatus`, none of it framework-aware.
Better Auth is inherently infrastructure: it needs a Next.js route
handler, a Drizzle adapter, environment secrets. Putting it in
`packages/core` would have meant either polluting the domain with
framework imports (a direct CLAUDE.md violation) or building an awkward
port/adapter abstraction for something that's never going to have a
second implementation.

The alternative on the table was `apps/web/src/lib/auth.ts` — simpler,
fewer moving parts. `packages/auth` won because this repo already had a
working precedent for "infra that isn't domain but isn't UI either":
`packages/db` holds the Turso/Drizzle adapters the same way. Consistency
with an existing, already-approved pattern beat a marginally simpler
one-off.

### 2.2 GitHub OAuth only, whitelist enforced server-side

Single provider (not Google, not both) — this is a personal tool with one
operator, so provider choice doesn't need to hedge against anything. The
whitelist check lives in `databaseHooks.user.create.before`
(`packages/auth/src/auth.ts`), not a UI-level "hide the button" check,
specifically so it can't be bypassed by hitting
`/api/auth/callback/github` directly. It fires once, at first-ever
account creation — after that, the whitelisted account signs in normally
on any number of devices, no re-check needed (see §5.1).

### 2.3 Today's To-Do moved from localStorage to Turso

This reversed an explicit prior decision (`todo-sidebar.tsx` used to have
a comment saying it stays local-only "by design"). The reversal was
correct once auth existed — "the same list across sessions for this
account" only means something once there's an account. The `todos` table
has no domain/use-case layer behind it (unlike `Routine`) — it's plain
text with a `userId` FK, deliberately not wrapped in the
Capture→Draft→Knowledge pipeline CLAUDE.md's older Data Rules describe,
because that pipeline predates the Phase 0 reset and doesn't describe
anything that exists in this codebase anymore. `CLAUDE.md` now has an
explicit carve-out saying so, instead of silently contradicting itself.

### 2.4 The Agent API is its own inbound adapter, not a tRPC procedure

VIN (the owner's automation agent) needed a way in that doesn't require a
browser session — OAuth doesn't make sense for a non-interactive caller.
`apps/web/src/app/api/agent/{routines,todos}/route.ts` are plain Next.js
route handlers, gated by a static bearer secret compared via hashed
`timingSafeEqual` (not `===` — a naive comparison leaks the secret's
length and content through response timing). They call the *exact same*
use cases (`createRoutineUseCase`, `listRoutinesUseCase`) the tRPC router
uses — no parallel business logic, just a second inbound adapter, which
is precisely what hexagonal architecture is supposed to make cheap to
add.

`AGENT_USER_ID` is not a database column — `routines` has no per-user
ownership at all (Phase 0.5 is still single-tenant by design, see §5.2).
It's an intent-confirmation string the agent echoes back alongside the
bearer secret. This was a deliberate, surfaced trade-off, not an
oversight — and the final audit (§4) still found one place where that
trade-off had eroded further than intended (the todos endpoint), which
got fixed.

---

## 3. Two things broke in production. Here's exactly why.

Both were caught by actually using the deployed app, not by review or
typechecking — worth internalizing as a pattern, not just a fact about
this project.

### 3.1 `db:push` hung against the real Turso database, no usable error

Symptom: `bun run db:push` against the production `libsql://` URL spun on
"Pulling schema from database..." and exited 1 with no error text
visible in the terminal (spinner redraws had likely overwritten it).

What actually fixed it, without ever fully identifying drizzle-kit's
internal failure mode: `turso db shell <db> ".tables"` worked fine with
the same credentials — proving the token and connectivity were never the
problem. That isolated the failure to `drizzle-kit push`'s own remote
schema-diffing step specifically. The fix was to sidestep it entirely:
`drizzle-kit generate` (pure local diffing, no network) produced a plain
`.sql` file, which was applied with `turso db shell <db> < file.sql` —
the exact command already proven to work.

**Lesson**: when a tool fails opaquely against a remote target, don't
keep retrying the same tool with different flags — find a simpler tool
that already works against the same target (here, `turso db shell`) and
use it to bypass the broken step instead of debugging it blind.

### 3.2 `/auth/loading` hung forever after a real, successful GitHub login

Symptom: after GitHub OAuth completed successfully (confirmed — the
session existed), the browser sat on `/auth/loading` indefinitely instead
of redirecting to `/`.

Root cause: a React `useEffect` both *read* `phase` in its guard
condition and *wrote* `phase` via `setPhase("shown")`, while listing
`phase` in its own dependency array:

```ts
useEffect(() => {
  if (isPending || phase !== "waiting") return;
  const timer = setTimeout(() => setPhase("exiting"), SHOWN_DURATION_MS);
  setPhase("shown");
  return () => clearTimeout(timer);
}, [isPending, phase]);
```

`setPhase("shown")` changes a dependency of the same effect, so React
re-runs it — and runs the *previous* run's cleanup first, which calls
`clearTimeout` on the timer that had just been scheduled a moment
earlier. The timer that was supposed to advance the page to `"exiting"`
never survives long enough to fire. `phase` gets stuck on `"shown"`
forever; the second effect (gated on `phase === "exiting"`) never runs;
no redirect ever happens.

Fix: gate the effect on `isPending` alone via a one-shot `useRef` guard,
so it can't retrigger itself:

```ts
const startedRef = useRef(false);
useEffect(() => {
  if (isPending || startedRef.current) return;
  startedRef.current = true;
  setPhase("shown");
  const timer = setTimeout(() => setPhase("exiting"), SHOWN_DURATION_MS);
  return () => clearTimeout(timer);
}, [isPending]);
```

**Lesson**: an effect that writes to a piece of state it also reads in
its own dependency array is a self-triggering loop waiting to happen —
worth a specific mental check ("does this effect's own state write
appear in its own deps?") any time an effect both sets and depends on the
same variable. This one wasn't caught by `tsc` or `biome` — types and
lint rules don't know about effect re-run semantics; only running the
actual code surfaced it.

---

## 4. The final audit: 8 angles, 8 real findings, 6 fixed

Before calling this "done," the full diff (`b4142e0..HEAD` at the time)
went through 8 independent review passes — 3 correctness angles
(line-by-line, removed-behavior, cross-file tracing), reuse,
simplification, efficiency, altitude, and a CLAUDE.md-conventions check.
One disagreement between two agents (whether `todo.toggle`'s write was
correctly scoped) was resolved by reading the actual file directly rather
than trusting either agent's claim.

**Fixed, all live-verified against a real SQLite DB and/or a running dev
server — not just typechecked:**

1. **Case-sensitive email whitelist** (`packages/auth/src/auth.ts`) —
   Better Auth lowercases the incoming GitHub email before the whitelist
   hook runs; `ALLOWED_EMAIL` wasn't normalized to match. A mixed-case env
   var would have permanently locked out the one account the whitelist
   exists to admit. Fixed by lowercasing both sides of the comparison.
2. **`todo.toggle` wrote without a userId scope** — ownership was checked
   via a separate read, but the mutating `UPDATE` itself had no `userId`
   condition (unlike `delete`, which did). Inert today (single-tenant),
   but a live IDOR the moment a second account exists. Collapsed into one
   atomic `UPDATE ... WHERE id = ? AND userId = ?` using SQL `NOT` —
   fixes the scoping gap and cuts the round-trip count in half. Verified
   directly: a wrong-owner toggle attempt now affects 0 rows, and a
   follow-up toggle proves the value was never touched.
3. **Dashboard dead-ended on an expired session** — `proxy.ts` only
   checks that a cookie is *present*, not valid; an expired session threw
   `UNAUTHORIZED` from `routine.list`, and the UI showed a generic
   "couldn't load" error with an infinite Retry loop instead of sending
   the user back to `/login`. Fixed with an effect that watches for that
   specific error code. Verified the exact error shape (`data.code ===
   "UNAUTHORIZED"`) against a live, unauthenticated tRPC call.
4. **Login button could hang forever** — no `try/catch` around the OAuth
   redirect call; a failed redirect (network blip, misconfigured OAuth
   app) left the button disabled with no way to retry short of a page
   reload. Fixed with `try/catch/finally` and a toast.
5. **Agent routes had no error handling** — a Turso blip mid-request
   would've fallen through to Next.js's default error page instead of the
   structured JSON error shape every other path in those routes returns.
   Wrapped the use-case calls in `try/catch`.
6. **No session cookie cache** — every `protectedProcedure` call paid for
   a full database round trip just to validate the session, on top of the
   actual query. This was very likely part of the latency that prompted
   the optimistic-update work in commit `4c6e3eb` in the first place.
   Enabled Better Auth's `session.cookieCache` (300s, matching the
   idle-dimmer/staleTime cadence already used elsewhere).

**Also fixed as part of the same pass (lower severity, still real):**

7. Three copies of the agent bearer+userId auth check, across two files,
   collapsed into one `authorizeAgentRequest()` — the file's own comment
   already warned against exactly this duplication.
8. `GET /api/agent/todos` had no `WHERE` clause at all, relying entirely
   on a comment ("single-tenant, so unfiltered is safe") rather than a
   query condition. Now resolves the real owner's Better Auth user id
   from `ALLOWED_EMAIL` and filters by it — correct regardless of tenant
   count, not just correct today.
9. The bearer secret was re-hashed on every single agent API request;
   hoisted the hash to module scope.
10. CI had no dependency caching, re-downloading the full monorepo tree
    on every push. Added `actions/cache` keyed on `bun.lock`.

---

## 5. Known limitations — deliberate, not bugs

Worth reading in full before assuming anything here is "still broken."

### 5.1 Multiple devices, one account — expected and fine

No session-limiting config exists in `packages/auth/src/auth.ts`. Each
device gets its own independent session row; all are valid
simultaneously. The whitelist only runs once, at account creation — every
subsequent GitHub sign-in for the same email just authenticates normally.

### 5.2 `Routine` has no owner column — single-tenant is structural, not incidental

`packages/api/src/routers/routine.ts` switched every procedure from
`publicProcedure` to `protectedProcedure`, which checks "is someone
logged in," not "does this person own this routine" — because the
`Routine` aggregate has no `userId` anywhere, domain through database
(confirmed: zero occurrences of `userId` under `packages/core/src`). This
is invisible today because `ALLOWED_EMAIL` whitelists exactly one
account. It stops being invisible the moment a second account is ever
authenticated (a config change, not a code change) — that account would
see, edit, and delete the first account's routines with no isolation and
no error.

This was **not** fixed in the audit pass, on purpose: fixing it means
adding a `userId` column to the `Routine` domain type and threading it
through every use case, port, and adapter — a real domain-model change,
not a bug fix, and exactly the kind of decision that should be
interrogated up front rather than made silently as a side effect of a
"make sure nothing's broken" pass. If Phase 1 ever adds a second person,
this is the first thing that needs designing, not patching.

### 5.3 The Agent API has no rate limiting

`VIN_SECRET_KEY` is a static, long-lived bearer secret with no request
throttling behind it. Anyone who obtains that secret has unlimited
create/list access, forever, until it's rotated. This is a reasonable
trade-off for a personal-project M2M integration but isn't "hardened" in
any enterprise sense — there's no key rotation schedule, no per-key
scoping, no audit log of what VIN has created.

### 5.4 CI doesn't block Vercel deploys by itself

`.github/workflows/ci.yml` failing doesn't stop a Vercel deploy — GitHub
Actions and Vercel's Git integration are separate systems. Actually
gating production requires a GitHub branch protection rule on `main`
requiring the CI checks, which is a repo setting, not something a commit
in this repo can configure.

### 5.5 `SoftAurora`'s WebGL context rebuilds on every prop change

Every prop (including plain numeric uniforms like `brightness`) is in the
same `useEffect`'s dependency array that tears down and recreates the
entire `Renderer`/`Program`/`Mesh`. Currently dormant — both call sites
(`/login`, `/auth/loading`) always render it with default, static props —
but the first future consumer that wires any prop to state will pay a
full GL context rebuild per render instead of a cheap uniform write. Not
fixed now since it costs nothing while dormant; worth remembering if this
component ever gets a second, more dynamic use.

---

## 6. If a future phase adds a second user

Read §5.2 again first. The concrete list, in dependency order:

1. Decide the ownership model for `Routine` — a `userId` column on the
   aggregate, added to `packages/core/src/domain/routine.ts`,
   `CreateRoutineCommand`, every use case, `TursoRoutineAdapter`, and the
   Drizzle schema. This is a domain change and deserves the same
   interrogate-before-code treatment the original 15-step Phase 0
   workflow used, not a quick patch.
2. Extend `databaseHooks.user.create.before` to check against a set of
   allowed emails, not a single string.
3. Reconsider `AGENT_USER_ID` — once "the one owner" isn't a safe
   assumption, VIN's requests need to specify *which* owner's data
   they're targeting for real, not as an intent-confirmation string.
4. Everything else (auth, sessions, CI, tablet UI) was already built
   without hardcoding "exactly one user" into the plumbing — those layers
   shouldn't need to change.
