import type { RoutineView } from "@LE-REMINDER/core/application/routine-view";
import type { DashboardRoutine } from "./dashboard-routine";

export function toDashboardRoutine(view: RoutineView): DashboardRoutine {
	return {
		id: view.routine.id,
		name: view.routine.name,
		category: view.routine.category ?? "General",
		status: view.status,
		taskType: view.routine.taskType,
		lastCompletedAt: view.lastCompletedAt,
	};
}
