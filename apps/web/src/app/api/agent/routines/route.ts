import { createRoutineUseCase } from "@LE-REMINDER/api/routers/routine-dependencies";
import { createRoutineInputSchema } from "@LE-REMINDER/api/routers/routine-schemas";
import { env } from "@LE-REMINDER/env/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

// Machine-to-machine intake for VIN (the owner's automation agent) to
// create routines directly, without a browser session. Deliberately
// outside Better Auth's session-cookie model — a non-interactive caller
// doesn't have a session to present, and forcing an OAuth flow onto a
// service credential buys nothing. Not reachable through
// apps/web/src/proxy.ts (matcher is "/" only) or packages/api's
// protectedProcedure; this route is its own inbound adapter, wired
// straight into the same createRoutineUseCase the tRPC router uses, so
// no business logic is duplicated.
//
// Two independent checks gate every request:
//  1. Authorization: Bearer <VIN_SECRET_KEY>, compared via hashed
//     timingSafeEqual so neither the secret's length nor its content
//     leaks through response timing.
//  2. The body's `userId` must equal AGENT_USER_ID. This is NOT a
//     database column — packages/db/src/schema/routine.ts has no
//     per-user ownership (Phase 0.5 is still single-tenant, so every
//     routine already appears on the one dashboard regardless). It's an
//     intent-confirmation the agent echoes back, not a storage key.
const agentCreateRoutineInputSchema = createRoutineInputSchema.extend({
	userId: z.string().min(1),
});

function isAuthorized(request: NextRequest): boolean {
	const header = request.headers.get("authorization") ?? "";
	const [scheme, token] = header.split(" ");
	if (scheme !== "Bearer" || !token) return false;

	const provided = createHash("sha256").update(token).digest();
	const expected = createHash("sha256").update(env.VIN_SECRET_KEY).digest();
	return timingSafeEqual(provided, expected);
}

export async function POST(request: NextRequest) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = agentCreateRoutineInputSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	if (parsed.data.userId !== env.AGENT_USER_ID) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { userId: _userId, ...command } = parsed.data;
	const routine = await createRoutineUseCase.execute(command);
	return NextResponse.json(routine, { status: 201 });
}
