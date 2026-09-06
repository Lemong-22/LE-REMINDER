/// <reference types="bun" />

import type { DayOfWeek } from "@LE-REMINDER/core/domain/schedule";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";
import { describe, expect, test } from "bun:test";
import { isStrictlyDueToday } from "../src/lib/is-due-today";

function makeWeeklyTask(daysOfWeek: DayOfWeek[]): TaskType {
	return {
		kind: "Recurring",
		schedule: {
			type: "FixedCalendar",
			recurrence: {
				kind: "Weekly",
				daysOfWeek,
			},
			isMandatory: true,
		},
	};
}

describe("isStrictlyDueToday", () => {
	// 2026-09-06 is Sunday
	const sunday = new Date(2026, 8, 6, 11, 15, 0);
	// 2026-09-07 is Monday
	const monday = new Date(2026, 8, 7, 9, 0, 0);

	test("returns true for weekly routine scheduled on Sunday when today is Sunday", () => {
		const routine = makeWeeklyTask(["Sun"]);
		expect(isStrictlyDueToday(routine, "Due", sunday)).toBe(true);
	});

	test("returns false for weekly routine scheduled on Sunday when today is Monday", () => {
		const routine = makeWeeklyTask(["Sun"]);
		expect(isStrictlyDueToday(routine, "Due", monday)).toBe(false);
	});

	test("returns false if status is not Due even if day matches", () => {
		const routine = makeWeeklyTask(["Sun"]);
		expect(isStrictlyDueToday(routine, "Done", sunday)).toBe(false);
		expect(isStrictlyDueToday(routine, "Paused", sunday)).toBe(false);
		expect(isStrictlyDueToday(routine, "Overdue", sunday)).toBe(false);
	});

	test("matches case-insensitively and handles whitespace or full names", () => {
		const lowerCaseTask = makeWeeklyTask(["sun" as unknown as DayOfWeek]);
		expect(isStrictlyDueToday(lowerCaseTask, "Due", sunday)).toBe(true);

		const fullDayNameTask = makeWeeklyTask(["Sunday" as unknown as DayOfWeek]);
		expect(isStrictlyDueToday(fullDayNameTask, "Due", sunday)).toBe(true);

		const paddedTask = makeWeeklyTask([" Sun " as unknown as DayOfWeek]);
		expect(isStrictlyDueToday(paddedTask, "Due", sunday)).toBe(true);
	});

	test("handles multiple days correctly", () => {
		const multiDay = makeWeeklyTask(["Tue", "Sun", "Thu"]);
		expect(isStrictlyDueToday(multiDay, "Due", sunday)).toBe(true);
		expect(isStrictlyDueToday(multiDay, "Due", monday)).toBe(false);
	});

	test("evaluates OneOff tasks by calendar date", () => {
		const oneOffToday: TaskType = {
			kind: "OneOff",
			dueDate: new Date(2026, 8, 6, 23, 59, 59),
		};
		const oneOffTomorrow: TaskType = {
			kind: "OneOff",
			dueDate: new Date(2026, 8, 7, 23, 59, 59),
		};

		expect(isStrictlyDueToday(oneOffToday, "Due", sunday)).toBe(true);
		expect(isStrictlyDueToday(oneOffTomorrow, "Due", sunday)).toBe(false);
	});

	test("evaluates Monthly tasks by day of month", () => {
		const monthlyTask: TaskType = {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: {
					kind: "Monthly",
					dayOfMonth: 6,
				},
				isMandatory: true,
			},
		};

		expect(isStrictlyDueToday(monthlyTask, "Due", sunday)).toBe(true);
		expect(isStrictlyDueToday(monthlyTask, "Due", monday)).toBe(false);
	});
});
