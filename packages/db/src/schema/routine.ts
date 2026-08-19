import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// task_type is the top-level TaskType discriminant ("Recurring" | "OneOff");
// schedule_config is a JSON blob holding whatever varies by that discriminant
// (a OneOff's dueDate, or a Recurring's nested Schedule). This keeps the
// polymorphic domain type out of the relational schema entirely — no
// per-schedule-type tables, no sparse nullable columns per CLAUDE.md's "avoid
// an exploded relational mess" rule. status/lastCompletedAt are deliberately
// absent: those are pure projections computed from completion_events, never
// stored (SPEC.md §2.6-2.7).
export const routines = sqliteTable("routines", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	taskType: text("task_type").notNull(),
	scheduleConfig: text("schedule_config", { mode: "json" }).notNull(),
	category: text("category"),
	isPaused: integer("is_paused", { mode: "boolean" }).notNull().default(false),
	isTask: integer("is_task", { mode: "boolean" }).notNull().default(false),
	isImportant: integer("is_important", { mode: "boolean" })
		.notNull()
		.default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// Append-only by convention: no update/delete operations are exposed by
// CompletionEventRepository (SPEC.md §2.5), so no updatedAt/soft-delete
// columns exist here either.
export const completionEvents = sqliteTable("completion_events", {
	id: text("id").primaryKey(),
	routineId: text("routine_id")
		.notNull()
		.references(() => routines.id),
	completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
});
