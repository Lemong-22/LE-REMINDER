import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

// Overdue is always forced to the top; everything else keeps its incoming
// (e.g. name/creation) order.
const STATUS_RANK: Record<RoutineStatus, number> = {
	Overdue: 0,
	Due: 1,
	Done: 2,
	Paused: 3,
	Finished: 4,
};

export function sortByStatus<T extends { status: RoutineStatus }>(
	routines: readonly T[],
): T[] {
	return [...routines].sort(
		(a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
	);
}
