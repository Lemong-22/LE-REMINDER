import { db } from "@LE-REMINDER/db";
import { user } from "@LE-REMINDER/db/schema/auth";
import { todos } from "@LE-REMINDER/db/schema/todo";
import { env } from "@LE-REMINDER/env/server";
import { eq } from "drizzle-orm";

// Composition-root-style export for the agent API (apps/web's
// /api/agent/todos route) — kept here, not in apps/web, so
// @LE-REMINDER/db stays a dependency of packages/api/packages/auth only,
// consistent with routine-dependencies.ts.
//
// Resolves the real Better Auth user id from ALLOWED_EMAIL rather than
// trusting AGENT_USER_ID as a stand-in for it — AGENT_USER_ID is an
// arbitrary caller-supplied string (see apps/web/src/lib/agent-auth.ts's
// intent-confirmation check), not a database key. Filtering by the real
// owner's id keeps this query correct even if this system ever stops
// being single-tenant, instead of relying on "there's only one row
// anyway" staying true forever.
export async function listTodos() {
	const owner = await db.query.user.findFirst({
		where: eq(user.email, env.ALLOWED_EMAIL.toLowerCase()),
	});
	if (!owner) return [];

	return db.query.todos.findMany({
		where: eq(todos.userId, owner.id),
		orderBy: (t, { asc }) => [asc(t.createdAt)],
	});
}
