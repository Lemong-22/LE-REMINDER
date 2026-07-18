import { listTodos } from "@LE-REMINDER/api/routers/todo-dependencies";
import { type NextRequest, NextResponse } from "next/server";
import { isAgentAuthorized, isAgentUserId } from "@/lib/agent-auth";

export const runtime = "nodejs";

// Read-only counterpart to the routines agent route: lets VIN see
// Today's To-Do, nothing else — no create/toggle/delete here, those stay
// dashboard-only tRPC actions. No userId filter on the query itself:
// unlike routines, packages/db/src/schema/todo.ts's todos table IS scoped
// by a real userId — but that's the actual Better Auth user id, which
// "vin-agent" isn't. Phase 0.5 has exactly one such user (the whitelisted
// owner), so an unfiltered query already returns exactly their list.
export async function GET(request: NextRequest) {
	if (!isAgentAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!isAgentUserId(request.nextUrl.searchParams.get("userId"))) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const items = await listTodos();
	return NextResponse.json(items, { status: 200 });
}
