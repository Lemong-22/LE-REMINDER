import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// The dashboard's "Today's To-Do" scratchpad — deliberately NOT a Routine.
// Plain text lines with no schedule, no status, no computeRoutineStatus
// involvement. Scoped by userId purely so it's the same list across
// devices/sessions for the one authenticated account, not because this
// repo is multi-tenant.
export const todos = sqliteTable("todos", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	done: integer("done", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
