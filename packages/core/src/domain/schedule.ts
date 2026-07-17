export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type RecurrencePattern =
	| { readonly kind: "Daily" }
	| { readonly kind: "Weekly"; readonly daysOfWeek: readonly DayOfWeek[] }
	| { readonly kind: "Monthly"; readonly dayOfMonth: number };

export interface Duration {
	readonly value: number;
	readonly unit: "days" | "weeks" | "months";
}

export interface FixedCalendarSchedule {
	readonly type: "FixedCalendar";
	readonly recurrence: RecurrencePattern;
	readonly isMandatory: boolean;
}

export interface RollingIntervalSchedule {
	readonly type: "RollingInterval";
	// No isMandatory field: RollingInterval is always strict by definition —
	// there is no calendar slot to silently close, so it always becomes
	// Overdue once the interval elapses (see PRD §6).
	readonly interval: Duration;
}

export type Schedule = FixedCalendarSchedule | RollingIntervalSchedule;
