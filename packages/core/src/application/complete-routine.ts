import type { Clock } from "../domain/clock";
import type { CompletionEvent } from "../domain/completion-event";
import type { CompletionEventRepository } from "../domain/completion-event-repository";
import { computeRoutineStatus } from "../domain/compute-routine-status";
import type { IdGenerator } from "../domain/id-generator";
import type { RoutineId } from "../domain/identity";
import type { RoutineRepository } from "../domain/routine-repository";
import { RoutineAlreadyFinishedError, RoutineNotFoundError } from "./errors";

export interface CompleteRoutineCommand {
	readonly routineId: RoutineId;
	// Optional and defaults to Clock.now() — present only to allow logging a
	// completion for an earlier moment (e.g. "I did this yesterday, forgot to
	// check it off").
	readonly completedAt?: Date;
}

export interface CompleteRoutineUseCase {
	execute(command: CompleteRoutineCommand): Promise<CompletionEvent>;
}

export class CompleteRoutine implements CompleteRoutineUseCase {
	constructor(
		private readonly routineRepository: RoutineRepository,
		private readonly completionEventRepository: CompletionEventRepository,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
	) {}

	async execute(command: CompleteRoutineCommand): Promise<CompletionEvent> {
		const routine = await this.routineRepository.findById(command.routineId);
		if (routine === null) {
			throw new RoutineNotFoundError(command.routineId);
		}

		const now = this.clock.now();
		const latestCompletion =
			await this.completionEventRepository.findLatestByRoutineId(routine.id);

		// A OneOff routine is single-execution by definition (PRD §6) — once its
		// status is already Finished, a further completion must be rejected
		// rather than silently logged, or "single execution" stops being true.
		const currentStatus = computeRoutineStatus(
			routine.taskType,
			routine.isPaused,
			latestCompletion,
			now,
			routine.createdAt,
		);
		if (currentStatus === "Finished") {
			throw new RoutineAlreadyFinishedError(routine.id);
		}

		const event: CompletionEvent = {
			id: this.idGenerator.newCompletionEventId(),
			routineId: routine.id,
			completedAt: command.completedAt ?? now,
		};

		await this.completionEventRepository.append(event);

		return event;
	}
}
