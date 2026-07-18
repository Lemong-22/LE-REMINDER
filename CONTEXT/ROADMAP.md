# Roadmap — LE-REMINDER (Phase 0)

> Sequences `CONTEXT/SPEC.md` into buildable, committable vertical slices. Governed by `CLAUDE.md`. Each phase below corresponds to one step of the 15-step workflow; Steps 0–3 are complete as of this document.

## Completed

| Step | Phase | Output | Commit |
|------|-------|--------|--------|
| 0 | Git Strategy | Commit-per-vertical-slice, established and in effect | — |
| 1 | PRD Definition | `CONTEXT/PRD.md` | `aa11f7d` |
| 2 | Technical Spec | `CONTEXT/SPEC.md` | `a161561` |
| 3 | Roadmap Sequencing | This document | `b9c96e5` |
| 4 | Foundation Scaffolding | `packages/core` scaffolded (domain/application/infrastructure/lib), Better Auth fully removed (Phase 0 is no-auth) | `05ebb7e` |
| 5 | Domain Entities + VOs | `Routine`, `TaskType`, `Schedule`, `CompletionEvent`, `RoutineStatus`, `computeRoutineStatus` | `cb30b5d` |
| 6 | Ports | Outbound ports in `domain/` (`RoutineRepository`, `CompletionEventRepository`, `Clock`, `IdGenerator`), inbound ports in `application/` (7 use-case interfaces + `RoutineView`) | `537ca9e` |
| 7 | Use Cases | All 7 use cases as pure orchestration; `CompleteRoutine` rejects re-completing a Finished `OneOff` via `RoutineAlreadyFinishedError` | `f10cc8a` |
| 8 | Mock Adapter | `InMemoryRoutineRepository`, `InMemoryCompletionEventRepository`, `SystemClock`/`FixedClock`, `CryptoIdGenerator` | `05e763b` |
| — | **Bug fix** | `computeRoutineStatus` gained a 5th `createdAt` param — mandatory `FixedCalendar` Overdue now persists across occurrence boundaries instead of silently resetting; SPEC.md §2.8 amended to match. Found while building Step 9's CLI demo. | `ee4f933` |
| 9 | CLI Adapter | Interactive REPL in `apps/cli` (create/list/complete/pause/resume/advance/demo) wired to Step 8 mocks, plus a `SteerableClock` for the mandatory-vs-rolling "Truth Test" | `113fb99` |
| 10 | Domain Tests | 92 tests (64 domain + 28 use-case) via `bun test`, including boundary-instant and leap-year cases | `b659a83` |
| 11 | DB Adapter | Drizzle schema (`routines`/`completion_events`, JSON `schedule_config`) + `TursoRoutineAdapter`/`TursoCompletionEventAdapter` in `packages/db` (not `packages/core`, to keep core dependency-free); validated against a real local SQLite file | `a21c6bc` |
| 12 | Interface Adapter | tRPC `routineRouter` in `packages/api` (Zod-validated, thin wrapper only); composition root wires Turso adapters into the use cases | `07c5e4b` |
| 13 | UI Implementation | Dashboard in `apps/web` — warm-light-paper redesign (Inter + IBM Plex Mono), status-coded routine cards with Framer Motion, hero progress panel, All Tasks / Analytics tabs, local Today's To-Do scratchpad, guided create/edit dialog. Folded the Step 13 visual-feedback revisions into this commit rather than splitting them out. | `1ab1091` |
| 14 | Interface Wiring | Dashboard wired to the real tRPC + Turso backend from Step 12 (`useQuery`/`useMutation`, cache invalidation on every write, superjson transformer for Date fields). Includes a pre-launch security pass: transactional cascade delete for the completion_events FK, and upper-bounded Zod input schemas. | `1ab1091` |
| 0.5 | Lockdown | Better Auth re-added as `packages/auth` (GitHub OAuth, server-side email whitelist via `databaseHooks.user.create.before`); Drizzle `user`/`session`/`account`/`verification` tables in `packages/db`; `protectedProcedure` gates every `routine`/`todo` tRPC procedure; Next.js middleware protects `/`; `/login` (SoftAurora glass card) and `/auth/loading` (post-OAuth transition) pages; Today's To-Do moved from localStorage to a Turso-backed `todos` table. Pending: user creates the GitHub OAuth app, sets env vars, and pushes the schema to production Turso — not done by AI per `CLAUDE.md`'s AI Safety constraints. | pending push |

---

## Step 4 — Foundation Scaffolding (Phase 1.1)

**Objective**: Create the zero-dependency domain package skeleton per `CLAUDE.md`'s directory structure (`src/domain`, `src/application`, `src/infrastructure`, `src/interface`, `src/lib`) with absolute import aliases wired in `tsconfig.json`.

**Deliverables**:
- Empty (or barrel-only) `src/domain/`, `src/application/`, `src/infrastructure/`, `src/interface/`, `src/lib/` directories.
- `@/domain`, `@/application`, `@/infrastructure`, `@/interface`, `@/lib` aliases resolving correctly.
- No package dependencies added to the domain folder — it must remain importable with zero `node_modules` requirements.

**Dependencies**: None — this is the first code step.

**Risks**: Low. Main risk is scaffolding inside the wrong workspace package (this is a Bun monorepo — confirm which `apps/`/`packages/` target owns the domain, since `CLAUDE.md`'s `src/` layout needs a concrete home).

**Completion Criteria**: `bun run typecheck` (or equivalent) passes on the empty structure; importing `@/domain` from another package resolves without error.

---

## Step 5 — Domain Entities + Value Objects (Phase 1.2)

**Objective**: Implement `SPEC.md` §2 as pure TypeScript — zero imports outside the standard library. No framework, no ORM, no dates-as-strings.

**Deliverables**:
- `Routine`, `TaskType` (`RecurringTask`/`OneOffTask`), `Schedule` (`FixedCalendarSchedule`/`RollingIntervalSchedule`), `RecurrencePattern`, `Duration`, `Category`, `CompletionEvent`, `RoutineStatus`, branded `RoutineId`/`CompletionEventId`.
- `computeRoutineStatus(taskType, isPaused, latestCompletion, now)` implemented as a pure function per SPEC §2.8, covering all combinations: `FixedCalendar` × `isMandatory` (true/false), `RollingInterval`, `OneOff` × (`dueDate` set/unset), plus `isPaused` short-circuit.

**Dependencies**: Step 4 (folder + aliases must exist).

**Risks**: `computeRoutineStatus` is the single most load-bearing function in the entire system — every dashboard state and every future HERMES-AGENT read depends on it being correct. Under-testing this now creates silent wrong-state bugs later that are hard to trace back.

**Completion Criteria**: All types compile under `strict: true` with no `any`. `computeRoutineStatus` has no dependency on `Date.now()` or any global clock — `now` is always a parameter.

---

## Step 6 — Ports (Phase 1.3)

**Objective**: Implement `SPEC.md` §3 as TypeScript interfaces in the domain/application boundary — inbound use-case interfaces and outbound repository/`Clock`/`IdGenerator` interfaces. No implementations yet.

**Deliverables**:
- Inbound: `CreateRoutineUseCase`, `EditRoutineUseCase`, `DeleteRoutineUseCase`, `SetRoutinePausedUseCase`, `CompleteRoutineUseCase`, `ListRoutinesUseCase`, `GetRoutineUseCase`, plus the `RoutineView` DTO.
- Outbound: `RoutineRepository`, `CompletionEventRepository`, `Clock`, `IdGenerator`.

**Dependencies**: Step 5 (ports reference domain types).

**Risks**: Low — this is interface-only work. Main risk is scope creep (adding methods not backed by a PRD functional requirement).

**Completion Criteria**: All interfaces compile; no interface has a method unused by any Step 4 (SPEC §4) use case.

---

## Step 7 — Use Cases (Phase 1.4)

**Objective**: Implement the 7 use cases from `SPEC.md` §4 as pure orchestration — they call repository/Clock/IdGenerator ports and domain functions, but contain no business logic of their own (that lives in the entities/VOs from Step 5).

**Deliverables**: `CreateRoutineUseCase`, `EditRoutineUseCase`, `DeleteRoutineUseCase`, `SetRoutinePausedUseCase`, `CompleteRoutineUseCase`, `ListRoutinesUseCase`, `GetRoutineUseCase` implementations, each depending only on the Step 6 port interfaces (never a concrete adapter).

**Dependencies**: Step 6.

**Risks**: Temptation to inline status-computation or validation logic directly in a use case instead of delegating to the Step 5 domain function — would violate the "pure orchestration" rule in `CLAUDE.md`.

**Completion Criteria**: Every use case is fully testable by constructing it with fake/in-memory port implementations — no real database or network required to exercise it.

---

## Step 8 — Mock Adapter (Phase 1.5)

**Objective**: Build in-memory implementations of every outbound port so the full use-case graph is runnable end-to-end without a real database.

**Deliverables**: `InMemoryRoutineRepository`, `InMemoryCompletionEventRepository`, a controllable `FixedClock`/`SystemClock`, and a simple `IdGenerator` (e.g. UUID or incrementing counter).

**Dependencies**: Step 6 (adapters implement those port interfaces).

**Risks**: Low. Keep these adapters honest — no shortcuts that wouldn't hold up against the real Turso adapter (Step 11), e.g. don't let `findAll()` return objects by reference if a real DB round-trip would return copies.

**Completion Criteria**: A use case can be instantiated purely with mock adapters and produce correct results — this is what Step 9 (CLI) and Step 10 (tests) will run against.

---

## Step 9 — CLI/Terminal Adapter (Phase 1.6)

**Objective**: Build a CLI-first sandbox — an inbound adapter that lets Lemong create routines, list the dashboard view, toggle completions, pause/resume, and delete, entirely against the mock adapter — to prove the business logic works before any UI or database exists.

**Deliverables**: A runnable `bun` CLI script/command set covering all 7 use cases, printing `RoutineView` (name, status, category, lastCompletedAt) in a readable table/list format to the terminal.

**Dependencies**: Steps 7 + 8.

**Risks**: Scope creep into a "real" TUI — keep this minimal and functional, not polished; it's a proof, not the product.

**Completion Criteria**: Lemong can, from the terminal, create a `FixedCalendar` mandatory routine, a `RollingInterval` routine, and a `OneOff` routine with a deadline; complete each; and see the dashboard correctly reflect `Due`/`Overdue`/`Done`/`Finished`/`Paused` states.

---

## Step 10 — Domain Tests (Phase 1.7)

**Objective**: Pure entity/use-case unit tests, run selectively (never the full suite by default, per `CLAUDE.md`'s testing rule).

**Deliverables**:
- Exhaustive `computeRoutineStatus` tests: every `TaskType`×`Schedule`×`isMandatory`×`isPaused` combination, at boundary times (exactly on the due instant, one moment before, one moment after).
- Use-case tests against the Step 8 mock adapters for all 7 use cases, including edge cases (completing an already-`Finished` OneOff should be rejected or be a no-op — decide and test the chosen behavior).

**Dependencies**: Steps 5, 7, 8.

**Risks**: This is the step most likely to surface a design gap (e.g. an untested state transition). Treat any surprising test result here as a signal to revisit Step 5's function, not to patch around it.

**Completion Criteria**: All domain/use-case tests pass; `computeRoutineStatus` has explicit test coverage for every branch, not just happy paths.

---

## Step 11 — DB Adapter (Phase 2.1)

**Objective**: Real persistence via Turso (edge SQLite) + Drizzle ORM, implementing the same `RoutineRepository`/`CompletionEventRepository` ports from Step 6 — swappable with the Step 8 mock without any use case changing.

**Deliverables**:
- Drizzle schema: a `routines` table (id, name, task_type discriminant + serialized schedule/dueDate, category, is_paused, created_at) and an append-only `completion_events` table (id, routine_id, completed_at).
- `TursoRoutineAdapter`, `TursoCompletionEventAdapter` implementing the Step 6 interfaces.
- Migration files (non-destructive only, per `CLAUDE.md`'s AI Safety constraints).

**Dependencies**: Steps 6, 7 (ports and use cases must be stable before wiring real persistence).

**Risks**: Serializing the polymorphic `Schedule`/`TaskType` union into relational columns needs a clear encoding (e.g. a `schedule_type` discriminant column + a JSON column for the variant-specific fields) — get this wrong and querying "all overdue routines" directly in SQL becomes awkward. Decide explicitly whether status filtering happens in SQL or in the application layer (recommend: application layer, to keep `computeRoutineStatus` as the single source of truth and avoid duplicating that logic in SQL).

**Completion Criteria**: Same use-case test suite from Step 10 passes again against the real Turso adapter (swap the injected repository, nothing else changes) — proves the port abstraction actually holds.

---

## Step 12 — Interface Adapter (Phase 2.2)

**Objective**: Expose the use cases via tRPC, mounted on a Next.js API layer. This is also the surface HERMES-AGENT will eventually read from (per PRD §10 constraint), so its output shape should stay close to `RoutineView`.

**Deliverables**: A tRPC router with one procedure per use case (`routine.create`, `routine.edit`, `routine.delete`, `routine.setPaused`, `routine.complete`, `routine.list`, `routine.get`), each a thin wrapper that validates input and calls the corresponding Step 7 use case — no business logic in the router itself.

**Dependencies**: Steps 7, 11.

**Risks**: Leaking Drizzle/Turso types into the tRPC layer instead of the domain's `Routine`/`RoutineView` types would violate the "UI knows nothing about database queries" rule in `CLAUDE.md`.

**Completion Criteria**: Each procedure is callable and returns correctly-shaped data; no infrastructure types cross into the router's public API.

---

## Step 13 — UI Mock (Phase 3.1)

**Objective**: Visual/UX-focused dashboard build using Shadcn/UI, against dummy/fixture data (not yet wired to the real API) — purely to get the look, grouping, and status visualization right.

**Deliverables**: Dashboard page showing routines grouped/filterable by `category`, sorted with `Overdue` surfaced first, visually distinguishing `Due`/`Overdue`/`Done`/`Finished`/`Paused`; a create/edit form covering all `TaskType`/`Schedule` variants; completion toggle interaction.

**Dependencies**: None technically (can run in parallel with Steps 11–12 using fixtures), but sequenced after per the workflow.

**Risks**: Building UI states that don't actually match what `computeRoutineStatus` can produce (e.g. inventing a 6th visual state not in `RoutineStatus`) — keep the UI's state handling exhaustive against the exact `RoutineStatus` union, not looser.

**Completion Criteria**: Every `RoutineStatus` value has a distinct, deliberate visual treatment; the create/edit form can express every `TaskType`/`Schedule` combination from SPEC §2.

---

## Step 14 — Connect UI to API (Phase 3.2)

**Objective**: E2E integration — replace Step 13's dummy data with real TanStack Query + tRPC calls into Step 12's router.

**Deliverables**: Working end-to-end flow: create a routine → it persists to Turso → dashboard reflects it → toggle completion → status updates correctly → matches CLI (Step 9) behavior exactly, since both now sit on top of the same use cases.

**Dependencies**: Steps 12, 13.

**Risks**: Any divergence between CLI behavior (Step 9, against mock adapter) and UI behavior (against real Turso adapter) indicates a Step 11 adapter bug, not a UI bug — the use cases and domain logic are shared and already proven by Step 10's tests.

**Completion Criteria**: Full PRD §9 User Flows work end-to-end in the browser. This closes Phase 0's technical completion criterion (PRD §12.1). The 2-week dogfooding period (PRD §12.2) begins after this step.

---

## Sequencing Notes

- Steps 4→10 form the "prove it works" spine (Foundation → Domain → Ports → Use Cases → Mock Adapter → CLI → Tests) and must happen in that order — each depends on the previous.
- Step 13 (UI Mock) can start in parallel with Steps 11–12 since it only needs fixture data, not the real API — but Step 14 cannot start until both Step 12 and Step 13 are done.
- Per Step 0's git strategy, each step above is its own commit (or small set of commits) — a vertical slice, not a monolithic drop at the end.
