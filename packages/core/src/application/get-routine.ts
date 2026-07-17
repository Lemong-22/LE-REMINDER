import type { RoutineId } from "../domain/identity";
import type { RoutineView } from "./routine-view";

export interface GetRoutineQuery {
	readonly routineId: RoutineId;
}

export interface GetRoutineUseCase {
	execute(query: GetRoutineQuery): Promise<RoutineView>;
}
