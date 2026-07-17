# Product Requirements Document — LE-REMINDER (Phase 0)

> Supersedes the archived `CONTEXT/_archive/PRD-le-reminder.md`. That document described a broader "hybrid knowledge + AI capture" system (LLM classification, vector search, voice/screenshot intake) which has been fully abandoned in favor of the scope below.

## 1. Problem Statement

Lemong maintains a mix of personal routines with fundamentally different completion semantics: some reset on a fixed calendar cadence regardless of when they're done (daily supplements), some are due on a rolling interval computed from the exact moment they were last completed (laptop thermal repasting every 6 months), and some are single, non-repeating obligations with an optional deadline (a school assignment). No existing tool treats these as first-class, distinct behaviors under one deterministic model — general habit trackers assume everything resets daily, and note-taking apps have no scheduling semantics at all.

LE-REMINDER solves this by providing a single, deterministic dashboard that computes and displays the true current state (`Due`, `Overdue`, `Done`, `Finished`) of every routine/maintenance task, based on an explicit, polymorphic scheduling model — with zero ambiguity about why a task shows the state it does.

## 2. Goals

- Provide one deterministic dashboard showing the current state of every routine/maintenance task the user tracks.
- Support three distinct completion/scheduling behaviors under one aggregate: fixed-calendar recurrence, rolling-interval recurrence, and one-off tasks with optional deadlines.
- Record every completion as an immutable, timestamped event — building the correct data foundation for future streak/analytics features without building that UI now.
- Allow full lifecycle management (create/edit/delete/pause) of routines directly in the app.
- Expose state cleanly enough that an external system can read it without LE-REMINDER needing to know or care how that consumer uses it.

## 3. Non-Goals

- **NOT** a general-purpose note-taking app.
- **NOT** an AI-capture, classification, or semantic-search system — no LLM pipeline, no vector DB, no chaotic-input processing of any kind.
- **NOT** a notification/reminder delivery system. LE-REMINDER computes state; it does not push, email, or alert. (See Constraints — HERMES-AGENT.)
- **NOT** multi-user. No authentication, no accounts, no per-user data isolation.
- **NOT** a history/streak/analytics UI in Phase 0, even though the underlying event data is captured from day one.
- **NOT** supporting voice, screenshot, or any non-text input.

## 4. Target Users

**Primary**: Lemong, single user, tracking his own personal maintenance routines (health/supplements, home upkeep, tech/device maintenance, one-off obligations).

There is no secondary user in Phase 0.

## 5. Product Vision

LE-REMINDER is a **deterministic command center for personal maintenance** — not a note-taking app, not a chat-based assistant. Every task on the dashboard has an unambiguous, computable state derived from explicit rules (schedule type, mandatoriness, last completion), never from inference or AI judgment. The system's only job is to know, with certainty, what is due, what is overdue, and what is done — and to let an external system (or a future UI) read that truth reliably.

## 6. Core Product Format

### Core Aggregate: `Routine` (a.k.a. `MaintenanceTask`)

Discriminated by `TaskType`:

- **`Recurring`** — has a `Schedule`:
  - **`FixedCalendar(isMandatory: boolean)`** — due on a predetermined calendar slot (e.g. daily, specific weekday, monthly), independent of when it was last completed.
    - `isMandatory = false`: a missed slot silently closes and the next slot opens — no penalty state (e.g. daily tomato juice).
    - `isMandatory = true`: a missed slot flips the task to `Overdue`, which persists until explicitly completed (e.g. critical daily maintenance).
  - **`RollingInterval`** — due date computed as `lastCompletedAt + interval` (e.g. laptop thermal repasting every 6 months from the exact date last done). Always behaves as strict/mandatory — there is no calendar slot to silently close, so it always flips to `Overdue` once the interval elapses and stays there until completed.
- **`OneOff(dueDate?: Date)`** — single execution, no recurrence.
  - If `dueDate` is set and passes while still `Pending`, flips to `Overdue`.
  - If `dueDate` is unset, remains `Pending` indefinitely with no due-date pressure.
  - Once completed, permanently transitions to terminal `Finished(completedAt)` — never resets.

### Completion Tracking

Every completion action emits an immutable, append-only `CompletionEvent(routineId, timestamp)`. This is the single source of truth for "when was this done," from which current-state fields (`lastCompletedAt`, derived `Due`/`Overdue`/`Done`/`Finished`) are projected. Phase 0's dashboard reads only the latest projection — it does not render history, streaks, or event lists. That data exists for future phases.

### Categorization

`Routine` carries an optional `category` (e.g. Health, Home, Tech, Finance) — a simple value used for dashboard grouping/filtering, not a separate entity.

## 7. Functional Requirements

1. **Create Routine** — user defines name, `TaskType`, schedule details (fixed-calendar pattern + `isMandatory`, or rolling interval, or one-off deadline), and optional category.
2. **Edit Routine** — user can change any of the above after creation.
3. **Delete/Archive Routine** — user can remove a routine from active tracking.
4. **Pause Routine** — user can temporarily suspend a routine's due/overdue computation without deleting it.
5. **Toggle/Log Completion** — user marks a routine done, which emits a `CompletionEvent` and updates the projected current state.
6. **View Dashboard** — user sees all active routines with their current computed state (`Due`, `Overdue`, `Done`, `Finished`, or paused), groupable/filterable by category.
7. **Deterministic State Computation** — given a routine's type, schedule, `isMandatory` flag, and its most recent `CompletionEvent` (if any), the system computes exactly one state with no ambiguity and no external calls (e.g. no LLM, no network dependency for the computation itself).

## 8. Non-Functional Requirements

- **Determinism**: state computation is a pure function of (schedule config, mandatoriness, last completion timestamp, current time) — no randomness, no AI inference, fully reproducible given the same inputs.
- **Single-user, no auth**: no login system, no per-user data partitioning required in Phase 0.
- **Stack**: Bun, TypeScript (strict, no `any`), Next.js, React, tRPC, Drizzle ORM, Turso (edge SQLite), Shadcn/UI, TanStack Query — per `AGENTS.md`. No Pinecone, no Upstash QStash, no Better Auth in Phase 0.
- **Architecture**: strict DDD + Hexagonal Architecture per `AGENTS.md` — domain layer has zero framework imports, ports define boundaries, adapters are replaceable.
- **Externally readable**: the persisted/queryable state must be structured so an external consumer (HERMES-AGENT) can read due/overdue state without coupling to LE-REMINDER's internals.

## 9. User Flows

1. **Daily check-in**: Lemong opens the dashboard → sees routines grouped/sorted with `Overdue` items surfaced first → toggles completion on ones he's done → state updates immediately and deterministically.
2. **Add a new routine**: Lemong creates a routine → chooses `Recurring` (fixed or rolling) or `OneOff` → sets mandatoriness/deadline as applicable → routine appears on dashboard in its correct initial state.
3. **Modify a routine**: Lemong edits schedule details or category on an existing routine → dashboard reflects the change on next computation.
4. **Retire a routine**: Lemong deletes or pauses a routine that's no longer relevant → it stops appearing in active state computation.
5. **One-off completion**: Lemong completes a `OneOff` task → it permanently moves to `Finished`, never reappears as due.

## 10. Constraints

- **HERMES-AGENT boundary**: notification/reminder delivery is explicitly out of scope for this repository. A separate external system, HERMES-AGENT, will read LE-REMINDER's computed state (via DB or API) and own all actual alerting. LE-REMINDER must not build or assume any push/email/cron delivery mechanism.
- **Constitution**: all implementation must strictly follow `AGENTS.md` (DDD, Hexagonal Architecture, TS strict mode, absolute imports, no MVC).
- **No AI in the domain**: state computation must never depend on an LLM or external inference call — it must remain a deterministic pure function.

## 11. Risks

- **Schedule VO complexity**: three schedule behaviors (fixed/rolling/one-off) with mandatoriness only meaningful for one of them risks becoming an ad-hoc conditional mess if not modeled carefully as a proper polymorphic value object from Step 5 onward.
- **Event-sourced-but-not-really**: recording `CompletionEvent`s while only projecting current state (no history UI) risks becoming unused complexity if Phase 1+ analytics never materializes — accepted as a deliberate architectural bet per Lemong's explicit instruction.
- **External consumer coupling**: designing a "clean read boundary" for HERMES-AGENT before that system exists risks over-engineering the query port. Keep it minimal — a straightforward query use case/port, not a speculative public API.

## 12. Success Metrics

1. **Technical**: all 15 steps of the defined workflow (PRD → SPEC → Roadmap → domain entities/VOs → ports → usecases → mock adapter → CLI adapter → domain tests → DB adapter → tRPC interface → UI mock → E2E integration) are completed per the DDD/Hexagonal constitution.
2. **Usage**: Lemong dogfoods the dashboard for his real daily routines (supplements, gym, maintenance) for at least 2 weeks post-launch with zero data loss and zero incorrect `Due`/`Overdue` computations.
