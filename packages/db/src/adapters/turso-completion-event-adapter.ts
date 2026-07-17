import type { CompletionEvent } from "@LE-REMINDER/core/domain/completion-event";
import type { CompletionEventRepository } from "@LE-REMINDER/core/domain/completion-event-repository";
import type {
	CompletionEventId,
	RoutineId,
} from "@LE-REMINDER/core/domain/identity";
import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "../schema";
import { completionEvents } from "../schema/routine";

type CompletionEventRow = typeof completionEvents.$inferSelect;

export class TursoCompletionEventAdapter implements CompletionEventRepository {
	constructor(private readonly db: LibSQLDatabase<typeof schema>) {}

	async append(event: CompletionEvent): Promise<void> {
		await this.db.insert(completionEvents).values({
			id: event.id,
			routineId: event.routineId,
			completedAt: event.completedAt,
		});
	}

	async findLatestByRoutineId(
		routineId: RoutineId,
	): Promise<CompletionEvent | null> {
		const rows = await this.db
			.select()
			.from(completionEvents)
			.where(eq(completionEvents.routineId, routineId))
			.orderBy(desc(completionEvents.completedAt))
			.limit(1);
		const row = rows[0];
		return row ? toDomain(row) : null;
	}

	async findAllByRoutineId(routineId: RoutineId): Promise<CompletionEvent[]> {
		const rows = await this.db
			.select()
			.from(completionEvents)
			.where(eq(completionEvents.routineId, routineId));
		return rows.map(toDomain);
	}
}

function toDomain(row: CompletionEventRow): CompletionEvent {
	return {
		id: row.id as CompletionEventId,
		routineId: row.routineId as RoutineId,
		completedAt: row.completedAt,
	};
}
