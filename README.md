# LE-REMINDER

**A deterministic "second brain" for personal maintenance.**

Not a to-do app. Not a habit tracker. LE-REMINDER is a precision state-computation engine that knows, with zero ambiguity, exactly what's `Due`, `Overdue`, or `Done` across every recurring and one-off obligation you track — derived purely from explicit rules, never from inference.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-end--to--end%20typesafe-2596BE?logo=trpc&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F)
![Turso](https://img.shields.io/badge/Turso-libSQL-4FF8D2)
![Bun](https://img.shields.io/badge/Bun-workspace%20monorepo-000000?logo=bun&logoColor=white)

---

## Vision

Most tools treat every recurring task the same way — reset daily, done. LE-REMINDER doesn't, because real maintenance doesn't work that way: some things reset on a fixed calendar slot regardless of when you did them (daily vitamins), some are due a strict interval after you *actually* last did them (repaste a laptop every 6 months from the real last date, not the calendar), and some just happen once, with or without a deadline.

LE-REMINDER models all three as first-class, distinct behaviors under one deterministic aggregate, and computes the true current state of every one of them from a pure function of `(schedule, mandatoriness, last completion, now)` — no AI judgment calls, no randomness, fully reproducible.

## Architecture

Built **strictly** as **Clean Architecture + Hexagonal (Ports & Adapters) + Domain-Driven Design**, in TypeScript, as a Bun workspace monorepo.

```
packages/core/src/
├── domain/           # Entities, value objects, ports — zero framework dependencies
├── application/      # Use cases (pure orchestration, no I/O logic of its own)
└── infrastructure/   # Framework-agnostic infra concerns (clocks, id generators)
```

The domain package (`@LE-REMINDER/core`) has **zero runtime dependencies**. It doesn't know Next.js, tRPC, or Drizzle exist. `computeRoutineStatus` — the single most load-bearing function in the system — is a pure function with no `Date.now()`, no network calls, no side effects, covered by 92 tests across every schedule-type × mandatoriness × completion-history combination.

Everything outside the domain talks to it through **ports** (interfaces defined in `domain/`) implemented by **adapters** (`TursoRoutineAdapter`, `TursoCompletionEventAdapter` in `packages/db`) — the database, the API layer, and the UI are all replaceable without touching a single line of business logic.

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  apps/web    │────▶│ packages/api │────▶│  packages/core     │
│  (Next.js)   │trpc │  (tRPC,      │calls│  domain/           │
│  apps/cli    │     │   Zod-       │use  │  application/       │
│  (REPL)      │     │   validated) │cases│  (framework-free)   │
└─────────────┘     └──────────────┘     └─────────┬─────────┘
                                                     │ port
                                          ┌──────────▼─────────┐
                                          │   packages/db        │
                                          │ Turso/libSQL adapter │
                                          └───────────────────┘
```

## The Domain Model

Every `Routine` is one of two `TaskType`s:

| Type | Behavior |
|---|---|
| **Recurring · FixedCalendar** | Due on a calendar slot (daily/weekly/monthly). `isMandatory: false` → a missed slot silently closes. `isMandatory: true` → it flips `Overdue` and *stays* Overdue until completed. |
| **Recurring · RollingInterval** | Due `lastCompletedAt + interval` — always strict, no calendar slot to silently close. |
| **OneOff** | Single execution, optional deadline. Once completed, transitions to a terminal `Finished` state and never resets. |

Every completion is recorded as an immutable, append-only `CompletionEvent` — the single source of truth `RoutineStatus` (`Due` / `Overdue` / `Done` / `Finished` / `Paused`) is projected from, never stored directly.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| API | [tRPC](https://trpc.io) — end-to-end type-safe, Zod-validated at every boundary |
| Validation | [Zod](https://zod.dev) |
| Data fetching | [TanStack Query](https://tanstack.com/query) via `@trpc/tanstack-react-query` |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Motion | [Framer Motion](https://www.framer.com/motion/) / [Motion](https://motion.dev) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Database | [Turso](https://turso.tech) (libSQL / edge SQLite) |
| Runtime & tooling | [Bun](https://bun.sh) workspaces, [Biome](https://biomejs.dev) |

## Project Structure

```
LE-REMINDER/
├── apps/
│   ├── web/          # Next.js dashboard (the primary interface)
│   └── cli/           # Interactive REPL adapter — same use cases, zero UI framework
├── packages/
│   ├── core/          # Framework-free domain + application layer (DDD/Hexagonal)
│   ├── db/            # Drizzle schema + Turso adapters (implements core's ports)
│   ├── api/            # tRPC router — thin, Zod-validated wrapper over use cases
│   ├── ui/             # Shared shadcn/ui primitives
│   ├── env/            # Type-safe, boundary-enforced environment variables
│   └── config/         # Shared TypeScript config
└── CONTEXT/            # PRD, technical spec, and roadmap governing this build
```

## Getting Started

```bash
# Install dependencies
bun install

# Local dev database — plain SQLite file, no Turso account required
echo 'DATABASE_URL=file:./data/local.db' > apps/web/.env

# Push the schema
bun run db:push

# Run the app
bun run dev:web
```

Open [http://localhost:3001](http://localhost:3001).

Other useful scripts: `bun run check-types` (typecheck all packages), `bun run check` (Biome lint/format), `bun test` (scoped domain/adapter tests — see `CLAUDE.md` for the "don't run the full suite blindly" convention this repo follows).

## Agentic Coding Workflow

This codebase was built using an AI-driven agentic coding workflow — a governed, step-by-step process (PRD → technical spec → roadmap → domain → ports → use cases → adapters → tests → interface) with a strict constitutional contract (`CLAUDE.md`) enforcing the architecture rules above at every step, human review gating each phase.

## Status: Phase 0 — The Core Engine & MVP

Phase 0 is complete: full CRUD lifecycle, deterministic status computation, a real Turso/Drizzle-backed API, and the dashboard UI, all wired end-to-end. Deliberately **out of scope** for this phase (see `CONTEXT/PRD.md`): authentication/multi-user, AI/LLM-driven anything, notification delivery (owned by a separate external system), and history/streak UI — `CompletionEvent`s are captured from day one specifically so that future phase can be built without a data migration.
