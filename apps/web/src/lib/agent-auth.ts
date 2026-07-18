import { env } from "@LE-REMINDER/env/server";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Shared by every route under apps/web/src/app/api/agent/** — one
// implementation of the security-critical bearer check, not one copy per
// route that could quietly drift. Hashed timingSafeEqual so neither the
// secret's length nor its content leaks through response timing.
export function isAgentAuthorized(request: NextRequest): boolean {
	const header = request.headers.get("authorization") ?? "";
	const [scheme, token] = header.split(" ");
	if (scheme !== "Bearer" || !token) return false;

	const provided = createHash("sha256").update(token).digest();
	const expected = createHash("sha256").update(env.VIN_SECRET_KEY).digest();
	return timingSafeEqual(provided, expected);
}

// AGENT_USER_ID isn't a database column (see packages/db/src/schema —
// Phase 0.5 is still single-tenant), it's an intent-confirmation value
// the agent must echo back alongside the bearer secret.
export function isAgentUserId(userId: string | null): boolean {
	return userId !== null && userId === env.AGENT_USER_ID;
}
