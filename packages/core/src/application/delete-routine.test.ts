import { describe, expect, test } from "bun:test";
import type { RoutineId } from "../domain/identity";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CreateRoutine } from "./create-routine";
import { DeleteRoutine } from "./delete-routine";

async function setup() {
	const routineRepository = new InMemoryRoutineRepository();
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(new Date(2026, 6, 17));
	const createRoutine = new CreateRoutine(
		routineRepository,
		idGenerator,
		clock,
	);
	const deleteRoutine = new DeleteRoutine(routineRepository);

	const routine = await createRoutine.execute({
		name: "Take vitamins",
		taskType: { kind: "OneOff", dueDate: null },
	});

	return { routineRepository, deleteRoutine, routine };
}

describe("DeleteRoutine", () => {
	test("removes the routine from the repository", async () => {
		const { routineRepository, deleteRoutine, routine } = await setup();

		await deleteRoutine.execute({ routineId: routine.id });

		expect(await routineRepository.findById(routine.id)).toBeNull();
	});

	test("deleting a non-existent id does not throw (idempotent)", async () => {
		const { deleteRoutine } = await setup();
		await expect(
			deleteRoutine.execute({ routineId: "does-not-exist" as RoutineId }),
		).resolves.toBeUndefined();
	});
});
