import type { RoutineId } from "../domain/identity";

export class RoutineNotFoundError extends Error {
	constructor(routineId: RoutineId) {
		super(`Routine not found: ${routineId}`);
		this.name = "RoutineNotFoundError";
	}
}

export class RoutineAlreadyFinishedError extends Error {
	constructor(routineId: RoutineId) {
		super(
			`Routine is already Finished and cannot be completed again: ${routineId}`,
		);
		this.name = "RoutineAlreadyFinishedError";
	}
}
