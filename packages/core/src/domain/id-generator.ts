import type { CompletionEventId, RoutineId } from "./identity";

// Generates identities without domain code depending on a concrete
// UUID/nanoid library.
export interface IdGenerator {
	newRoutineId(): RoutineId;
	newCompletionEventId(): CompletionEventId;
}
