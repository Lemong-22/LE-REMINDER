import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "daily_schedule_auth";
const DEFAULT_PASSCODE = "admin123";
const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): string {
	return (
		process.env.DAILY_SCHEDULE_SECRET ||
		process.env.ADMIN_PASSCODE ||
		"daily-schedule-secure-session-salt-le-reminder"
	);
}

/**
 * Generates an HMAC-SHA256 signed session token containing a creation timestamp.
 * Format: `<timestampMs>.<hexHmac>`
 */
export function createSessionToken(): string {
	const timestamp = Date.now().toString();
	const hmac = createHmac("sha256", getSecretKey())
		.update(timestamp)
		.digest("hex");
	return `${timestamp}.${hmac}`;
}

/**
 * Validates an HMAC-SHA256 signed session token.
 * Prevents cookie forgery, expired sessions, and future timestamp tampering.
 */
export function verifySessionToken(token: string | undefined | null): boolean {
	if (!token || typeof token !== "string") return false;

	const parts = token.split(".");
	if (parts.length !== 2) return false;

	const [timestampStr, signature] = parts;
	const timestamp = Number.parseInt(timestampStr, 10);
	if (Number.isNaN(timestamp)) return false;

	const now = Date.now();
	// Reject expired tokens (older than 30 days) or tokens from the future (> 5 min clock skew)
	if (now - timestamp > TOKEN_MAX_AGE_MS || timestamp - now > 5 * 60 * 1000) {
		return false;
	}

	const expectedSignature = createHmac("sha256", getSecretKey())
		.update(timestampStr)
		.digest("hex");

	const sigBuf = Buffer.from(signature);
	const expectedBuf = Buffer.from(expectedSignature);

	if (sigBuf.length !== expectedBuf.length) return false;
	return timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Verifies the admin passcode in constant time using SHA-256 digests.
 * Prevents side-channel timing attacks.
 */
export function verifyPasscode(passcode: string | undefined | null): boolean {
	if (!passcode || typeof passcode !== "string") return false;

	const expectedPasscode = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
	const expectedHash = createHash("sha256")
		.update(expectedPasscode.trim())
		.digest();
	const providedHash = createHash("sha256").update(passcode.trim()).digest();

	return timingSafeEqual(expectedHash, providedHash);
}

// In-memory sliding rate limiter for login attempts (per IP)
interface RateLimitRecord {
	count: number;
	firstAttemptMs: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

/**
 * Checks whether an IP has exceeded the max allowed passcode attempts within the rate-limit window.
 */
export function checkRateLimit(ip: string): {
	allowed: boolean;
	retryAfterSeconds?: number;
} {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (!record) {
		return { allowed: true };
	}

	if (now - record.firstAttemptMs > RATE_LIMIT_WINDOW_MS) {
		rateLimitMap.delete(ip);
		return { allowed: true };
	}

	if (record.count >= MAX_ATTEMPTS) {
		const retryAfter = Math.ceil(
			(record.firstAttemptMs + RATE_LIMIT_WINDOW_MS - now) / 1000,
		);
		return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
	}

	return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (!record || now - record.firstAttemptMs > RATE_LIMIT_WINDOW_MS) {
		rateLimitMap.set(ip, { count: 1, firstAttemptMs: now });
	} else {
		record.count += 1;
	}
}

export function resetRateLimit(ip: string): void {
	rateLimitMap.delete(ip);
}
