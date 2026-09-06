import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import type { DayOfWeek } from "@LE-REMINDER/core/domain/schedule";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";

const DAYS_OF_WEEK: readonly DayOfWeek[] = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
];

function isSameCalendarDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Checks whether a routine is strictly due TODAY.
 *
 * For FixedCalendar Weekly routines, this verifies that today's day of the week
 * matches one of the scheduled target days in the user's local timezone (NOT UTC),
 * preventing premature priority glow on days leading up to the target day and
 * avoiding UTC midnight boundary shifts.
 */
export function isStrictlyDueToday(
	taskType: TaskType,
	status: RoutineStatus,
	now: Date = new Date(),
): boolean {
	if (status !== "Due") {
		return false;
	}

	if (taskType.kind === "OneOff") {
		if (taskType.dueDate !== null) {
			return isSameCalendarDay(new Date(taskType.dueDate), now);
		}
		return true;
	}

	const schedule = taskType.schedule;

	if (schedule.type === "RollingInterval") {
		return true;
	}

	const recurrence = schedule.recurrence;

	if (recurrence.kind === "Daily") {
		return true;
	}

	if (recurrence.kind === "Weekly") {
		// Date#getDay() returns 0 (Sun) - 6 (Sat) strictly in the local environment's timezone.
		// Never use getUTCDay() here to avoid day-shift discrepancy for non-UTC locales.
		const localDayIndex = now.getDay();
		const currentDayOfWeek = DAYS_OF_WEEK[localDayIndex];
		if (!currentDayOfWeek) return false;

		const targetLower = currentDayOfWeek.toLowerCase();
		return recurrence.daysOfWeek.some((day) => {
			if (!day || typeof day !== "string") return false;
			const trimmedLower = day.trim().toLowerCase();
			return (
				trimmedLower === targetLower ||
				trimmedLower.startsWith(targetLower) ||
				targetLower.startsWith(trimmedLower)
			);
		});
	}

	if (recurrence.kind === "Monthly") {
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const targetDay = Math.min(recurrence.dayOfMonth, daysInMonth);
		return now.getDate() === targetDay;
	}

	return false;
}
