import { env } from "@LE-REMINDER/env/server";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Hashed once at module load, not per-request — env.VIN_SECRET_KEY never
// changes for the life of the process, so hashing it again on every
// request to /api/agent/** was pure waste.
const expectedSecretHash = createHash("sha256")
	.update(env.VIN_SECRET_KEY)
	.digest();

function isAgentAuthorized(request: NextRequest): boolean {
	const header = request.headers.get("authorization") ?? "";
	const [scheme, token] = header.split(" ");
	if (scheme !== "Bearer" || !token) return false;

	// Hashed timingSafeEqual so neither the secret's length nor its
	// content leaks through response timing.
	const provided = createHash("sha256").update(token).digest();
	return timingSafeEqual(provided, expectedSecretHash);
}

// AGENT_USER_ID isn't a database column (see packages/db/src/schema —
// Phase 0.5 is still single-tenant), it's an intent-confirmation value
// the agent must echo back alongside the bearer secret.
function isAgentUserId(userId: string | null): boolean {
	return userId !== null && userId === env.AGENT_USER_ID;
}

// Single entry point for every route under apps/web/src/app/api/agent/**.
// Deliberately one combined check, not two separate exported functions a
// route could call in the wrong order or partially — every route calls
// this exactly once, with userId from wherever that route gets it
// (query param for GET, request body for POST), and returns immediately
// if it gets a response back.
export function authorizeAgentRequest(
	request: NextRequest,
	userId: string | null,
): NextResponse | null {
	if (!isAgentAuthorized(request) || !isAgentUserId(userId)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	return null;
}
