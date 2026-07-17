import type { Schedule } from "@LE-REMINDER/core/domain/schedule";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";

// JSON has no Date type — Date.prototype.toJSON already serializes to an ISO
// string on the way in, but reading back gives a plain string, so dueDate
// must be reconstructed into a real Date on the way out. Schedule itself
// (Duration, RecurrencePattern, etc.) has no Date fields, so it round-trips
// through JSON as-is.
interface SerializedOneOffConfig {
	dueDate: string | null;
}

interface SerializedRecurringConfig {
	schedule: Schedule;
}

export function serializeTaskType(taskType: TaskType): {
	taskType: "OneOff" | "Recurring";
	scheduleConfig: SerializedOneOffConfig | SerializedRecurringConfig;
} {
	if (taskType.kind === "OneOff") {
		return {
			taskType: "OneOff",
			scheduleConfig: {
				dueDate: taskType.dueDate ? taskType.dueDate.toISOString() : null,
			},
		};
	}
	return {
		taskType: "Recurring",
		scheduleConfig: { schedule: taskType.schedule },
	};
}

export function deserializeTaskType(
	taskType: string,
	scheduleConfig: unknown,
): TaskType {
	if (taskType === "OneOff") {
		const config = scheduleConfig as SerializedOneOffConfig;
		return {
			kind: "OneOff",
			dueDate: config.dueDate ? new Date(config.dueDate) : null,
		};
	}
	if (taskType === "Recurring") {
		const config = scheduleConfig as SerializedRecurringConfig;
		return { kind: "Recurring", schedule: config.schedule };
	}
	throw new Error(`Unknown task_type discriminant: "${taskType}"`);
}
