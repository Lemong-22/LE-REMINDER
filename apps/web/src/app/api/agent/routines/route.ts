import {
	createRoutineUseCase,
	listRoutinesUseCase,
} from "@LE-REMINDER/api/routers/routine-dependencies";
import {
	createRoutineInputSchema,
	listRoutinesInputSchema,
} from "@LE-REMINDER/api/routers/routine-schemas";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAgentRequest } from "@/lib/agent-auth";

export const runtime = "nodejs";

// Machine-to-machine intake for VIN (the owner's automation agent) to
// create and list routines directly, without a browser session.
// Deliberately outside Better Auth's session-cookie model — a
// non-interactive caller doesn't have a session to present, and forcing
// an OAuth flow onto a service credential buys nothing. Not reachable
// through apps/web/src/proxy.ts (matcher is "/" only) or packages/api's
// protectedProcedure; this route is its own inbound adapter, wired
// straight into the same use cases the tRPC router uses, so no business
// logic is duplicated. See apps/web/src/lib/agent-auth.ts for the check
// every request goes through (bearer secret + userId).
const agentCreateRoutineInputSchema = createRoutineInputSchema.extend({
	userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	const parsed = agentCreateRoutineInputSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const authError = authorizeAgentRequest(request, parsed.data.userId);
	if (authError) return authError;

	try {
		const { userId: _userId, ...command } = parsed.data;
		const routine = await createRoutineUseCase.execute(command);
		return NextResponse.json(routine, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}

// Read-only counterpart: GET /api/agent/routines?userId=<AGENT_USER_ID>
// (&category=<optional>). userId travels as a query param here since GET
// requests don't conventionally carry a JSON body.
export async function GET(request: NextRequest) {
	const authError = authorizeAgentRequest(
		request,
		request.nextUrl.searchParams.get("userId"),
	);
	if (authError) return authError;

	const parsed = listRoutinesInputSchema.safeParse({
		category: request.nextUrl.searchParams.get("category") ?? undefined,
	});
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	try {
		const routines = await listRoutinesUseCase.execute(parsed.data);
		return NextResponse.json(routines, { status: 200 });
	} catch {
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
