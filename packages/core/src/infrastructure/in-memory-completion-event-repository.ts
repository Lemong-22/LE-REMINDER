import type { CompletionEvent } from "../domain/completion-event";
import type { CompletionEventRepository } from "../domain/completion-event-repository";
import type { RoutineId } from "../domain/identity";

// Deep-clones on every append/find — same isolation rationale as
// InMemoryRoutineRepository.
export class InMemoryCompletionEventRepository
	implements CompletionEventRepository
{
	private readonly events: CompletionEvent[] = [];

	async append(event: CompletionEvent): Promise<void> {
		this.events.push(structuredClone(event));
	}

	async findLatestByRoutineId(
		routineId: RoutineId,
	): Promise<CompletionEvent | null> {
		const matches = this.events.filter(
			(event) => event.routineId === routineId,
		);
		if (matches.length === 0) {
			return null;
		}

		// "Latest" means most recent completedAt, not most recently appended —
		// CompleteRoutineCommand.completedAt can be backdated.
		const latest = matches.reduce((a, b) =>
			a.completedAt.getTime() >= b.completedAt.getTime() ? a : b,
		);
		return structuredClone(latest);
	}

	async findAllByRoutineId(routineId: RoutineId): Promise<CompletionEvent[]> {
		return this.events
			.filter((event) => event.routineId === routineId)
			.map((event) => structuredClone(event));
	}
}
