import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Edge-safe: reads the session cookie only, no DB round-trip. That's
// enough to gate the dashboard — a forged/expired cookie still fails
// server-side in packages/api's protectedProcedure, which does the real
// auth.api.getSession() lookup.
//
// Named proxy.ts / export `proxy`, not middleware.ts / `middleware` —
// Next.js 16 renamed the convention (the old one logs a deprecation
// warning but still runs).
export function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/login", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/"],
};
