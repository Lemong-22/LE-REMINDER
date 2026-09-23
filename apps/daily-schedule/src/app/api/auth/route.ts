import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
	AUTH_COOKIE_NAME,
	checkRateLimit,
	createSessionToken,
	recordFailedAttempt,
	resetRateLimit,
	verifyPasscode,
	verifySessionToken,
} from "@/lib/auth-server";

export async function GET() {
	const cookieStore = await cookies();
	const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
	const isAuthenticated = verifySessionToken(authCookie?.value);

	return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(request: NextRequest) {
	const clientIp =
		request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
		request.headers.get("x-real-ip") ||
		"127.0.0.1";

	const rateCheck = checkRateLimit(clientIp);
	if (!rateCheck.allowed) {
		return NextResponse.json(
			{
				success: false,
				error: `Too many failed attempts. Please wait ${rateCheck.retryAfterSeconds}s before trying again.`,
			},
			{
				status: 429,
				headers: {
					"Retry-After": String(rateCheck.retryAfterSeconds ?? 60),
				},
			},
		);
	}

	try {
		const body = await request.json();
		const { passcode } = body as { passcode?: string };

		if (verifyPasscode(passcode)) {
			resetRateLimit(clientIp);
			const token = createSessionToken();

			const cookieStore = await cookies();
			cookieStore.set(AUTH_COOKIE_NAME, token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30, // 30 days
				path: "/",
			});

			return NextResponse.json({ success: true });
		}

		recordFailedAttempt(clientIp);
		return NextResponse.json(
			{ success: false, error: "Incorrect admin passcode" },
			{ status: 401 },
		);
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid request" },
			{ status: 400 },
		);
	}
}

export async function DELETE() {
	const cookieStore = await cookies();
	cookieStore.delete(AUTH_COOKIE_NAME);
	return NextResponse.json({ success: true });
}
