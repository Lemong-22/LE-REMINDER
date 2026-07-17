# Technical Specification — LE-REMINDER (Phase 0)

> Derived from `CONTEXT/PRD.md`. Governed by `CLAUDE.md` (DDD + Hexagonal Architecture, strict TypeScript, zero framework imports in the domain layer). This document defines shape and contracts only — no implementation code.

## 1. Bounded Contexts

Phase 0 is intentionally small enough to live in a **single bounded context**:

### Routine Maintenance (Core Domain)

Owns the entire ubiquitous language for this phase: `Routine`, `TaskType`, `Schedule`, `CompletionEvent`, `RoutineStatus`, `Category`. This context is the single source of truth for what a routine is, how its schedule behaves, and what its current state is. All CRUD, completion-logging, and status-computation logic lives here.

### External Read Boundary (not a bounded context — an output seam)

HERMES-AGENT is an out-of-process external system, not a module in this codebase. It consumes `Routine Maintenance`'s state through the outbound query surface (Section 3.2) or a future thin API built on top of it. No inbound dependency exists from this codebase to HERMES-AGENT — the relationship is strictly "we expose, they read." This is documented here so future ports/adapters are designed with that external reader in mind, without inventing a second bounded context for it prematurely.

### Deferred (explicitly not modeled in Phase 0)

- **Analytics/History context** — `CompletionEvent` is captured now so this can be built later without a schema migration, but no query/use case surfaces it beyond "latest completion" in Phase 0.
- **Notification/Scheduling-delivery context** — owned entirely outside this repo (HERMES-AGENT).

---

## 2. Core Entities & Value Objects

### 2.1 Identity

```typescript
// Branded (nominal) string IDs prevent accidentally passing a CompletionEventId
// where a RoutineId is expected — both are plain strings at runtime.
type Brand<T, B extends string> = T & { readonly __brand: B };

type RoutineId = Brand<string, "RoutineId">;
type CompletionEventId = Brand<string, "CompletionEventId">;
```

### 2.2 Schedule (polymorphic Value Object)

```typescript
type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

type RecurrencePattern =
  | { readonly kind: "Daily" }
  | { readonly kind: "Weekly"; readonly daysOfWeek: readonly DayOfWeek[] }
  | { readonly kind: "Monthly"; readonly dayOfMonth: number }; // 1-31

interface Duration {
  readonly value: number;
  readonly unit: "days" | "weeks" | "months";
}

interface FixedCalendarSchedule {
  readonly type: "FixedCalendar";
  readonly recurrence: RecurrencePattern;
  readonly isMandatory: boolean;
}

interface RollingIntervalSchedule {
  readonly type: "RollingInterval";
  readonly interval: Duration;
  // No isMandatory field: RollingInterval is always strict by definition —
  // there is no calendar slot to silently close, so it always becomes
  // Overdue once the interval elapses (see PRD §6).
}

type Schedule = FixedCalendarSchedule | RollingIntervalSchedule;
```

### 2.3 TaskType (polymorphic discriminant on the aggregate)

```typescript
interface RecurringTask {
  readonly kind: "Recurring";
  readonly schedule: Schedule;
}

interface OneOffTask {
  readonly kind: "OneOff";
  readonly dueDate: Date | null; // null = no deadline pressure, stays Pending indefinitely
}

type TaskType = RecurringTask | OneOffTask;
```

### 2.4 Category

```typescript
// Open string, not a closed enum: PRD lists Health/Home/Tech/Finance as
// examples, not an exhaustive set. Kept as a lightweight VO, not an entity.
type Category = string;
```

### 2.5 CompletionEvent (immutable, append-only)

```typescript
interface CompletionEvent {
  readonly id: CompletionEventId;
  readonly routineId: RoutineId;
  readonly completedAt: Date;
}
```

No update/delete operations exist for this type — by design, it is write-once. Phase 0 only ever reads the *latest* event per routine; the full log exists for future analytics (PRD §11 accepted risk).

### 2.6 RoutineStatus (derived, never persisted)

```typescript
type RoutineStatus = "Due" | "Overdue" | "Done" | "Finished" | "Paused";
```

- `Paused` — short-circuits everything else; sits outside due/overdue computation entirely.
- `Finished` — terminal, `OneOff` only, set once and never reassessed.
- `Done` / `Due` / `Overdue` — computed fresh every read from `(TaskType, Schedule, latestCompletion, now)`. Never stored on the aggregate — storing it would let it drift from the truth (the completion log + current time).

### 2.7 Routine (Aggregate Root)

```typescript
interface Routine {
  readonly id: RoutineId;
  name: string;
  taskType: TaskType;
  category: Category | null;
  isPaused: boolean;
  readonly createdAt: Date;
}
```

Deliberately **excludes** `lastCompletedAt` and `status` as stored fields — both are projections computed from `CompletionEvent[]` + current time (Section 2.8). This keeps the aggregate itself trivially serializable and prevents a second source of truth for completion state.

### 2.8 Status Computation (pure domain function, not a class method — no hidden state)

```typescript
function computeRoutineStatus(
  taskType: TaskType,
  isPaused: boolean,
  latestCompletion: CompletionEvent | null,
  now: Date,
): RoutineStatus;
```

Signature only — implementation belongs to Phase 1.2 (Domain Entities). Must remain a pure function: identical inputs always yield the identical output, with `now` as the only external input (injected via the `Clock` port, Section 3.2, never read directly via `new Date()` inside domain code).

---

## 3. Ports

### 3.1 Inbound Ports (Use Case Interfaces)

Adapters (CLI, tRPC router) depend on these interfaces; they never see repository or infrastructure types directly.

```typescript
interface CreateRoutineUseCase {
  execute(command: CreateRoutineCommand): Promise<Routine>;
}

interface EditRoutineUseCase {
  execute(command: EditRoutineCommand): Promise<Routine>;
}

interface DeleteRoutineUseCase {
  execute(command: DeleteRoutineCommand): Promise<void>;
}

interface SetRoutinePausedUseCase {
  execute(command: SetRoutinePausedCommand): Promise<Routine>;
}

interface CompleteRoutineUseCase {
  execute(command: CompleteRoutineCommand): Promise<CompletionEvent>;
}

interface ListRoutinesUseCase {
  execute(query: ListRoutinesQuery): Promise<RoutineView[]>;
}

interface GetRoutineUseCase {
  execute(query: GetRoutineQuery): Promise<RoutineView>;
}
```

`RoutineView` is the read-model DTO combining a `Routine` with its computed `RoutineStatus` and `lastCompletedAt` — this is also the shape HERMES-AGENT would eventually read.

```typescript
interface RoutineView {
  readonly routine: Routine;
  readonly status: RoutineStatus;
  readonly lastCompletedAt: Date | null;
}
```

### 3.2 Outbound Ports (Repositories & Infrastructure)

Implemented by adapters (Mock in-memory for Phase 1.5, Turso/Drizzle for Phase 2.1).

```typescript
interface RoutineRepository {
  save(routine: Routine): Promise<void>;
  findById(id: RoutineId): Promise<Routine | null>;
  findAll(): Promise<Routine[]>;
  delete(id: RoutineId): Promise<void>;
}

interface CompletionEventRepository {
  append(event: CompletionEvent): Promise<void>;
  findLatestByRoutineId(routineId: RoutineId): Promise<CompletionEvent | null>;
  findAllByRoutineId(routineId: RoutineId): Promise<CompletionEvent[]>; // reserved for future analytics; unused by any Phase 0 use case
}

// Injected so status computation and completion logging are testable
// without depending on wall-clock time.
interface Clock {
  now(): Date;
}

// Generates identities without domain code depending on a concrete
// UUID/nanoid library.
interface IdGenerator {
  newRoutineId(): RoutineId;
  newCompletionEventId(): CompletionEventId;
}
```

---

## 4. Use Cases (exact commands to implement)

| # | Use Case | Command/Query DTO | Maps to PRD FR |
|---|----------|--------------------|----------------|
| 1 | `CreateRoutineUseCase` | `CreateRoutineCommand { name, taskType, category? }` | FR-1 |
| 2 | `EditRoutineUseCase` | `EditRoutineCommand { routineId, name?, taskType?, category? }` | FR-2 |
| 3 | `DeleteRoutineUseCase` | `DeleteRoutineCommand { routineId }` | FR-3 |
| 4 | `SetRoutinePausedUseCase` | `SetRoutinePausedCommand { routineId, isPaused }` | FR-4 |
| 5 | `CompleteRoutineUseCase` | `CompleteRoutineCommand { routineId, completedAt? }` | FR-5 |
| 6 | `ListRoutinesUseCase` | `ListRoutinesQuery { category? }` | FR-6 |
| 7 | `GetRoutineUseCase` | `GetRoutineQuery { routineId }` | FR-6 |

`computeRoutineStatus` (Section 2.8) is not itself a use case — it's a pure domain function that `ListRoutinesUseCase` and `GetRoutineUseCase` call internally to build each `RoutineView`, using `Clock.now()` for the current-time input. FR-7 (deterministic computation) is satisfied by that function's purity, not a standalone use case.

`CompleteRoutineCommand.completedAt` is optional and defaults to `Clock.now()` — present only to allow logging a completion for an earlier moment (e.g. "I actually did this yesterday, forgot to check it off").

---

## 5. Explicitly Out of Scope for This Spec

- No persistence schema (Drizzle/Turso tables) — that's Phase 2.1.
- No tRPC router shapes — that's Phase 2.2.
- No UI component contracts — that's Phase 3.1.
- No actual implementation of `computeRoutineStatus` or any repository — interfaces and signatures only.
