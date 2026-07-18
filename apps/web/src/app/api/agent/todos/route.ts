import { listTodos } from "@LE-REMINDER/api/routers/todo-dependencies";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeAgentRequest } from "@/lib/agent-auth";

export const runtime = "nodejs";

// Read-only counterpart to the routines agent route: lets VIN see
// Today's To-Do, nothing else — no create/toggle/delete here, those stay
// dashboard-only tRPC actions. listTodos() (packages/api/src/routers/
// todo-dependencies.ts) resolves the real owner's user id from
// ALLOWED_EMAIL rather than trusting the userId query param below to be
// one — that param is only ever checked against AGENT_USER_ID, an
// intent-confirmation string, never used to filter data.
export async function GET(request: NextRequest) {
	const authError = authorizeAgentRequest(
		request,
		request.nextUrl.searchParams.get("userId"),
	);
	if (authError) return authError;

	try {
		const items = await listTodos();
		return NextResponse.json(items, { status: 200 });
	} catch {
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
