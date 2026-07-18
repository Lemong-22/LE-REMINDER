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
| `8b072f7`, `003bc6f`, `a6fd388` | Mobile UX follow-up: hero animation replaced and made mobile-cheap, routine cards tap-to-reveal, 5s cross-device polling | Same day, after the audit — see §7 |

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

## 6. Security posture, consolidated

Every individual piece of this is already documented where it was decided
(§2.2, §2.4, §4, §5.1–5.3) — this section exists so the whole picture is
readable in one place instead of assembled from cross-references.

**Authentication.** GitHub OAuth is the only sign-in path — no
email/password, no self-registration. The whitelist
(`databaseHooks.user.create.before` in `packages/auth/src/auth.ts`) runs
server-side at account-creation time, comparing lowercased emails (Better
Auth lowercases the incoming GitHub email before the hook runs, so the env
var is lowercased to match — see §4, finding 1). It cannot be bypassed by calling
`/api/auth/callback/github` directly, because the check isn't a UI
affordance, it's inside the account-creation path itself.

**Session handling.** `apps/web/src/proxy.ts` is deliberately shallow: it
only checks that a session cookie is *present* (via
`getSessionCookie`, no DB call — this runs at the edge), and redirects to
`/login` if not. The real check is `protectedProcedure`
(`packages/api/src/index.ts`), which calls `auth.api.getSession()` and
throws `UNAUTHORIZED` for anything forged or expired. `session.cookieCache`
(300s) sits between these two — it lets `protectedProcedure` skip the DB
round trip for repeat calls within that window without weakening the
proxy/protectedProcedure split (a forged cookie still fails the real
lookup once the cache expires, or immediately if the signature itself is
invalid).

**Authorization.** Every routine/todo procedure in `packages/api` is
`protectedProcedure`, not `publicProcedure` — "someone is logged in" is
enforced everywhere. What's *not* enforced is per-row ownership (§5.2):
harmless today because exactly one account can ever exist, structural risk
the moment that stops being true.

**The Agent API's auth is intentionally not Better Auth.** VIN is a
non-interactive caller — there's no browser to hold a session cookie. So
`apps/web/src/lib/agent-auth.ts` implements a separate scheme: a static
bearer secret (`VIN_SECRET_KEY`), SHA-256-hashed on both sides and compared
with `timingSafeEqual`, not `===`. A naive string comparison
short-circuits on the first mismatched byte, which leaks the secret's
length and prefix through response timing over enough requests; hashing
first and using a constant-time comparison closes that side channel. The
hash is computed once at module load (§4, finding 9), not per-request.
`AGENT_USER_ID` is a second, independent check — an intent-confirmation
value, not a permissions scope (§2.4) — so a leaked bearer secret alone
still isn't sufficient without also knowing that string.

**Injection surface.** All database access goes through Drizzle's
query builder (`packages/db`) — no raw SQL string concatenation anywhere
in the app layer, so standard parameterized-query protection applies by
construction, not by discipline.

**Secrets.** `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_SECRET`,
`VIN_SECRET_KEY`, and the Turso auth token are all environment variables,
validated at boot by a shared env schema (`@LE-REMINDER/env`) that throws
on missing/malformed values rather than falling back to `undefined` and
failing confusingly later — this is exactly what made `bun run build`
fail loudly and immediately (a Zod validation error naming every missing
variable) when run locally without production env vars during §7's work,
instead of building successfully and then breaking in some harder-to-trace
way at runtime. None of these four are checked into the repo;
CLAUDE.md's "no modifying secrets/configs without approval" rule governs
all of them.

**What's explicitly not hardened** (unchanged from §5.3, restated here so
it isn't missed): no rate limiting on the Agent API, no key rotation, no
audit log of agent-originated writes. Reasonable for a single-operator
personal tool; would need real work before this pattern is reused for
anything with more than one trusted caller.

---

## 7. Mobile UX + power/battery efficiency pass

Prompted by actually opening the dashboard on a phone: the hero animation
was hover-dependent in one place, tap-inaccessible in another, and the
data layer had no story at all for "I changed something on my phone, why
doesn't my laptop tab show it." Three independent fixes, one session,
commits `8b072f7`/`003bc6f`/`a6fd388` (3 files touched across the whole
pass: `nexus-animation.tsx`, `routine-card.tsx`, `trpc.ts`).

### 7.1 Hover-only controls don't exist on a touchscreen

`routine-card.tsx`'s Complete/Pause/Edit row was revealed by
`group-hover`/`group-focus-within` only. Touch devices never fire
`:hover` at all, so on a phone those buttons were reachable only by
accident (`:focus-within` firing from some other input path) — a real
functional gap, not a cosmetic one.

Fixed by adding a `revealed` boolean toggled by tapping the card, with a
`pointerdown` listener on `document` that collapses it again on an
outside tap. The existing hover/focus-within classes were kept rather
than replaced, so desktop behavior is bit-for-bit unchanged; the tap
state just ORs into the same `opacity`/`pointer-events` classes. Each
button's own `onClick` calls `stopPropagation()` before running its real
handler — this was the second iteration; the first put `onClick` directly
on the action-row `<div>`, which correctly stopped the re-toggle bug but
tripped Biome's `useKeyWithClickEvents` and `noStaticElementInteractions`
a11y rules (a `<div>` with a click handler needs a role and keyboard
handling it was never going to get). Moving the `stopPropagation()` call
into each button removed the div's interactivity entirely instead of
suppressing the lint — the buttons were always the real interactive
elements; the div just needed to stop being one too.

### 7.2 Same visual effect, roughly half the compositor cost on small screens

`NexusAnimation` (the hero sphere — see its own file header for what it
depicts) renders 30 independently-animated stars and 3 comets (4 trail
dots each) by design; that's fine on a laptop GPU and unnecessary weight
on a phone's. Below the `sm` Tailwind breakpoint, only the first 14 stars
and 2 of the 3 comets render — `hidden sm:block` applied directly to each
element's own root node.

The direct-node approach was chosen over the more obvious "wrap the extra
elements in one `<div className="hidden sm:contents">`" — `display:
contents` makes a wrapper invisible to layout while keeping its children
in the normal tree, which would have meant touching one line instead of
N. It wasn't used because the comets live inside a `transform-style:
preserve-3d` ancestor (the tumbling sphere container), and Safari has
shipped versions where `display: contents` breaks 3D transform
preservation for descendants of a `preserve-3d` context — a real risk
given iOS Safari is the mobile browser this pass exists for. Applying the
class per-node costs a few more characters and has no such interaction
with 3D transform contexts.

Every animated layer already had `motion-reduce:animate-none` from the
original build (this pass didn't add reduced-motion support — it already
existed and is called out here only because it's the other half of the
same "don't burn a low-power device's battery on a decoration" story).

### 7.3 Cross-device sync: polling, chosen over standing up push infra

Before this pass, `queryClient`'s defaults were tuned for a single
always-on tablet: 5-minute `staleTime`, refetch on window focus,
`refetchInterval: false` — reasonable for one device, wrong the moment
the same account is open on a phone *and* that tablet at once, since nothing
told the second tab a mutation had happened on the first.

Two real options existed: a push-based realtime layer (WebSocket/SSE via
a hosted pub/sub service like Pusher/Ably/Upstash) or short-interval
polling. Asked directly rather than decided silently, because it's a
real architecture/cost trade-off, not a style choice — see the "AI Safety
& Operational Constraints" table in CLAUDE.md, which requires approval
before modifying secrets/configs, and any push service means new
secrets. Polling won: `staleTime` and `refetchInterval` both dropped to
5s, `refetchOnWindowFocus` stayed `true`. No new dependency, no new
secret, no new adapter package — just two numbers in
`apps/web/src/utils/trpc.ts`.

The reason this is safe to leave unbounded rather than gated behind
"only poll if the tab is visible": TanStack Query's `refetchInterval`
already stops firing in a backgrounded tab (`refetchIntervalInBackground`
defaults to `false`), so a phone with the dashboard open but screen
locked, or a laptop tab sitting behind other windows, does zero network
work until it's brought back to the foreground — which is also exactly
when `refetchOnWindowFocus` fires a catch-up request anyway. The two
settings cover each other: polling handles "tab open and visible right
now," focus-refetch handles "tab was backgrounded, now it's not."

A side effect worth flagging explicitly: `packages/auth/src/auth.ts`'s
`session.cookieCache` comment used to say its 300s duration "matches the
staleTime... cadence used elsewhere" — that stopped being true the moment
`staleTime` dropped to 5s for this pass. The comment was corrected rather
than left stale (it now says it matches the idle-dimmer's timeout
instead, which is still true) — a small thing, but exactly the kind of
comment-drift that CLAUDE.md's "why, not what" comment rule is supposed
to prevent from accumulating silently.

If a future device makes 5s polling feel slow (large screen showing a
shared status board, say), the push-based option described above is
still the honest next step — not a shorter polling interval, which just
trades bandwidth for marginally less latency without solving the
underlying "no one told the other tab" problem.

### 7.4 The power-management story end to end

No single "power mode" flag exists — battery/CPU cost is kept down by
several independent, narrow decisions stacking rather than one system
governing all of them. Worth reading as one list, since no single commit
message captures it:

1. **The idle dimmer** (`apps/web/src/components/ui/idle-dimmer.tsx`,
   built in the original Phase 0.5 arc, unrelated to this session) dims
   the screen after 5 minutes of no mouse/touch/keyboard activity — built
   for the always-on tablet kiosk case, but it helps a phone screen left
   open on a desk too.
2. **`motion-reduce:animate-none`** on every layer of `NexusAnimation`
   respects the OS-level "reduce motion" accessibility setting — a user
   who has already told their phone to minimize animation gets a fully
   static hero instead of paying for it regardless.
3. **Fewer animated layers below `sm`** (§7.2) — roughly half the
   star/comet count, independent of the reduce-motion setting, because
   most phones simply have weaker GPUs than the desktop this was
   originally designed against, reduce-motion or not.
4. **Polling pauses when backgrounded** (§7.3) — no network radio wake-up
   for a screen-locked phone or a tab sitting behind other windows.
5. **No polyfills, no JS animation loop.** Every animated element in
   `NexusAnimation` is a CSS `@keyframes` animation, not a
   `requestAnimationFrame` loop — the compositor thread handles it
   independently of the JS main thread, which is both cheaper and means a
   busy JS thread (e.g. a query refetch resolving) can't cause the
   animation to stutter or, conversely, the animation can't block a
   pending state update.

None of these five required a new dependency or a new abstraction layer —
each is a small, local decision (a CSS media query, a library default,
using CSS animation instead of JS) rather than a "power management
system" in the sense of a central controller. That's a deliberate reading
of CLAUDE.md's "don't design for hypothetical future requirements" rule:
if a future phase needs something more coordinated (e.g. detecting
`navigator.connection.saveData` or battery level directly), that's a real
addition to design then, not something to speculatively build now.

---

## 8. If a future phase adds a second user

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
