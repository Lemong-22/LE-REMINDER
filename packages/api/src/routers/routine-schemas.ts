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
	// Upper-bounded so a malicious/malformed interval (e.g. Number.MAX_SAFE_INTEGER
	// days) can't overflow the Date arithmetic in computeRoutineStatus. 3650
	// (10 years) is far beyond any legitimate routine interval.
	value: z.number().int().positive().max(3650),
	unit: z.enum(["days", "weeks", "months"]),
});

const recurrencePatternSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("Daily") }),
	z.object({
		kind: z.literal("Weekly"),
		// .readonly() so the inferred TS type matches RecurrencePattern's
		// `readonly DayOfWeek[]` exactly — callers holding a domain TaskType
		// value can pass it straight through without an array-variance error.
		// .max(7): there are only 7 distinct weekdays, so anything beyond
		// that is a payload-size attack, not a legitimate schedule.
		daysOfWeek: z.array(dayOfWeekSchema).min(1).max(7).readonly(),
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

// Real ids are ~36-char UUIDs (CryptoIdGenerator) — 100 is a generous cap
// that still rejects a payload-size attack disguised as a lookup key.
const routineIdSchema = z.string().min(1).max(100);

export const createRoutineInputSchema = z.object({
	name: z.string().min(1).max(255),
	taskType: taskTypeSchema,
	category: z.string().min(1).max(100).optional(),
});

export const editRoutineInputSchema = z.object({
	routineId: routineIdSchema,
	name: z.string().min(1).max(255).optional(),
	taskType: taskTypeSchema.optional(),
	category: z.string().min(1).max(100).optional(),
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
	category: z.string().min(1).max(100).optional(),
});

export const getRoutineInputSchema = z.object({
	routineId: routineIdSchema,
});
