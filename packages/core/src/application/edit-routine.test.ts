import { describe, expect, test } from "bun:test";
import type { RoutineId } from "../domain/identity";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CreateRoutine } from "./create-routine";
import { EditRoutine } from "./edit-routine";
import { RoutineNotFoundError } from "./errors";

async function setup() {
	const routineRepository = new InMemoryRoutineRepository();
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(new Date(2026, 6, 17));
	const createRoutine = new CreateRoutine(
		routineRepository,
		idGenerator,
		clock,
	);
	const editRoutine = new EditRoutine(routineRepository);

	const routine = await createRoutine.execute({
		name: "Take vitamins",
		taskType: { kind: "OneOff", dueDate: null },
		category: "Health",
	});

	return { routineRepository, editRoutine, routine };
}

describe("EditRoutine", () => {
	test("partial edit updates only the given fields", async () => {
		const { editRoutine, routine } = await setup();

		const updated = await editRoutine.execute({
			routineId: routine.id,
			name: "Take vitamins daily",
		});

		expect(updated.name).toBe("Take vitamins daily");
		expect(updated.category).toBe("Health");
		expect(updated.taskType).toEqual(routine.taskType);
	});

	test("edit persists to the repository", async () => {
		const { routineRepository, editRoutine, routine } = await setup();

		await editRoutine.execute({ routineId: routine.id, category: "Wellness" });

		const stored = await routineRepository.findById(routine.id);
		expect(stored?.category).toBe("Wellness");
	});

	test("edit can replace the taskType entirely", async () => {
		const { editRoutine, routine } = await setup();

		const updated = await editRoutine.execute({
			routineId: routine.id,
			taskType: {
				kind: "Recurring",
				schedule: {
					type: "RollingInterval",
					interval: { value: 3, unit: "days" },
				},
			},
		});

		expect(updated.taskType.kind).toBe("Recurring");
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { editRoutine } = await setup();
		await expect(
			editRoutine.execute({
				routineId: "does-not-exist" as RoutineId,
				name: "X",
			}),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});
});
