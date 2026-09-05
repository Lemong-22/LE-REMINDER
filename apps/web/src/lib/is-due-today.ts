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
 * matches one of the scheduled target days, preventing premature priority glow
 * on days leading up to the target day.
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
		const todayDayOfWeek = DAYS_OF_WEEK[now.getDay()];
		if (!todayDayOfWeek) return false;
		return recurrence.daysOfWeek.includes(todayDayOfWeek);
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
