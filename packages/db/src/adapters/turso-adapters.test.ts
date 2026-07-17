import { CompleteRoutine } from "@LE-REMINDER/core/application/complete-routine";
import { CreateRoutine } from "@LE-REMINDER/core/application/create-routine";
import { EditRoutine } from "@LE-REMINDER/core/application/edit-routine";
import {
	RoutineAlreadyFinishedError,
	RoutineNotFoundError,
} from "@LE-REMINDER/core/application/errors";
import { GetRoutine } from "@LE-REMINDER/core/application/get-routine";
import { ListRoutines } from "@LE-REMINDER/core/application/list-routines";
import { SetRoutinePaused } from "@LE-REMINDER/core/application/set-routine-paused";
import type { RoutineId } from "@LE-REMINDER/core/domain/identity";
import { CryptoIdGenerator } from "@LE-REMINDER/core/infrastructure/crypto-id-generator";
import { FixedClock } from "@LE-REMINDER/core/infrastructure/fixed-clock";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { unlink } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../schema";
import { TursoCompletionEventAdapter } from "./turso-completion-event-adapter";
import { TursoRoutineAdapter } from "./turso-routine-adapter";

// Step 11 validation: the exact same use-case scenarios from Step 10, this
// time injecting TursoRoutineAdapter/TursoCompletionEventAdapter (real
// SQLite via a local file) instead of the InMemory mocks — proving the port
// abstraction holds without changing a single line of use-case logic.

const DB_FILE = `${import.meta.dir}/local-test.db`;

let db: LibSQLDatabase<typeof schema>;

beforeAll(async () => {
	await unlink(DB_FILE).catch(() => {});
	await unlink(`${DB_FILE}-wal`).catch(() => {});
	await unlink(`${DB_FILE}-shm`).catch(() => {});
	const client = createClient({ url: `file:${DB_FILE}` });
	db = drizzle({ client, schema });
	await migrate(db, { migrationsFolder: `${import.meta.dir}/../migrations` });
});

afterAll(async () => {
	await unlink(DB_FILE).catch(() => {});
	await unlink(`${DB_FILE}-wal`).catch(() => {});
	await unlink(`${DB_FILE}-shm`).catch(() => {});
});

beforeEach(async () => {
	// Fresh rows per test, same schema/connection — keeps each test isolated
	// without paying migration cost per test.
	await db.delete(schema.completionEvents);
	await db.delete(schema.routines);
});

function setup(now = new Date(2026, 6, 17, 12, 0, 0)) {
	const routineRepository = new TursoRoutineAdapter(db);
	const completionEventRepository = new TursoCompletionEventAdapter(db);
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(now);

	return {
		routineRepository,
		completionEventRepository,
		createRoutine: new CreateRoutine(routineRepository, idGenerator, clock),
		editRoutine: new EditRoutine(routineRepository),
		completeRoutine: new CompleteRoutine(
			routineRepository,
			completionEventRepository,
			idGenerator,
			clock,
		),
		setRoutinePaused: new SetRoutinePaused(routineRepository),
		listRoutines: new ListRoutines(
			routineRepository,
			completionEventRepository,
			clock,
		),
		getRoutine: new GetRoutine(
			routineRepository,
			completionEventRepository,
			clock,
		),
	};
}

describe("CreateRoutine against TursoRoutineAdapter", () => {
	test("creates and persists a routine, retrievable via a fresh query", async () => {
		const { createRoutine, routineRepository } = setup();
		const routine = await createRoutine.execute({
			name: "Take vitamins",
			taskType: {
				kind: "Recurring",
				schedule: {
					type: "FixedCalendar",
					recurrence: { kind: "Daily" },
					isMandatory: true,
				},
			},
			category: "Health",
		});

		const stored = await routineRepository.findById(routine.id);
		expect(stored).toEqual(routine);
	});

	test("round-trips a OneOff's dueDate through the JSON schedule_config column", async () => {
		const { createRoutine, routineRepository } = setup();
		const dueDate = new Date(2026, 7, 1);
		const routine = await createRoutine.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate },
		});

		const stored = await routineRepository.findById(routine.id);
		expect(stored?.taskType).toEqual({ kind: "OneOff", dueDate });
	});

	test("round-trips a RollingInterval schedule through JSON", async () => {
		const { createRoutine, routineRepository } = setup();
		const routine = await createRoutine.execute({
			name: "Repaste laptop",
			taskType: {
				kind: "Recurring",
				schedule: {
					type: "RollingInterval",
					interval: { value: 6, unit: "months" },
				},
			},
		});

		const stored = await routineRepository.findById(routine.id);
		expect(stored?.taskType).toEqual(routine.taskType);
	});
});

describe("EditRoutine against TursoRoutineAdapter", () => {
	test("partial edit persists only the given fields", async () => {
		const { createRoutine, editRoutine, routineRepository } = setup();
		const routine = await createRoutine.execute({
			name: "Take vitamins",
			taskType: { kind: "OneOff", dueDate: null },
			category: "Health",
		});

		await editRoutine.execute({ routineId: routine.id, category: "Wellness" });

		const stored = await routineRepository.findById(routine.id);
		expect(stored?.category).toBe("Wellness");
		expect(stored?.name).toBe("Take vitamins");
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { editRoutine } = setup();
		await expect(
			editRoutine.execute({
				routineId: "does-not-exist" as RoutineId,
				name: "X",
			}),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});

describe("DeleteRoutine / SetRoutinePaused against TursoRoutineAdapter", () => {
	test("delete removes the row entirely", async () => {
		const { createRoutine, routineRepository } = setup();
		const routine = await createRoutine.execute({
			name: "X",
			taskType: { kind: "OneOff", dueDate: null },
		});
		await routineRepository.delete(routine.id);
		expect(await routineRepository.findById(routine.id)).toBeNull();
	});

	test("pause/resume persists isPaused", async () => {
		const { createRoutine, setRoutinePaused, routineRepository } = setup();
		const routine = await createRoutine.execute({
			name: "X",
			taskType: { kind: "OneOff", dueDate: null },
		});

		await setRoutinePaused.execute({ routineId: routine.id, isPaused: true });
		expect((await routineRepository.findById(routine.id))?.isPaused).toBe(true);

		await setRoutinePaused.execute({ routineId: routine.id, isPaused: false });
		expect((await routineRepository.findById(routine.id))?.isPaused).toBe(
			false,
		);
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { setRoutinePaused } = setup();
		await expect(
			setRoutinePaused.execute({
				routineId: "does-not-exist" as RoutineId,
				isPaused: true,
			}),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});

describe("CompleteRoutine against Turso adapters — crucial case", () => {
	test("appends a real row via CompletionEventRepository", async () => {
		const now = new Date(2026, 6, 17, 12, 0, 0);
		const { createRoutine, completeRoutine, completionEventRepository } =
			setup(now);
		const routine = await createRoutine.execute({
			name: "Take vitamins",
			taskType: {
				kind: "Recurring",
				schedule: {
					type: "FixedCalendar",
					recurrence: { kind: "Daily" },
					isMandatory: true,
				},
			},
		});

		const event = await completeRoutine.execute({ routineId: routine.id });

		const latest = await completionEventRepository.findLatestByRoutineId(
			routine.id,
		);
		expect(latest).toEqual(event);
	});

	test("throws RoutineAlreadyFinishedError when completing an already-Finished OneOff", async () => {
		const { createRoutine, completeRoutine } = setup();
		const routine = await createRoutine.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate: null },
		});

		await completeRoutine.execute({ routineId: routine.id });

		await expect(
			completeRoutine.execute({ routineId: routine.id }),
		).rejects.toBeInstanceOf(RoutineAlreadyFinishedError);
	});

	test("does not append a second row when rejecting re-completion", async () => {
		const { createRoutine, completeRoutine, completionEventRepository } =
			setup();
		const routine = await createRoutine.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate: null },
		});

		await completeRoutine.execute({ routineId: routine.id });
		await expect(
			completeRoutine.execute({ routineId: routine.id }),
		).rejects.toBeInstanceOf(RoutineAlreadyFinishedError);

		expect(
			await completionEventRepository.findAllByRoutineId(routine.id),
		).toHaveLength(1);
	});
});

describe("ListRoutines / GetRoutine against Turso adapters", () => {
	test("ListRoutines returns correct computed status from real rows, filtered by category", async () => {
		const { createRoutine, listRoutines } = setup();
		await createRoutine.execute({
			name: "Take vitamins",
			taskType: { kind: "OneOff", dueDate: null },
			category: "Health",
		});
		await createRoutine.execute({
			name: "Repaste laptop",
			taskType: {
				kind: "Recurring",
				schedule: {
					type: "RollingInterval",
					interval: { value: 6, unit: "months" },
				},
			},
			category: "Tech",
		});

		expect(await listRoutines.execute({})).toHaveLength(2);
		const healthOnly = await listRoutines.execute({ category: "Health" });
		expect(healthOnly).toHaveLength(1);
		expect(healthOnly[0]?.status).toBe("Due");
	});

	test("GetRoutine throws RoutineNotFoundError for a missing routine", async () => {
		const { getRoutine } = setup();
		await expect(
			getRoutine.execute({ routineId: "does-not-exist" as RoutineId }),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});
