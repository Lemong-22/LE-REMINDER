import { describe, expect, test } from "bun:test";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryCompletionEventRepository } from "../infrastructure/in-memory-completion-event-repository";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CompleteRoutine } from "./complete-routine";
import { CreateRoutine } from "./create-routine";
import { ListRoutines } from "./list-routines";

function setup(now = new Date(2026, 6, 17, 12, 0, 0)) {
	const routineRepository = new InMemoryRoutineRepository();
	const completionEventRepository = new InMemoryCompletionEventRepository();
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(now);
	const createRoutine = new CreateRoutine(
		routineRepository,
		idGenerator,
		clock,
	);
	const completeRoutine = new CompleteRoutine(
		routineRepository,
		completionEventRepository,
		idGenerator,
		clock,
	);
	const listRoutines = new ListRoutines(
		routineRepository,
		completionEventRepository,
		clock,
	);
	return { createRoutine, completeRoutine, listRoutines };
}

describe("ListRoutines", () => {
	test("returns an empty list when there are no routines", async () => {
		const { listRoutines } = setup();
		expect(await listRoutines.execute({})).toEqual([]);
	});

	test("returns every routine with its computed status", async () => {
		const { createRoutine, listRoutines } = setup();
		const routine = await createRoutine.execute({
			name: "Take vitamins",
			taskType: { kind: "OneOff", dueDate: null },
		});

		const views = await listRoutines.execute({});

		expect(views).toHaveLength(1);
		expect(views[0]?.routine.id).toBe(routine.id);
		expect(views[0]?.status).toBe("Due");
		expect(views[0]?.lastCompletedAt).toBeNull();
	});

	test("reflects lastCompletedAt and status after a completion", async () => {
		const now = new Date(2026, 6, 17, 12, 0, 0);
		const { createRoutine, completeRoutine, listRoutines } = setup(now);
		const routine = await createRoutine.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate: null },
		});
		await completeRoutine.execute({ routineId: routine.id });

		const views = await listRoutines.execute({});

		expect(views[0]?.status).toBe("Finished");
		expect(views[0]?.lastCompletedAt).toEqual(now);
	});

	test("filters by category", async () => {
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

		const healthOnly = await listRoutines.execute({ category: "Health" });

		expect(healthOnly).toHaveLength(1);
		expect(healthOnly[0]?.routine.category).toBe("Health");
	});

	test("no category filter returns every routine regardless of category", async () => {
		const { createRoutine, listRoutines } = setup();
		await createRoutine.execute({
			name: "A",
			taskType: { kind: "OneOff", dueDate: null },
			category: "Health",
		});
		await createRoutine.execute({
			name: "B",
			taskType: { kind: "OneOff", dueDate: null },
			category: "Tech",
		});

		expect(await listRoutines.execute({})).toHaveLength(2);
	});
});
