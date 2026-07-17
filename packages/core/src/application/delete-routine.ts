import type { RoutineId } from "../domain/identity";

export interface DeleteRoutineCommand {
	readonly routineId: RoutineId;
}

export interface DeleteRoutineUseCase {
	execute(command: DeleteRoutineCommand): Promise<void>;
}
