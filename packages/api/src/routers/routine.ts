import type { RoutineId } from "@LE-REMINDER/core/domain/identity";
import { publicProcedure, router } from "../index";
import {
	completeRoutineUseCase,
	createRoutineUseCase,
	deleteRoutineUseCase,
	editRoutineUseCase,
	getRoutineUseCase,
	listRoutinesUseCase,
	setRoutinePausedUseCase,
} from "./routine-dependencies";
import {
	completeRoutineInputSchema,
	createRoutineInputSchema,
	deleteRoutineInputSchema,
	editRoutineInputSchema,
	getRoutineInputSchema,
	listRoutinesInputSchema,
	setRoutinePausedInputSchema,
} from "./routine-schemas";

// Thin wrapper only: validate via Zod, cast the validated string id to the
// branded RoutineId at this boundary, call the use case, return its result
// as-is. No business logic, no status computation — that all already
// happened inside the Step 7 use cases.
export const routineRouter = router({
	create: publicProcedure
		.input(createRoutineInputSchema)
		.mutation(({ input }) => createRoutineUseCase.execute(input)),

	edit: publicProcedure.input(editRoutineInputSchema).mutation(({ input }) =>
		editRoutineUseCase.execute({
			...input,
			routineId: input.routineId as RoutineId,
		}),
	),

	delete: publicProcedure
		.input(deleteRoutineInputSchema)
		.mutation(({ input }) =>
			deleteRoutineUseCase.execute({
				routineId: input.routineId as RoutineId,
			}),
		),

	setPaused: publicProcedure
		.input(setRoutinePausedInputSchema)
		.mutation(({ input }) =>
			setRoutinePausedUseCase.execute({
				...input,
				routineId: input.routineId as RoutineId,
			}),
		),

	complete: publicProcedure
		.input(completeRoutineInputSchema)
		.mutation(({ input }) =>
			completeRoutineUseCase.execute({
				...input,
				routineId: input.routineId as RoutineId,
			}),
		),

	list: publicProcedure
		.input(listRoutinesInputSchema)
		.query(({ input }) => listRoutinesUseCase.execute(input)),

	get: publicProcedure
		.input(getRoutineInputSchema)
		.query(({ input }) =>
			getRoutineUseCase.execute({ routineId: input.routineId as RoutineId }),
		),
});
