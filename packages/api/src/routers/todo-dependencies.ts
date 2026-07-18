import { db } from "@LE-REMINDER/db";

// Composition-root-style export for the agent API (apps/web's
// /api/agent/todos route) — kept here, not in apps/web, so
// @LE-REMINDER/db stays a dependency of packages/api/packages/auth only,
// consistent with routine-dependencies.ts. Unfiltered by design: see that
// route's comment for why (todos.userId is a real Better Auth user id,
// which the agent has no session to provide).
export function listTodos() {
	return db.query.todos.findMany({
		orderBy: (t, { asc }) => [asc(t.createdAt)],
	});
}
