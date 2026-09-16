import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "daily_schedule_auth";
const DEFAULT_PASSCODE = "admin123";

export async function GET() {
	const cookieStore = await cookies();
	const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
	const isAuthenticated = authCookie?.value === "authenticated";

	return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { passcode } = body as { passcode?: string };

		const expectedPasscode = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;

		if (passcode && passcode.trim() === expectedPasscode.trim()) {
			const cookieStore = await cookies();
			cookieStore.set(AUTH_COOKIE_NAME, "authenticated", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30, // 30 days
				path: "/",
			});

			return NextResponse.json({ success: true });
		}

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
