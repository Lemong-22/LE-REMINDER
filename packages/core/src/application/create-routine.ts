import type { Category } from "../domain/category";
import type { Clock } from "../domain/clock";
import type { IdGenerator } from "../domain/id-generator";
import type { Routine } from "../domain/routine";
import type { RoutineRepository } from "../domain/routine-repository";
import type { TaskType } from "../domain/task-type";

export interface CreateRoutineCommand {
	readonly name: string;
	readonly taskType: TaskType;
	readonly category?: Category;
	readonly isTask?: boolean;
	readonly isImportant?: boolean;
}

export interface CreateRoutineUseCase {
	execute(command: CreateRoutineCommand): Promise<Routine>;
}

export class CreateRoutine implements CreateRoutineUseCase {
	constructor(
		private readonly routineRepository: RoutineRepository,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
	) {}

	async execute(command: CreateRoutineCommand): Promise<Routine> {
		const routine: Routine = {
			id: this.idGenerator.newRoutineId(),
			name: command.name,
			taskType: command.taskType,
			category: command.category ?? null,
			isPaused: false,
			isTask: command.isTask ?? false,
			isImportant: command.isImportant ?? false,
			createdAt: this.clock.now(),
		};

		await this.routineRepository.save(routine);

		return routine;
	}
}
