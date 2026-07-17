import type { Category } from "../domain/category";
import type { RoutineId } from "../domain/identity";
import type { Routine } from "../domain/routine";
import type { RoutineRepository } from "../domain/routine-repository";
import type { TaskType } from "../domain/task-type";
import { RoutineNotFoundError } from "./errors";

export interface EditRoutineCommand {
	readonly routineId: RoutineId;
	readonly name?: string;
	readonly taskType?: TaskType;
	readonly category?: Category;
}

export interface EditRoutineUseCase {
	execute(command: EditRoutineCommand): Promise<Routine>;
}

export class EditRoutine implements EditRoutineUseCase {
	constructor(private readonly routineRepository: RoutineRepository) {}

	async execute(command: EditRoutineCommand): Promise<Routine> {
		const existing = await this.routineRepository.findById(command.routineId);
		if (existing === null) {
			throw new RoutineNotFoundError(command.routineId);
		}

		const updated: Routine = {
			...existing,
			name: command.name ?? existing.name,
			taskType: command.taskType ?? existing.taskType,
			category: command.category ?? existing.category,
		};

		await this.routineRepository.save(updated);

		return updated;
	}
}
