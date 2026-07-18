import type { RoutineView } from "@LE-REMINDER/core/application/routine-view";
import type { CompletionEvent } from "@LE-REMINDER/core/domain/completion-event";
import { computeRoutineStatus } from "@LE-REMINDER/core/domain/compute-routine-status";
import type {
	CompletionEventId,
	RoutineId,
} from "@LE-REMINDER/core/domain/identity";

// Pure cache transforms for optimistic updates on the routine.list query.
// Each mirrors what the server will eventually compute — using the real
// computeRoutineStatus (not a client-side guess), so there's no risk of
// the optimistic state disagreeing with what the refetch confirms.
function stubCompletion(
	routineId: RoutineId,
	completedAt: Date,
): CompletionEvent {
	return {
		id: "optimistic" as CompletionEventId,
		routineId,
		completedAt,
	};
}

export function withCompleted(
	views: readonly RoutineView[],
	routineId: RoutineId,
	now: Date,
): RoutineView[] {
	return views.map((view) => {
		if (view.routine.id !== routineId) return view;
		return {
			...view,
			status: computeRoutineStatus(
				view.routine.taskType,
				view.routine.isPaused,
				stubCompletion(routineId, now),
				now,
				view.routine.createdAt,
			),
			lastCompletedAt: now,
		};
	});
}

export function withPaused(
	views: readonly RoutineView[],
	routineId: RoutineId,
	isPaused: boolean,
	now: Date,
): RoutineView[] {
	return views.map((view) => {
		if (view.routine.id !== routineId) return view;
		const routine = { ...view.routine, isPaused };
		const latestCompletion = view.lastCompletedAt
			? stubCompletion(routineId, view.lastCompletedAt)
			: null;
		return {
			...view,
			routine,
			status: computeRoutineStatus(
				routine.taskType,
				isPaused,
				latestCompletion,
				now,
				routine.createdAt,
			),
		};
	});
}

export function withRemoved(
	views: readonly RoutineView[],
	routineId: RoutineId,
): RoutineView[] {
	return views.filter((view) => view.routine.id !== routineId);
}
