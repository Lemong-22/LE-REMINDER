import { CompleteRoutine } from "@LE-REMINDER/core/application/complete-routine";
import { CreateRoutine } from "@LE-REMINDER/core/application/create-routine";
import { DeleteRoutine } from "@LE-REMINDER/core/application/delete-routine";
import { EditRoutine } from "@LE-REMINDER/core/application/edit-routine";
import { GetRoutine } from "@LE-REMINDER/core/application/get-routine";
import { ListRoutines } from "@LE-REMINDER/core/application/list-routines";
import { SetRoutinePaused } from "@LE-REMINDER/core/application/set-routine-paused";
import { CryptoIdGenerator } from "@LE-REMINDER/core/infrastructure/crypto-id-generator";
import { SystemClock } from "@LE-REMINDER/core/infrastructure/system-clock";
import { db } from "@LE-REMINDER/db";
import { TursoCompletionEventAdapter } from "@LE-REMINDER/db/adapters/turso-completion-event-adapter";
import { TursoRoutineAdapter } from "@LE-REMINDER/db/adapters/turso-routine-adapter";

// Composition root: built once per process, wired to the real Turso
// adapters. The router itself never touches Drizzle/Turso types directly —
// it only ever calls .execute() on these use-case instances.
const routineRepository = new TursoRoutineAdapter(db);
const completionEventRepository = new TursoCompletionEventAdapter(db);
const idGenerator = new CryptoIdGenerator();
const clock = new SystemClock();

export const createRoutineUseCase = new CreateRoutine(
	routineRepository,
	idGenerator,
	clock,
);
export const editRoutineUseCase = new EditRoutine(routineRepository);
export const deleteRoutineUseCase = new DeleteRoutine(routineRepository);
export const setRoutinePausedUseCase = new SetRoutinePaused(routineRepository);
export const completeRoutineUseCase = new CompleteRoutine(
	routineRepository,
	completionEventRepository,
	idGenerator,
	clock,
);
export const listRoutinesUseCase = new ListRoutines(
	routineRepository,
	completionEventRepository,
	clock,
);
export const getRoutineUseCase = new GetRoutine(
	routineRepository,
	completionEventRepository,
	clock,
);
