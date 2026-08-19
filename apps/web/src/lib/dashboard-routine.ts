import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";

// The flat shape every presentational component (RoutineCard, HeroPanel,
// RoutineListRow, RoutineFormDialog) is built against — kept separate from
// RoutineView's nested {routine, status, lastCompletedAt} DTO so those
// components don't need to know where the data came from.
export interface DashboardRoutine {
	id: string;
	name: string;
	category: string;
	status: RoutineStatus;
	taskType: TaskType;
	isTask: boolean;
	isImportant: boolean;
	lastCompletedAt: Date | null;
}
