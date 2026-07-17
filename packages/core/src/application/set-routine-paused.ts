import type { RoutineId } from "../domain/identity";
import type { Routine } from "../domain/routine";
import type { RoutineRepository } from "../domain/routine-repository";
import { RoutineNotFoundError } from "./errors";

export interface SetRoutinePausedCommand {
	readonly routineId: RoutineId;
	readonly isPaused: boolean;
}

export interface SetRoutinePausedUseCase {
	execute(command: SetRoutinePausedCommand): Promise<Routine>;
}

export class SetRoutinePaused implements SetRoutinePausedUseCase {
	constructor(private readonly routineRepository: RoutineRepository) {}

	async execute(command: SetRoutinePausedCommand): Promise<Routine> {
		const existing = await this.routineRepository.findById(command.routineId);
		if (existing === null) {
			throw new RoutineNotFoundError(command.routineId);
		}

		const updated: Routine = { ...existing, isPaused: command.isPaused };

		await this.routineRepository.save(updated);

		return updated;
	}
}
