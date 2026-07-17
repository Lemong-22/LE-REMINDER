import { addDuration } from "../lib/duration";
import type { CompletionEvent } from "./completion-event";
import {
	getMostRecentScheduledDate,
	getPreviousScheduledDate,
	isSameDay,
	startOfDay,
} from "./fixed-calendar-slot";
import type { RoutineStatus } from "./routine-status";
import type {
	FixedCalendarSchedule,
	RollingIntervalSchedule,
} from "./schedule";
import type { OneOffTask, TaskType } from "./task-type";

function computeOneOffStatus(
	taskType: OneOffTask,
	latestCompletion: CompletionEvent | null,
	now: Date,
): RoutineStatus {
	if (latestCompletion !== null) {
		return "Finished";
	}
	if (
		taskType.dueDate !== null &&
		now.getTime() >= taskType.dueDate.getTime()
	) {
		return "Overdue";
	}
	return "Due";
}

function computeFixedCalendarStatus(
	schedule: FixedCalendarSchedule,
	latestCompletion: CompletionEvent | null,
	now: Date,
	createdAt: Date,
): RoutineStatus {
	const today = startOfDay(now);
	const creationDay = startOfDay(createdAt);

	const referenceOccurrence = getMostRecentScheduledDate(
		schedule.recurrence,
		now,
	);
	// No occurrence has happened yet since this routine was created — nothing
	// to be Due or Overdue about.
	if (referenceOccurrence.getTime() < creationDay.getTime()) {
		return "Due";
	}

	const completedAtOrAfterReference =
		latestCompletion !== null &&
		latestCompletion.completedAt.getTime() >= referenceOccurrence.getTime();

	if (completedAtOrAfterReference) {
		return "Done";
	}

	if (!isSameDay(referenceOccurrence, today)) {
		// referenceOccurrence already elapsed (it's a past date, not today) and
		// was never satisfied.
		return schedule.isMandatory ? "Overdue" : "Due";
	}

	// Today's own occurrence is still open. A mandatory Overdue must persist
	// across the boundary into a new occurrence day rather than silently
	// reset — so check whether the *previous* occurrence (if it happened
	// since this routine was created) is still unsatisfied.
	const priorOccurrence = getPreviousScheduledDate(schedule.recurrence, today);
	const priorOccurrenceExists =
		priorOccurrence.getTime() >= creationDay.getTime();
	const completedAtOrAfterPrior =
		latestCompletion !== null &&
		latestCompletion.completedAt.getTime() >= priorOccurrence.getTime();

	if (
		priorOccurrenceExists &&
		!completedAtOrAfterPrior &&
		schedule.isMandatory
	) {
		return "Overdue";
	}

	return "Due";
}

function computeRollingIntervalStatus(
	schedule: RollingIntervalSchedule,
	latestCompletion: CompletionEvent | null,
	now: Date,
): RoutineStatus {
	if (latestCompletion === null) {
		return "Due";
	}
	const dueAt = addDuration(latestCompletion.completedAt, schedule.interval);
	return now.getTime() >= dueAt.getTime() ? "Overdue" : "Done";
}

export function computeRoutineStatus(
	taskType: TaskType,
	isPaused: boolean,
	latestCompletion: CompletionEvent | null,
	now: Date,
	createdAt: Date,
): RoutineStatus {
	if (isPaused) {
		return "Paused";
	}

	if (taskType.kind === "OneOff") {
		return computeOneOffStatus(taskType, latestCompletion, now);
	}

	return taskType.schedule.type === "FixedCalendar"
		? computeFixedCalendarStatus(
				taskType.schedule,
				latestCompletion,
				now,
				createdAt,
			)
		: computeRollingIntervalStatus(taskType.schedule, latestCompletion, now);
}
