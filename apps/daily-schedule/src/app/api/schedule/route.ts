import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-server";
import { SCHEDULE_DATA } from "@/lib/schedule-data";

export async function GET() {
	const cookieStore = await cookies();
	const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

	if (!verifySessionToken(authCookie?.value)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json({ schedule: SCHEDULE_DATA });
}
