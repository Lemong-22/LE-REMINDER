import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function describeTaskType(
	taskType: TaskType,
	status?: RoutineStatus,
): string {
	if (taskType.kind === "OneOff") {
		if (!taskType.dueDate) return "One-off";
		const verb = status === "Finished" ? "was due" : "due";
		return `One-off · ${verb} ${formatDate(taskType.dueDate)}`;
	}

	const schedule = taskType.schedule;
	if (schedule.type === "RollingInterval") {
		const { value, unit } = schedule.interval;
		return `Every ${value} ${unit}`;
	}

	const pattern = schedule.recurrence;
	const label =
		pattern.kind === "Daily"
			? "Daily"
			: pattern.kind === "Weekly"
				? `Weekly · ${pattern.daysOfWeek.join(", ")}`
				: `Monthly · day ${pattern.dayOfMonth}`;

	return schedule.isMandatory ? `${label} · mandatory` : label;
}
