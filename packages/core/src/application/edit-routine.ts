import type { Category } from "../domain/category";
import type { RoutineId } from "../domain/identity";
import type { Routine } from "../domain/routine";
import type { TaskType } from "../domain/task-type";

export interface EditRoutineCommand {
	readonly routineId: RoutineId;
	readonly name?: string;
	readonly taskType?: TaskType;
	readonly category?: Category;
}

export interface EditRoutineUseCase {
	execute(command: EditRoutineCommand): Promise<Routine>;
}
