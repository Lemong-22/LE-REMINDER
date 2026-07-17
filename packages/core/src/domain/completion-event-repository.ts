import type { CompletionEvent } from "./completion-event";
import type { RoutineId } from "./identity";

export interface CompletionEventRepository {
	append(event: CompletionEvent): Promise<void>;
	findLatestByRoutineId(routineId: RoutineId): Promise<CompletionEvent | null>;
	// Reserved for future analytics; unused by any Phase 0 use case.
	findAllByRoutineId(routineId: RoutineId): Promise<CompletionEvent[]>;
}
