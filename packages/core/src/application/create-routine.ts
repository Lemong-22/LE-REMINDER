import type { Category } from "../domain/category";
import type { Routine } from "../domain/routine";
import type { TaskType } from "../domain/task-type";

export interface CreateRoutineCommand {
	readonly name: string;
	readonly taskType: TaskType;
	readonly category?: Category;
}

export interface CreateRoutineUseCase {
	execute(command: CreateRoutineCommand): Promise<Routine>;
}
