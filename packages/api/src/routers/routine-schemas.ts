import { z } from "zod";

// Mirrors SPEC.md §2.2-2.3 exactly. This is the one place the polymorphic
// TaskType/Schedule shape gets *runtime* validation — the domain types
// themselves are compile-time only.
const dayOfWeekSchema = z.enum([
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun",
]);

const durationSchema = z.object({
	value: z.number().int().positive(),
	unit: z.enum(["days", "weeks", "months"]),
});

const recurrencePatternSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("Daily") }),
	z.object({
		kind: z.literal("Weekly"),
		daysOfWeek: z.array(dayOfWeekSchema).min(1),
	}),
	z.object({
		kind: z.literal("Monthly"),
		dayOfMonth: z.number().int().min(1).max(31),
	}),
]);

const scheduleSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("FixedCalendar"),
		recurrence: recurrencePatternSchema,
		isMandatory: z.boolean(),
	}),
	z.object({
		type: z.literal("RollingInterval"),
		interval: durationSchema,
	}),
]);

const taskTypeSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("Recurring"), schedule: scheduleSchema }),
	z.object({ kind: z.literal("OneOff"), dueDate: z.coerce.date().nullable() }),
]);

const routineIdSchema = z.string().min(1);

export const createRoutineInputSchema = z.object({
	name: z.string().min(1),
	taskType: taskTypeSchema,
	category: z.string().min(1).optional(),
});

export const editRoutineInputSchema = z.object({
	routineId: routineIdSchema,
	name: z.string().min(1).optional(),
	taskType: taskTypeSchema.optional(),
	category: z.string().min(1).optional(),
});

export const deleteRoutineInputSchema = z.object({
	routineId: routineIdSchema,
});

export const setRoutinePausedInputSchema = z.object({
	routineId: routineIdSchema,
	isPaused: z.boolean(),
});

export const completeRoutineInputSchema = z.object({
	routineId: routineIdSchema,
	completedAt: z.coerce.date().optional(),
});

export const listRoutinesInputSchema = z.object({
	category: z.string().min(1).optional(),
});

export const getRoutineInputSchema = z.object({
	routineId: routineIdSchema,
});
