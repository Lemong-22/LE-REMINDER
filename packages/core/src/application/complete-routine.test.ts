import { describe, expect, test } from "bun:test";
import type { RoutineId } from "../domain/identity";
import { CryptoIdGenerator } from "../infrastructure/crypto-id-generator";
import { FixedClock } from "../infrastructure/fixed-clock";
import { InMemoryCompletionEventRepository } from "../infrastructure/in-memory-completion-event-repository";
import { InMemoryRoutineRepository } from "../infrastructure/in-memory-routine-repository";
import { CompleteRoutine } from "./complete-routine";
import { CreateRoutine } from "./create-routine";
import { RoutineAlreadyFinishedError, RoutineNotFoundError } from "./errors";

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
	return {
		routineRepository,
		completionEventRepository,
		idGenerator,
		clock,
		createRoutine,
		completeRoutine,
	};
}

describe("CompleteRoutine", () => {
	test("appends a completion event defaulting completedAt to Clock.now()", async () => {
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

		expect(event.completedAt).toEqual(now);
		expect(event.routineId).toBe(routine.id);
		expect(
			await completionEventRepository.findLatestByRoutineId(routine.id),
		).toEqual(event);
	});

	test("accepts an explicit backdated completedAt", async () => {
		const { createRoutine, completeRoutine } = setup();
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
		const yesterday = new Date(2026, 6, 16, 9, 0, 0);

		const event = await completeRoutine.execute({
			routineId: routine.id,
			completedAt: yesterday,
		});

		expect(event.completedAt).toEqual(yesterday);
	});

	test("throws RoutineNotFoundError for a missing routine", async () => {
		const { completeRoutine } = setup();
		await expect(
			completeRoutine.execute({ routineId: "does-not-exist" as RoutineId }),
		).rejects.toBeInstanceOf(RoutineNotFoundError);
	});

	test("a Recurring routine can be completed repeatedly across cycles without error", async () => {
		const { createRoutine, completeRoutine } = setup(new Date(2026, 6, 17));
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

		await expect(
			completeRoutine.execute({ routineId: routine.id }),
		).resolves.toBeDefined();
		await expect(
			completeRoutine.execute({ routineId: routine.id }),
		).resolves.toBeDefined();
	});

	describe("crucial: rejecting re-completion of an already-Finished OneOff", () => {
		test("throws RoutineAlreadyFinishedError when completing a OneOff that is already Finished", async () => {
			const { createRoutine, completeRoutine } = setup();
			const routine = await createRoutine.execute({
				name: "Submit assignment",
				taskType: { kind: "OneOff", dueDate: null },
			});

			// First completion succeeds and transitions the OneOff to Finished.
			await completeRoutine.execute({ routineId: routine.id });

			// Second completion attempt must be rejected, not silently logged.
			await expect(
				completeRoutine.execute({ routineId: routine.id }),
			).rejects.toBeInstanceOf(RoutineAlreadyFinishedError);
		});

		test("does not append a second completion event when rejecting re-completion", async () => {
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

			const allEvents = await completionEventRepository.findAllByRoutineId(
				routine.id,
			);
			expect(allEvents).toHaveLength(1);
		});

		test("a paused OneOff that would otherwise be Finished is NOT rejected — Paused takes precedence", async () => {
			const { createRoutine, completeRoutine, routineRepository } = setup();
			const routine = await createRoutine.execute({
				name: "Submit assignment",
				taskType: { kind: "OneOff", dueDate: null },
			});
			await completeRoutine.execute({ routineId: routine.id });

			const stored = await routineRepository.findById(routine.id);
			if (stored === null) throw new Error("expected routine to exist");
			await routineRepository.save({ ...stored, isPaused: true });

			// Paused short-circuits computeRoutineStatus before "Finished" is even
			// considered, so completing again is allowed (not rejected) here —
			// documenting the actual precedence rather than assuming it.
			await expect(
				completeRoutine.execute({ routineId: routine.id }),
			).resolves.toBeDefined();
		});
	});
});
