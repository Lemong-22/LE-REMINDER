import type { Category } from "./category";
import type { RoutineId } from "./identity";
import type { TaskType } from "./task-type";

export interface Routine {
	readonly id: RoutineId;
	name: string;
	taskType: TaskType;
	category: Category | null;
	isPaused: boolean;
	readonly createdAt: Date;
}
