import { describe, expect, test } from "bun:test";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CreateRoutine } from "./create-routine";

function setup() {
	const routineRepository = new InMemoryRoutineRepository();
	const idGenerator = new CryptoIdGenerator();
	const clock = new FixedClock(new Date(2026, 6, 17, 12, 0, 0));
	const useCase = new CreateRoutine(routineRepository, idGenerator, clock);
	return { routineRepository, idGenerator, clock, useCase };
}

describe("CreateRoutine", () => {
	test("creates and persists a routine with the given fields", async () => {
		const { routineRepository, useCase } = setup();

		const routine = await useCase.execute({
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

		expect(routine.name).toBe("Take vitamins");
		expect(routine.category).toBe("Health");
		expect(routine.isPaused).toBe(false);
		expect(routine.createdAt).toEqual(new Date(2026, 6, 17, 12, 0, 0));
		expect(await routineRepository.findById(routine.id)).toEqual(routine);
	});

	test("category defaults to null when omitted", async () => {
		const { useCase } = setup();
		const routine = await useCase.execute({
			name: "Submit assignment",
			taskType: { kind: "OneOff", dueDate: null },
		});
		expect(routine.category).toBeNull();
	});

	test("each created routine gets a distinct id", async () => {
		const { useCase } = setup();
		const a = await useCase.execute({
			name: "A",
			taskType: { kind: "OneOff", dueDate: null },
		});
		const b = await useCase.execute({
			name: "B",
			taskType: { kind: "OneOff", dueDate: null },
		});
		expect(a.id).not.toBe(b.id);
	});
});
