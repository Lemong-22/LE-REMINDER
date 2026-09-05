import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

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
	T extends { status: RoutineStatus; isImportant?: boolean },
>(routines: readonly T[]): T[] {
	return [...routines].sort((a, b) => {
		const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
		if (rankDiff !== 0) return rankDiff;

		if (a.isImportant !== b.isImportant) {
			return a.isImportant ? -1 : 1;
		}

		return 0;
	});
}
