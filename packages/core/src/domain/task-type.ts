import type { Schedule } from "./schedule";

export interface RecurringTask {
	readonly kind: "Recurring";
	readonly schedule: Schedule;
}

export interface OneOffTask {
	readonly kind: "OneOff";
	readonly dueDate: Date | null;
}

export type TaskType = RecurringTask | OneOffTask;
