import { describe, expect, test } from "bun:test";
import {
	getMostRecentScheduledDate,
	getPreviousScheduledDate,
	isSameDay,
	startOfDay,
} from "./fixed-calendar-slot";

// Local Date constructor throughout — see compute-routine-status.test.ts for why.

describe("startOfDay / isSameDay", () => {
	test("startOfDay strips the time component", () => {
		const result = startOfDay(new Date(2026, 6, 17, 18, 42, 31));
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
	});

	test("isSameDay is true for two timestamps on the same calendar day", () => {
		expect(
			isSameDay(
				new Date(2026, 6, 17, 0, 0, 0),
				new Date(2026, 6, 17, 23, 59, 59, 999),
			),
		).toBe(true);
	});

	test("isSameDay is false across a midnight boundary", () => {
		expect(
			isSameDay(
				new Date(2026, 6, 17, 23, 59, 59, 999),
				new Date(2026, 6, 18, 0, 0, 0, 0),
			),
		).toBe(false);
	});
});

describe("getMostRecentScheduledDate — Daily", () => {
	test("always returns today", () => {
		const now = new Date(2026, 6, 17, 15, 0, 0);
		const result = getMostRecentScheduledDate({ kind: "Daily" }, now);
		expect(isSameDay(result, now)).toBe(true);
	});
});

describe("getMostRecentScheduledDate — Weekly", () => {
	test("returns today when today is an occurrence day", () => {
		const monday = new Date(2026, 6, 13, 15, 0, 0);
		const result = getMostRecentScheduledDate(
			{ kind: "Weekly", daysOfWeek: ["Mon", "Thu"] },
			monday,
		);
		expect(isSameDay(result, monday)).toBe(true);
	});

	test("returns the most recent occurrence day, wrapping back across a week boundary", () => {
		// Sunday 2026-07-19: the most recent Mon/Thu occurrence is Thursday 07-16.
		const sunday = new Date(2026, 6, 19, 15, 0, 0);
		const result = getMostRecentScheduledDate(
			{ kind: "Weekly", daysOfWeek: ["Mon", "Thu"] },
			sunday,
		);
		expect(isSameDay(result, new Date(2026, 6, 16))).toBe(true);
	});
});

describe("getMostRecentScheduledDate — Monthly", () => {
	test("returns this month's occurrence when it has already happened", () => {
		const the20th = new Date(2026, 6, 20, 15, 0, 0);
		const result = getMostRecentScheduledDate(
			{ kind: "Monthly", dayOfMonth: 15 },
			the20th,
		);
		expect(isSameDay(result, new Date(2026, 6, 15))).toBe(true);
	});

	test("falls back to last month's occurrence when this month's hasn't happened yet", () => {
		const the10th = new Date(2026, 6, 10, 15, 0, 0);
		const result = getMostRecentScheduledDate(
			{ kind: "Monthly", dayOfMonth: 15 },
			the10th,
		);
		expect(isSameDay(result, new Date(2026, 5, 15))).toBe(true);
	});

	test("clamps dayOfMonth=31 to the last real day of a 28-day February", () => {
		const march1st = new Date(2026, 2, 1, 15, 0, 0);
		const result = getMostRecentScheduledDate(
			{ kind: "Monthly", dayOfMonth: 31 },
			march1st,
		);
		expect(isSameDay(result, new Date(2026, 1, 28))).toBe(true);
	});

	test("clamps dayOfMonth=31 to a 29-day February in a leap year", () => {
		const march1st = new Date(2028, 2, 1, 15, 0, 0); // 2028 is a leap year
		const result = getMostRecentScheduledDate(
			{ kind: "Monthly", dayOfMonth: 31 },
			march1st,
		);
		expect(isSameDay(result, new Date(2028, 1, 29))).toBe(true);
	});
});

describe("getPreviousScheduledDate", () => {
	test("Daily: previous occurrence is always yesterday", () => {
		const today = new Date(2026, 6, 17, 15, 0, 0);
		const result = getPreviousScheduledDate({ kind: "Daily" }, today);
		expect(isSameDay(result, new Date(2026, 6, 16))).toBe(true);
	});

	test("Weekly: previous occurrence before today's own occurrence day", () => {
		// today is Thursday 07-16; the occurrence immediately before it is Monday 07-13.
		const thursday = new Date(2026, 6, 16, 15, 0, 0);
		const result = getPreviousScheduledDate(
			{ kind: "Weekly", daysOfWeek: ["Mon", "Thu"] },
			thursday,
		);
		expect(isSameDay(result, new Date(2026, 6, 13))).toBe(true);
	});

	test("Monthly: previous occurrence is last month's day", () => {
		const august15th = new Date(2026, 7, 15, 15, 0, 0);
		const result = getPreviousScheduledDate(
			{ kind: "Monthly", dayOfMonth: 15 },
			august15th,
		);
		expect(isSameDay(result, new Date(2026, 6, 15))).toBe(true);
	});
});
