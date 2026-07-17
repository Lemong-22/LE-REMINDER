import { addDuration } from "../lib/duration";
import type { CompletionEvent } from "./completion-event";
import { getMostRecentScheduledDate, isSameDay } from "./fixed-calendar-slot";
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
): RoutineStatus {
	const mostRecentScheduledDate = getMostRecentScheduledDate(
		schedule.recurrence,
		now,
	);

	const completedSinceScheduledDate =
		latestCompletion !== null &&
		latestCompletion.completedAt.getTime() >= mostRecentScheduledDate.getTime();

	if (completedSinceScheduledDate) {
		return "Done";
	}
	if (isSameDay(mostRecentScheduledDate, now)) {
		return "Due";
	}
	return schedule.isMandatory ? "Overdue" : "Due";
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
): RoutineStatus {
	if (isPaused) {
		return "Paused";
	}

	if (taskType.kind === "OneOff") {
		return computeOneOffStatus(taskType, latestCompletion, now);
	}

	return taskType.schedule.type === "FixedCalendar"
		? computeFixedCalendarStatus(taskType.schedule, latestCompletion, now)
		: computeRollingIntervalStatus(taskType.schedule, latestCompletion, now);
}
