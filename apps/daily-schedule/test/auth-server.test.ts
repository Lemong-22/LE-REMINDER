import { describe, expect, it } from "bun:test";
import {
	checkRateLimit,
	createSessionToken,
	recordFailedAttempt,
	resetRateLimit,
	verifyPasscode,
	verifySessionToken,
} from "../src/lib/auth-server";

describe("Daily Schedule Auth Server Security", () => {
	it("generates and verifies a valid HMAC session token", () => {
		const token = createSessionToken();
		expect(typeof token).toBe("string");
		expect(verifySessionToken(token)).toBe(true);
	});

	it("strictly rejects forged tokens, invalid signatures, and plain strings", () => {
		// Old insecure bypass attempt
		expect(verifySessionToken("authenticated")).toBe(false);

		// Tampered signature
		const token = createSessionToken();
		const [timestamp, sig] = token.split(".");
		if (!sig) throw new Error("Expected signature in token");
		const tamperedSig = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
		expect(verifySessionToken(`${timestamp}.${tamperedSig}`)).toBe(false);

		// Malformed tokens
		expect(verifySessionToken("")).toBe(false);
		expect(verifySessionToken(null)).toBe(false);
		expect(verifySessionToken("12345")).toBe(false);
		expect(verifySessionToken("notanumber.fakesignature")).toBe(false);
	});

	it("rejects expired tokens and future timestamps", () => {
		// Expired (31 days ago)
		const expiredTimestamp = (Date.now() - 1000 * 60 * 60 * 24 * 31).toString();
		const expiredToken = `${expiredTimestamp}.somefake`;
		expect(verifySessionToken(expiredToken)).toBe(false);

		// Future timestamp (> 5 min)
		const futureTimestamp = (Date.now() + 1000 * 60 * 10).toString();
		const futureToken = `${futureTimestamp}.somefake`;
		expect(verifySessionToken(futureToken)).toBe(false);
	});

	it("verifies passcode correctly", () => {
		// Default passcode when ADMIN_PASSCODE is unset
		expect(verifyPasscode("admin123")).toBe(true);
		expect(verifyPasscode("admin123 ")).toBe(true); // trimmed
		expect(verifyPasscode("wrongpassword")).toBe(false);
		expect(verifyPasscode("")).toBe(false);
		expect(verifyPasscode(null)).toBe(false);
	});

	it("throttles brute force attempts with rate limiting", () => {
		const testIp = "192.168.1.100";
		resetRateLimit(testIp);

		// Initially allowed
		expect(checkRateLimit(testIp).allowed).toBe(true);

		// 4 failed attempts should still be allowed
		for (let i = 0; i < 4; i++) {
			recordFailedAttempt(testIp);
			expect(checkRateLimit(testIp).allowed).toBe(true);
		}

		// 5th failed attempt should trigger rate limit lockout
		recordFailedAttempt(testIp);
		const blocked = checkRateLimit(testIp);
		expect(blocked.allowed).toBe(false);
		expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

		// Resetting clears the lock
		resetRateLimit(testIp);
		expect(checkRateLimit(testIp).allowed).toBe(true);
	});
});
