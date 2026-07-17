import type { CompletionEvent } from "../domain/completion-event";
import type { RoutineId } from "../domain/identity";

export interface CompleteRoutineCommand {
	readonly routineId: RoutineId;
	// Optional and defaults to Clock.now() — present only to allow logging a
	// completion for an earlier moment (e.g. "I did this yesterday, forgot to
	// check it off").
	readonly completedAt?: Date;
}

export interface CompleteRoutineUseCase {
	execute(command: CompleteRoutineCommand): Promise<CompletionEvent>;
}
