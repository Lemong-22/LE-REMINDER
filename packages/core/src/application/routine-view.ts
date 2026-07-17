import type { Routine } from "../domain/routine";
import type { RoutineStatus } from "../domain/routine-status";

// The read-model DTO combining a Routine with its computed status —
// also the shape an external reader (HERMES-AGENT) would eventually read.
export interface RoutineView {
	readonly routine: Routine;
	readonly status: RoutineStatus;
	readonly lastCompletedAt: Date | null;
}
