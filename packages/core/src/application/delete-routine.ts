import type { RoutineId } from "../domain/identity";
import type { RoutineRepository } from "../domain/routine-repository";

export interface DeleteRoutineCommand {
	readonly routineId: RoutineId;
}

export interface DeleteRoutineUseCase {
	execute(command: DeleteRoutineCommand): Promise<void>;
}

export class DeleteRoutine implements DeleteRoutineUseCase {
	constructor(private readonly routineRepository: RoutineRepository) {}

	async execute(command: DeleteRoutineCommand): Promise<void> {
		await this.routineRepository.delete(command.routineId);
	}
}
