import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";
import { isStrictlyDueToday } from "./is-due-today";

// Overdue and Due demand immediate attention at the top.
// Paused stays in the middle.
// Completed tasks (Done, Finished) are demoted to the very bottom.
const STATUS_RANK: Record<RoutineStatus, number> = {
	Overdue: 0,
	Due: 1,
	Paused: 2,
	Done: 3,
	Finished: 4,
};

export function sortByStatus<
	T extends {
		status: RoutineStatus;
		isImportant?: boolean;
		taskType?: TaskType;
	},
>(routines: readonly T[], now: Date = new Date()): T[] {
	return [...routines].sort((a, b) => {
		const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
		if (rankDiff !== 0) return rankDiff;

		// Within Due routines, prioritize those strictly due TODAY over future-scheduled weekly/monthly tasks
		if (a.status === "Due" && a.taskType && b.taskType) {
			const aDueToday = isStrictlyDueToday(a.taskType, a.status, now);
			const bDueToday = isStrictlyDueToday(b.taskType, b.status, now);
			if (aDueToday !== bDueToday) {
				return aDueToday ? -1 : 1;
			}
		}

		if (a.isImportant !== b.isImportant) {
			return a.isImportant ? -1 : 1;
		}

		return 0;
	});
}
