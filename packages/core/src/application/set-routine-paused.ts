import type { RoutineId } from "../domain/identity";
import type { Routine } from "../domain/routine";

export interface SetRoutinePausedCommand {
	readonly routineId: RoutineId;
	readonly isPaused: boolean;
}

export interface SetRoutinePausedUseCase {
	execute(command: SetRoutinePausedCommand): Promise<Routine>;
}
