import { describe, expect, test } from "bun:test";
import type { CompletionEvent } from "./completion-event";
import { computeRoutineStatus } from "./compute-routine-status";
import type { CompletionEventId, RoutineId } from "./identity";
import type { TaskType } from "./task-type";

// All dates below are constructed with the local Date constructor
// (new Date(y, m, d, ...)) rather than parsed from ISO "Z" strings — the
// implementation's day-boundary logic (fixed-calendar-slot.ts) reads local
// Date getters, so tests must be expressed in local time too, or they'd be
// tied to whatever timezone happens to run them.

const ROUTINE_ID = "test-routine" as RoutineId;
const LONG_AGO = new Date(2000, 0, 1);

function completion(date: Date): CompletionEvent {
	return {
		id: "test-event" as CompletionEventId,
		routineId: ROUTINE_ID,
		completedAt: date,
	};
}

describe("computeRoutineStatus — isPaused short-circuit", () => {
	test("paused OneOff never completed", () => {
		const taskType: TaskType = { kind: "OneOff", dueDate: null };
		expect(
			computeRoutineStatus(taskType, true, null, new Date(), LONG_AGO),
		).toBe("Paused");
	});

	test("paused overrides an already-Finished OneOff", () => {
		const taskType: TaskType = { kind: "OneOff", dueDate: null };
		expect(
			computeRoutineStatus(
				taskType,
				true,
				completion(new Date(2020, 0, 2)),
				new Date(),
				LONG_AGO,
			),
		).toBe("Paused");
	});

	test("paused overrides a mandatory Overdue FixedCalendar", () => {
		const taskType: TaskType = {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: { kind: "Daily" },
				isMandatory: true,
			},
		};
		expect(
			computeRoutineStatus(
				taskType,
				true,
				null,
				new Date(2026, 6, 18),
				LONG_AGO,
			),
		).toBe("Paused");
	});

	test("paused overrides an Overdue RollingInterval", () => {
		const taskType: TaskType = {
			kind: "Recurring",
			schedule: {
				type: "RollingInterval",
				interval: { value: 1, unit: "days" },
			},
		};
		expect(
			computeRoutineStatus(
				taskType,
				true,
				completion(new Date(2020, 0, 1)),
				new Date(2026, 0, 1),
				LONG_AGO,
			),
		).toBe("Paused");
	});
});

describe("computeRoutineStatus — OneOff", () => {
	const now = new Date(2026, 6, 17, 12, 0, 0);

	test("no dueDate, never completed -> Due", () => {
		const taskType: TaskType = { kind: "OneOff", dueDate: null };
		expect(computeRoutineStatus(taskType, false, null, now, LONG_AGO)).toBe(
			"Due",
		);
	});

	test("dueDate in the future, never completed -> Due", () => {
		const taskType: TaskType = {
			kind: "OneOff",
			dueDate: new Date(2026, 6, 18),
		};
		expect(computeRoutineStatus(taskType, false, null, now, LONG_AGO)).toBe(
			"Due",
		);
	});

	test("boundary: dueDate exactly now -> Overdue", () => {
		const taskType: TaskType = { kind: "OneOff", dueDate: now };
		expect(computeRoutineStatus(taskType, false, null, now, LONG_AGO)).toBe(
			"Overdue",
		);
	});

	test("boundary: dueDate 1ms in the future -> Due", () => {
		const taskType: TaskType = {
			kind: "OneOff",
			dueDate: new Date(now.getTime() + 1),
		};
		expect(computeRoutineStatus(taskType, false, null, now, LONG_AGO)).toBe(
			"Due",
		);
	});

	test("boundary: dueDate 1ms in the past -> Overdue", () => {
		const taskType: TaskType = {
			kind: "OneOff",
			dueDate: new Date(now.getTime() - 1),
		};
		expect(computeRoutineStatus(taskType, false, null, now, LONG_AGO)).toBe(
			"Overdue",
		);
	});

	test("completed, no dueDate -> Finished", () => {
		const taskType: TaskType = { kind: "OneOff", dueDate: null };
		expect(
			computeRoutineStatus(
				taskType,
				false,
				completion(new Date(2020, 0, 2)),
				now,
				LONG_AGO,
			),
		).toBe("Finished");
	});

	test("completed, dueDate already passed -> Finished (terminal, deadline irrelevant)", () => {
		const taskType: TaskType = {
			kind: "OneOff",
			dueDate: new Date(2020, 0, 1),
		};
		expect(
			computeRoutineStatus(
				taskType,
				false,
				completion(new Date(2020, 5, 1)),
				now,
				LONG_AGO,
			),
		).toBe("Finished");
	});

	test("completed, dueDate still in the future -> Finished", () => {
		const taskType: TaskType = {
			kind: "OneOff",
			dueDate: new Date(2027, 0, 1),
		};
		expect(
			computeRoutineStatus(
				taskType,
				false,
				completion(new Date(2020, 0, 2)),
				now,
				LONG_AGO,
			),
		).toBe("Finished");
	});
});

describe("computeRoutineStatus — FixedCalendar Daily", () => {
	function daily(isMandatory: boolean): TaskType {
		return {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: { kind: "Daily" },
				isMandatory,
			},
		};
	}

	test("mandatory, created today, never completed -> Due", () => {
		const now = new Date(2026, 6, 17, 12, 0, 0);
		expect(computeRoutineStatus(daily(true), false, null, now, now)).toBe(
			"Due",
		);
	});

	test("mandatory, completed today -> Done", () => {
		const now = new Date(2026, 6, 17, 18, 0, 0);
		expect(
			computeRoutineStatus(
				daily(true),
				false,
				completion(new Date(2026, 6, 17, 8, 0, 0)),
				now,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("mandatory, completed yesterday, checked today -> Due (fresh occurrence)", () => {
		const now = new Date(2026, 6, 17, 12, 0, 0);
		expect(
			computeRoutineStatus(
				daily(true),
				false,
				completion(new Date(2026, 6, 16, 9, 0, 0)),
				now,
				LONG_AGO,
			),
		).toBe("Due");
	});

	test("mandatory, missed day1 entirely, checked day2 -> Overdue", () => {
		const now = new Date(2026, 6, 18, 9, 0, 0);
		expect(computeRoutineStatus(daily(true), false, null, now, LONG_AGO)).toBe(
			"Overdue",
		);
	});

	test("mandatory, missed day1, still Overdue on day3 (persists)", () => {
		const now = new Date(2026, 6, 19, 9, 0, 0);
		expect(computeRoutineStatus(daily(true), false, null, now, LONG_AGO)).toBe(
			"Overdue",
		);
	});

	test("mandatory, completing today resolves a persisted Overdue", () => {
		const now = new Date(2026, 6, 19, 12, 0, 0);
		expect(
			computeRoutineStatus(
				daily(true),
				false,
				completion(new Date(2026, 6, 19, 9, 0, 0)),
				now,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("non-mandatory, missed day1, checked day2 -> Due, never Overdue", () => {
		const now = new Date(2026, 6, 18, 9, 0, 0);
		expect(computeRoutineStatus(daily(false), false, null, now, LONG_AGO)).toBe(
			"Due",
		);
	});

	test("non-mandatory, missed many days -> still just Due (no penalty state)", () => {
		const now = new Date(2026, 7, 1, 9, 0, 0);
		expect(computeRoutineStatus(daily(false), false, null, now, LONG_AGO)).toBe(
			"Due",
		);
	});

	test("boundary: 1ms before midnight is still the same open Due day", () => {
		const now = new Date(2026, 6, 17, 23, 59, 59, 999);
		expect(
			computeRoutineStatus(
				daily(true),
				false,
				completion(new Date(2026, 6, 16, 8, 0, 0)),
				now,
				LONG_AGO,
			),
		).toBe("Due");
	});

	test("boundary: exactly at midnight, the previous day's miss is now Overdue", () => {
		const now = new Date(2026, 6, 18, 0, 0, 0, 0);
		expect(
			computeRoutineStatus(
				daily(true),
				false,
				completion(new Date(2026, 6, 16, 8, 0, 0)),
				now,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("mandatory, created at this exact instant, never completed -> Due (not punished)", () => {
		const now = new Date(2026, 6, 17, 15, 0, 0);
		expect(computeRoutineStatus(daily(true), false, null, now, now)).toBe(
			"Due",
		);
	});
});

describe("computeRoutineStatus — FixedCalendar Weekly", () => {
	// 2026-07-13 is a Monday; 2026-07-16 is the following Thursday.
	function weekly(isMandatory: boolean): TaskType {
		return {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: { kind: "Weekly", daysOfWeek: ["Mon", "Thu"] },
				isMandatory,
			},
		};
	}

	test("occurrence day (Monday), never completed, freshly created -> Due", () => {
		// createdAt = monday: this is the routine's first-ever occurrence, so
		// there's no prior unsatisfied occurrence to be Overdue about.
		const monday = new Date(2026, 6, 13, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(true), false, null, monday, monday),
		).toBe("Due");
	});

	test("occurrence day (Monday), never completed, long-lived routine -> Overdue (a prior occurrence was missed)", () => {
		const monday = new Date(2026, 6, 13, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(true), false, null, monday, LONG_AGO),
		).toBe("Overdue");
	});

	test("completed on Monday, checked same Monday -> Done", () => {
		const monday = new Date(2026, 6, 13, 18, 0, 0);
		expect(
			computeRoutineStatus(
				weekly(true),
				false,
				completion(new Date(2026, 6, 13, 8, 0, 0)),
				monday,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("completed Monday, checked Wednesday (non-occurrence day, same cycle) -> still Done", () => {
		const wednesday = new Date(2026, 6, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(
				weekly(true),
				false,
				completion(new Date(2026, 6, 13, 8, 0, 0)),
				wednesday,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("mandatory, missed Monday, checked Wednesday -> Overdue", () => {
		const wednesday = new Date(2026, 6, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(true), false, null, wednesday, LONG_AGO),
		).toBe("Overdue");
	});

	test("non-mandatory, missed Monday, checked Wednesday -> Due (silent reset)", () => {
		const wednesday = new Date(2026, 6, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(false), false, null, wednesday, LONG_AGO),
		).toBe("Due");
	});

	test("mandatory, missed Monday, arrived at NEXT occurrence Thursday -> Overdue persists", () => {
		const thursday = new Date(2026, 6, 16, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(true), false, null, thursday, LONG_AGO),
		).toBe("Overdue");
	});

	test("non-mandatory, missed Monday, arrived at Thursday -> Due (fresh occurrence, no persistence)", () => {
		const thursday = new Date(2026, 6, 16, 9, 0, 0);
		expect(
			computeRoutineStatus(weekly(false), false, null, thursday, LONG_AGO),
		).toBe("Due");
	});

	test("boundary: 1ms before Tuesday (still Monday) -> Due, not yet Overdue", () => {
		// Freshly created this Monday — no prior occurrence yet to be Overdue about.
		const createdMonday = new Date(2026, 6, 13, 0, 0, 0, 0);
		const almostTuesday = new Date(2026, 6, 13, 23, 59, 59, 999);
		expect(
			computeRoutineStatus(
				weekly(true),
				false,
				null,
				almostTuesday,
				createdMonday,
			),
		).toBe("Due");
	});

	test("boundary: exactly midnight Tuesday -> Overdue (Monday's slot has closed)", () => {
		const tuesdayMidnight = new Date(2026, 6, 14, 0, 0, 0, 0);
		expect(
			computeRoutineStatus(
				weekly(true),
				false,
				null,
				tuesdayMidnight,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("created on a non-occurrence day (Wednesday), checked same Wednesday -> Due, not punished", () => {
		const wednesday = new Date(2026, 6, 15, 9, 0, 0);
		const createdWednesday = new Date(2026, 6, 15, 8, 0, 0);
		expect(
			computeRoutineStatus(
				weekly(true),
				false,
				null,
				wednesday,
				createdWednesday,
			),
		).toBe("Due");
	});

	test("created Sunday, checked first Monday occurrence -> Due, not punished for prior Thursday", () => {
		const monday = new Date(2026, 6, 13, 9, 0, 0);
		const createdSunday = new Date(2026, 6, 12, 8, 0, 0);
		expect(
			computeRoutineStatus(weekly(true), false, null, monday, createdSunday),
		).toBe("Due");
	});
});

describe("computeRoutineStatus — FixedCalendar Monthly", () => {
	function monthly(dayOfMonth: number, isMandatory: boolean): TaskType {
		return {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: { kind: "Monthly", dayOfMonth },
				isMandatory,
			},
		};
	}

	test("occurrence day (15th), never completed, freshly created -> Due", () => {
		const the15th = new Date(2026, 6, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(15, true), false, null, the15th, the15th),
		).toBe("Due");
	});

	test("occurrence day (15th), never completed, long-lived routine -> Overdue", () => {
		const the15th = new Date(2026, 6, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(15, true), false, null, the15th, LONG_AGO),
		).toBe("Overdue");
	});

	test("completed on the 15th, checked the 20th (same month) -> Done", () => {
		const the20th = new Date(2026, 6, 20, 9, 0, 0);
		expect(
			computeRoutineStatus(
				monthly(15, true),
				false,
				completion(new Date(2026, 6, 15, 8, 0, 0)),
				the20th,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("mandatory, missed the 15th, checked the 20th -> Overdue", () => {
		const the20th = new Date(2026, 6, 20, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(15, true), false, null, the20th, LONG_AGO),
		).toBe("Overdue");
	});

	test("non-mandatory, missed the 15th, checked the 20th -> Due", () => {
		const the20th = new Date(2026, 6, 20, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(15, false), false, null, the20th, LONG_AGO),
		).toBe("Due");
	});

	test("mandatory, missed month1's 15th, arrived at month2's 15th -> Overdue persists", () => {
		const nextMonth15th = new Date(2026, 7, 15, 9, 0, 0);
		expect(
			computeRoutineStatus(
				monthly(15, true),
				false,
				null,
				nextMonth15th,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("clamping: dayOfMonth=31 in February resolves to the last real day of February", () => {
		// 2026 is not a leap year: Feb has 28 days. Checking Feb 28 should be
		// treated as this month's (clamped) occurrence day itself -> Due, not Overdue.
		// Freshly created this same day, so there's no prior occurrence to be
		// Overdue about.
		const feb28 = new Date(2026, 1, 28, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(31, true), false, null, feb28, feb28),
		).toBe("Due");
	});

	test("clamping: dayOfMonth=31, checked March 1st -> Overdue (Feb's clamped occurrence missed)", () => {
		const march1st = new Date(2026, 2, 1, 9, 0, 0);
		expect(
			computeRoutineStatus(monthly(31, true), false, null, march1st, LONG_AGO),
		).toBe("Overdue");
	});

	test("created before this month's occurrence, checked same day -> Due, not punished by last month", () => {
		const feb10 = new Date(2026, 1, 10, 9, 0, 0);
		const createdFeb10 = new Date(2026, 1, 10, 8, 0, 0);
		expect(
			computeRoutineStatus(monthly(15, true), false, null, feb10, createdFeb10),
		).toBe("Due");
	});
});

describe("computeRoutineStatus — RollingInterval", () => {
	function rolling(value: number, unit: "days" | "weeks" | "months"): TaskType {
		return {
			kind: "Recurring",
			schedule: { type: "RollingInterval", interval: { value, unit } },
		};
	}

	test("never completed -> Due", () => {
		expect(
			computeRoutineStatus(
				rolling(6, "months"),
				false,
				null,
				new Date(),
				LONG_AGO,
			),
		).toBe("Due");
	});

	test("completed, well within the interval -> Done", () => {
		const completedAt = new Date(2026, 1, 17, 12, 0, 0);
		const now = new Date(2026, 6, 17, 12, 0, 0); // 5 months later
		expect(
			computeRoutineStatus(
				rolling(6, "months"),
				false,
				completion(completedAt),
				now,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("completed, well past the interval -> Overdue", () => {
		const completedAt = new Date(2025, 11, 17, 12, 0, 0);
		const now = new Date(2026, 6, 17, 12, 0, 0); // 7 months later
		expect(
			computeRoutineStatus(
				rolling(6, "months"),
				false,
				completion(completedAt),
				now,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("boundary: exactly at the interval instant -> Overdue", () => {
		const completedAt = new Date(2026, 0, 1, 0, 0, 0, 0);
		const dueAt = new Date(2026, 0, 8, 0, 0, 0, 0); // +7 days
		expect(
			computeRoutineStatus(
				rolling(7, "days"),
				false,
				completion(completedAt),
				dueAt,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("boundary: 1ms before the interval instant -> Done", () => {
		const completedAt = new Date(2026, 0, 1, 0, 0, 0, 0);
		const dueAt = new Date(2026, 0, 8, 0, 0, 0, 0);
		const justBefore = new Date(dueAt.getTime() - 1);
		expect(
			computeRoutineStatus(
				rolling(7, "days"),
				false,
				completion(completedAt),
				justBefore,
				LONG_AGO,
			),
		).toBe("Done");
	});

	test("boundary: 1ms after the interval instant -> Overdue", () => {
		const completedAt = new Date(2026, 0, 1, 0, 0, 0, 0);
		const dueAt = new Date(2026, 0, 8, 0, 0, 0, 0);
		const justAfter = new Date(dueAt.getTime() + 1);
		expect(
			computeRoutineStatus(
				rolling(7, "days"),
				false,
				completion(completedAt),
				justAfter,
				LONG_AGO,
			),
		).toBe("Overdue");
	});

	test("weeks unit: due after exactly N weeks", () => {
		const completedAt = new Date(2026, 0, 1, 0, 0, 0, 0);
		const dueAt = new Date(2026, 0, 15, 0, 0, 0, 0); // +2 weeks
		expect(
			computeRoutineStatus(
				rolling(2, "weeks"),
				false,
				completion(completedAt),
				dueAt,
				LONG_AGO,
			),
		).toBe("Overdue");
	});
});
