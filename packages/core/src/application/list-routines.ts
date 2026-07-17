import type { Category } from "../domain/category";
import type { RoutineView } from "./routine-view";

export interface ListRoutinesQuery {
	readonly category?: Category;
}

export interface ListRoutinesUseCase {
	execute(query: ListRoutinesQuery): Promise<RoutineView[]>;
}
