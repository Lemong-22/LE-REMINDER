import type { CompletionEventId, RoutineId } from "./identity";

export interface CompletionEvent {
	readonly id: CompletionEventId;
	readonly routineId: RoutineId;
	readonly completedAt: Date;
}
