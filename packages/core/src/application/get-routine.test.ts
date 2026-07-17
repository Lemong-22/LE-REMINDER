import { describe, expect, test } from "bun:test";
import type { RoutineId } from "../domain/identity";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryCompletionEventRepository } from "../infrastructure/in-memory-completion-event-repository";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CompleteRoutine } from "./complete-routine";
import { CreateRoutine } from "./create-routine";
import { RoutineNotFoundError } from "./errors";
import { GetRoutine } from "./get-routine";

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
	const getRoutine = new GetRoutine(
		routineRepository,
		completionEventRepository,
		clock,
	);
	return { createRoutine, completeRoutine, getRoutine };
}

describe("GetRoutine", () => {
	test("returns the routine view with its computed status", async () => {
		const { createRoutine, getRoutine } = setup();
		const routine = await createRoutine.execute({
			name: "Take vitamins",
			taskType: { kind: "OneOff", dueDate: null },
		});

		const view = await getRoutine.execute({ routineId: routine.id });

		expect(view.routine.id).toBe(routine.id);
		expect(view.status).toBe("Due");
		expect(view.lastCompletedAt).toBeNull();
	});

	test("reflects lastCompletedAt after a completion", async () => {
		const now = new Date(2026, 6, 17, 12, 0, 0);
		const { createRoutine, completeRoutine, getRoutine } = setup(now);
		const routine = await createRoutine.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate: null },
		});
		await completeRoutine.execute({ routineId: routine.id });

		const view = await getRoutine.execute({ routineId: routine.id });

		expect(view.status).toBe("Finished");
		expect(view.lastCompletedAt).toEqual(now);
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { getRoutine } = setup();
		await expect(
			getRoutine.execute({ routineId: "does-not-exist" as RoutineId }),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});
