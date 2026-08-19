import type { Category } from "../domain/category";
import type { Clock } from "../domain/clock";
import type { CompletionEventRepository } from "../domain/completion-event-repository";
import { computeRoutineStatus } from "../domain/compute-routine-status";
import type { RoutineRepository } from "../domain/routine-repository";
import type { RoutineView } from "./routine-view";

export interface ListRoutinesQuery {
	readonly category?: Category;
	readonly searchQuery?: string;
}

export interface ListRoutinesUseCase {
	execute(query: ListRoutinesQuery): Promise<RoutineView[]>;
}

export class ListRoutines implements ListRoutinesUseCase {
	constructor(
		private readonly routineRepository: RoutineRepository,
		private readonly completionEventRepository: CompletionEventRepository,
		private readonly clock: Clock,
	) {}

	async execute(query: ListRoutinesQuery): Promise<RoutineView[]> {
		let routines = await this.routineRepository.findAll();

		if (query.category !== undefined) {
			routines = routines.filter(
				(routine) => routine.category === query.category,
			);
		}

		if (query.searchQuery !== undefined && query.searchQuery.trim() !== "") {
			const searchNormalized = query.searchQuery.toLowerCase().trim();
			routines = routines.filter((routine) =>
				routine.name.toLowerCase().includes(searchNormalized),
			);
		}

		const now = this.clock.now();

		return Promise.all(
			routines.map(async (routine): Promise<RoutineView> => {
				const latestCompletion =
					await this.completionEventRepository.findLatestByRoutineId(
						routine.id,
					);

				return {
					routine,
					status: computeRoutineStatus(
						routine.taskType,
						routine.isPaused,
						latestCompletion,
						now,
						routine.createdAt,
					),
					lastCompletedAt: latestCompletion?.completedAt ?? null,
				};
			}),
		);
	}
}
