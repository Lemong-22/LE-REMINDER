import { describe, expect, test } from "bun:test";
import type { RoutineId } from "../domain/identity";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CreateRoutine } from "./create-routine";
import { RoutineNotFoundError } from "./errors";
import { SetRoutinePaused } from "./set-routine-paused";

async function setup() {
	const routineRepository = new InMemoryRoutineRepository();
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(new Date(2026, 6, 17));
	const createRoutine = new CreateRoutine(
		routineRepository,
		idGenerator,
		clock,
	);
	const setRoutinePaused = new SetRoutinePaused(routineRepository);

	const routine = await createRoutine.execute({
		name: "Take vitamins",
		taskType: { kind: "OneOff", dueDate: null },
	});

	return { routineRepository, setRoutinePaused, routine };
}

describe("SetRoutinePaused", () => {
	test("pauses a routine", async () => {
		const { setRoutinePaused, routine } = await setup();
		const updated = await setRoutinePaused.execute({
			routineId: routine.id,
			isPaused: true,
		});
		expect(updated.isPaused).toBe(true);
	});

	test("resumes a paused routine", async () => {
		const { setRoutinePaused, routine } = await setup();
		await setRoutinePaused.execute({ routineId: routine.id, isPaused: true });
		const resumed = await setRoutinePaused.execute({
			routineId: routine.id,
			isPaused: false,
		});
		expect(resumed.isPaused).toBe(false);
	});

	test("persists the paused state to the repository", async () => {
		const { routineRepository, setRoutinePaused, routine } = await setup();
		await setRoutinePaused.execute({ routineId: routine.id, isPaused: true });
		const stored = await routineRepository.findById(routine.id);
		expect(stored?.isPaused).toBe(true);
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { setRoutinePaused } = await setup();
		await expect(
			setRoutinePaused.execute({
				routineId: "does-not-exist" as RoutineId,
				isPaused: true,
			}),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});
