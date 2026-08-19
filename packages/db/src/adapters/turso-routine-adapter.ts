import type { RoutineId } from "@LE-REMINDER/core/domain/identity";
import type { Routine } from "@LE-REMINDER/core/domain/routine";
import type { RoutineRepository } from "@LE-REMINDER/core/domain/routine-repository";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "../schema";
import { completionEvents, routines } from "../schema/routine";
import {
	deserializeTaskType,
	serializeTaskType,
} from "./task-type-serialization";

type RoutineRow = typeof routines.$inferSelect;

export class TursoRoutineAdapter implements RoutineRepository {
	constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

	async save(routine: Routine): Promise<void> {
		const { taskType, scheduleConfig } = serializeTaskType(routine.taskType);
		await this.db
			.insert(routines)
			.values({
				id: routine.id,
				name: routine.name,
				taskType,
				scheduleConfig,
				category: routine.category,
				isPaused: routine.isPaused,
				isTask: routine.isTask,
				isImportant: routine.isImportant,
				createdAt: routine.createdAt,
			})
			.onConflictDoUpdate({
				target: routines.id,
				set: {
					name: routine.name,
					taskType,
					scheduleConfig,
					category: routine.category,
					isPaused: routine.isPaused,
					isTask: routine.isTask,
					isImportant: routine.isImportant,
				},
			});
	}

	async findById(id: RoutineId): Promise<Routine | null> {
		const rows = await this.db
			.select()
			.from(routines)
			.where(eq(routines.id, id));
		const row = rows[0];
		return row ? toDomain(row) : null;
	}

	async findAll(): Promise<Routine[]> {
		const rows = await this.db.select().from(routines);
		return rows.map(toDomain);
	}

	async delete(id: RoutineId): Promise<void> {
		// completion_events.routine_id has no ON DELETE CASCADE (see schema/
		// routine.ts) — clear the routine's history first, in the same
		// transaction, so deleting a completed routine doesn't 500 on the FK.
		await this.db.transaction(async (tx) => {
			await tx
				.delete(completionEvents)
				.where(eq(completionEvents.routineId, id));
			await tx.delete(routines).where(eq(routines.id, id));
		});
	}
}

function toDomain(row: RoutineRow): Routine {
	return {
		id: row.id as RoutineId,
		name: row.name,
		taskType: deserializeTaskType(row.taskType, row.scheduleConfig),
		category: row.category,
		isPaused: row.isPaused,
		isTask: row.isTask,
		isImportant: row.isImportant,
		createdAt: row.createdAt,
	};
}
