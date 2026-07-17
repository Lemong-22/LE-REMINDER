import type { DayOfWeek, RecurrencePattern } from "./schedule";

const DAYS_OF_WEEK: readonly DayOfWeek[] = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
];

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function lastDayOfMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate();
}

function monthlyOccurrence(
	year: number,
	monthIndex: number,
	dayOfMonth: number,
): Date {
	const clampedDay = Math.min(dayOfMonth, lastDayOfMonth(year, monthIndex));
	return new Date(year, monthIndex, clampedDay);
}

// Returns the most recent calendar date (at or before `now`) on which this
// pattern schedules an occurrence. Callers use this to tell whether "today"
// is itself the live occurrence, or whether a past occurrence has already
// closed without a completion.
export function getMostRecentScheduledDate(
	pattern: RecurrencePattern,
	now: Date,
): Date {
	const today = startOfDay(now);

	switch (pattern.kind) {
		case "Daily":
			return today;

		case "Weekly": {
			for (let offset = 0; offset < 7; offset++) {
				const candidate = new Date(today);
				candidate.setDate(candidate.getDate() - offset);
				// Date#getDay() always returns 0-6, so this index is always in bounds.
				const weekday = DAYS_OF_WEEK[candidate.getDay()] as DayOfWeek;
				if (pattern.daysOfWeek.includes(weekday)) {
					return candidate;
				}
			}
			return today;
		}

		case "Monthly": {
			const thisMonth = monthlyOccurrence(
				today.getFullYear(),
				today.getMonth(),
				pattern.dayOfMonth,
			);
			if (thisMonth.getTime() <= today.getTime()) {
				return thisMonth;
			}
			const previousMonthIndex = today.getMonth() - 1;
			const year =
				previousMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
			const monthIndex = previousMonthIndex < 0 ? 11 : previousMonthIndex;
			return monthlyOccurrence(year, monthIndex, pattern.dayOfMonth);
		}
	}
}

// Returns the most recent occurrence strictly before `today` — i.e. the
// occurrence immediately preceding whatever getMostRecentScheduledDate would
// return for `today` itself. Used to detect a still-unsatisfied past
// occurrence even once a new occurrence day has arrived (mandatory Overdue
// must persist across that boundary rather than silently reset).
export function getPreviousScheduledDate(
	pattern: RecurrencePattern,
	today: Date,
): Date {
	const dayBefore = new Date(startOfDay(today).getTime() - 1);
	return getMostRecentScheduledDate(pattern, dayBefore);
}
