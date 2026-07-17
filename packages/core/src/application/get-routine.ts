import type { Clock } from "../domain/clock";
import type { CompletionEventRepository } from "../domain/completion-event-repository";
import { computeRoutineStatus } from "../domain/compute-routine-status";
import type { RoutineId } from "../domain/identity";
import type { RoutineRepository } from "../domain/routine-repository";
import { RoutineNotFoundError } from "./errors";
import type { RoutineView } from "./routine-view";

export interface GetRoutineQuery {
	readonly routineId: RoutineId;
}

export interface GetRoutineUseCase {
	execute(query: GetRoutineQuery): Promise<RoutineView>;
}

export class GetRoutine implements GetRoutineUseCase {
	constructor(
		private readonly routineRepository: RoutineRepository,
		private readonly completionEventRepository: CompletionEventRepository,
		private readonly clock: Clock,
	) {}

	async execute(query: GetRoutineQuery): Promise<RoutineView> {
		const routine = await this.routineRepository.findById(query.routineId);
		if (routine === null) {
			throw new RoutineNotFoundError(query.routineId);
		}

		const now = this.clock.now();
		const latestCompletion =
			await this.completionEventRepository.findLatestByRoutineId(routine.id);

		return {
			routine,
			status: computeRoutineStatus(
				routine.taskType,
				routine.isPaused,
				latestCompletion,
				now,
			),
			lastCompletedAt: latestCompletion?.completedAt ?? null,
		};
	}
}
