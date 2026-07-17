import type { RoutineId } from "../domain/identity";
import type { Routine } from "../domain/routine";
import type { RoutineRepository } from "../domain/routine-repository";

// Deep-clones on every save/find so callers can never mutate the stored
// state through a shared reference — the same isolation a real DB
// round-trip (JSON/row serialization) would give you for free.
export class InMemoryRoutineRepository implements RoutineRepository {
	private readonly routines = new Map<RoutineId, Routine>();

	async save(routine: Routine): Promise<void> {
		this.routines.set(routine.id, structuredClone(routine));
	}

	async findById(id: RoutineId): Promise<Routine | null> {
		const routine = this.routines.get(id);
		return routine === undefined ? null : structuredClone(routine);
	}

	async findAll(): Promise<Routine[]> {
		return [...this.routines.values()].map((routine) =>
			structuredClone(routine),
		);
	}

	async delete(id: RoutineId): Promise<void> {
		this.routines.delete(id);
	}
}
