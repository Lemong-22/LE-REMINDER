import type { RoutineId } from "./identity";
import type { Routine } from "./routine";

export interface RoutineRepository {
	save(routine: Routine): Promise<void>;
	findById(id: RoutineId): Promise<Routine | null>;
	findAll(): Promise<Routine[]>;
	delete(id: RoutineId): Promise<void>;
}
