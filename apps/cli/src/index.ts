import { CompleteRoutine } from "@LE-REMINDER/core/application/complete-routine";
import { CreateRoutine } from "@LE-REMINDER/core/application/create-routine";
import { ListRoutines } from "@LE-REMINDER/core/application/list-routines";
import type { RoutineView } from "@LE-REMINDER/core/application/routine-view";
import { SetRoutinePaused } from "@LE-REMINDER/core/application/set-routine-paused";
import type { RoutineId } from "@LE-REMINDER/core/domain/identity";
import type {
	DayOfWeek,
	RecurrencePattern,
} from "@LE-REMINDER/core/domain/schedule";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";
import { CryptoIdGenerator } from "@LE-REMINDER/core/infrastructure/crypto-id-generator";
import { InMemoryCompletionEventRepository } from "@LE-REMINDER/core/infrastructure/in-memory-completion-event-repository";
import { InMemoryRoutineRepository } from "@LE-REMINDER/core/infrastructure/in-memory-routine-repository";
import { addDuration } from "@LE-REMINDER/core/lib/duration";
import { createInterface } from "node:readline/promises";
import { SteerableClock } from "./steerable-clock";

const routineRepository = new InMemoryRoutineRepository();
const completionEventRepository = new InMemoryCompletionEventRepository();
const idGenerator = new CryptoIdGenerator();
const clock = new SteerableClock();

const createRoutine = new CreateRoutine(routineRepository, idGenerator, clock);
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
const setRoutinePaused = new SetRoutinePaused(routineRepository);

const VALID_DAYS: readonly DayOfWeek[] = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun",
];

function tokenize(line: string): string[] {
	const tokens: string[] = [];
	const pattern = /"([^"]*)"|(\S+)/g;
	let match: RegExpExecArray | null = pattern.exec(line);
	while (match !== null) {
		tokens.push(match[1] !== undefined ? match[1] : (match[2] as string));
		match = pattern.exec(line);
	}
	return tokens;
}

function describeTaskType(taskType: TaskType): string {
	if (taskType.kind === "OneOff") {
		return taskType.dueDate
			? `OneOff (due ${taskType.dueDate.toISOString().slice(0, 10)})`
			: "OneOff (no deadline)";
	}
	const schedule = taskType.schedule;
	if (schedule.type === "RollingInterval") {
		return `RollingInterval (${schedule.interval.value} ${schedule.interval.unit})`;
	}
	const pattern = schedule.recurrence;
	const patternLabel =
		pattern.kind === "Daily"
			? "Daily"
			: pattern.kind === "Weekly"
				? `Weekly(${pattern.daysOfWeek.join(",")})`
				: `Monthly(day ${pattern.dayOfMonth})`;
	return `FixedCalendar:${patternLabel} [${schedule.isMandatory ? "mandatory" : "optional"}]`;
}

function toRow(view: RoutineView) {
	return {
		id: view.routine.id.slice(0, 8),
		name: view.routine.name,
		type: describeTaskType(view.routine.taskType),
		category: view.routine.category ?? "-",
		status: view.status,
		paused: view.routine.isPaused,
		lastCompletedAt: view.lastCompletedAt
			? view.lastCompletedAt.toISOString()
			: "-",
	};
}

async function printRoutines(): Promise<void> {
	const views = await listRoutines.execute({});
	if (views.length === 0) {
		console.log("(no routines)");
		return;
	}
	console.table(views.map(toRow));
}

async function findRoutineIdByPrefix(
	prefix: string,
): Promise<RoutineId | null> {
	const views = await listRoutines.execute({});
	const match = views.find((view) =>
		view.routine.id.toLowerCase().startsWith(prefix.toLowerCase()),
	);
	return match ? match.routine.id : null;
}

function parseUnit(token: string): "days" | "weeks" | "months" {
	if (token === "days" || token === "weeks" || token === "months") {
		return token;
	}
	throw new Error(`Unknown unit "${token}" — expected days, weeks, or months`);
}

function parseDaysOfWeek(token: string): DayOfWeek[] {
	return token.split(",").map((raw) => {
		const day = raw.trim();
		if (!VALID_DAYS.includes(day as DayOfWeek)) {
			throw new Error(
				`Unknown day "${day}" — expected one of ${VALID_DAYS.join(",")}`,
			);
		}
		return day as DayOfWeek;
	});
}

function parseKeyValueArg(
	token: string | undefined,
	key: string,
): string | undefined {
	if (token === undefined) return undefined;
	const match = new RegExp(`^${key}=(.*)$`).exec(token);
	return match ? match[1] : undefined;
}

function parseCategoryArg(token: string | undefined): string | undefined {
	return parseKeyValueArg(token, "category");
}

async function handleCreate(args: string[]): Promise<void> {
	const [kind, name, ...rest] = args;
	if (name === undefined) {
		throw new Error('Usage: create <oneoff|fixed|rolling> "<name>" ...');
	}

	if (kind === "oneoff") {
		const [dueArg, categoryArg] = rest;
		const dueDateRaw = parseKeyValueArg(dueArg, "dueDate");
		const dueDate =
			dueDateRaw === undefined || dueDateRaw === "none"
				? null
				: new Date(dueDateRaw);
		const category = parseCategoryArg(categoryArg) ?? parseCategoryArg(dueArg);
		const taskType: TaskType = { kind: "OneOff", dueDate };
		const routine = await createRoutine.execute({ name, taskType, category });
		console.log(`Created OneOff routine ${routine.id.slice(0, 8)}`);
		return;
	}

	if (kind === "fixed") {
		const [patternKind, ...patternRest] = rest;
		let recurrence: RecurrencePattern;
		let mandatoryArg: string | undefined;
		let categoryArg: string | undefined;

		if (patternKind === "daily") {
			[mandatoryArg, categoryArg] = patternRest;
			recurrence = { kind: "Daily" };
		} else if (patternKind === "weekly") {
			const [daysArg, mandatory, category] = patternRest;
			mandatoryArg = mandatory;
			categoryArg = category;
			recurrence = {
				kind: "Weekly",
				daysOfWeek: parseDaysOfWeek(daysArg ?? ""),
			};
		} else if (patternKind === "monthly") {
			const [dayArg, mandatory, category] = patternRest;
			mandatoryArg = mandatory;
			categoryArg = category;
			recurrence = { kind: "Monthly", dayOfMonth: Number(dayArg) };
		} else {
			throw new Error(
				'Usage: create fixed "<name>" <daily|weekly|monthly> ...',
			);
		}

		const isMandatory = mandatoryArg === "true";
		const taskType: TaskType = {
			kind: "Recurring",
			schedule: { type: "FixedCalendar", recurrence, isMandatory },
		};
		const routine = await createRoutine.execute({
			name,
			taskType,
			category: parseCategoryArg(categoryArg),
		});
		console.log(`Created FixedCalendar routine ${routine.id.slice(0, 8)}`);
		return;
	}

	if (kind === "rolling") {
		const [valueArg, unitArg, categoryArg] = rest;
		const taskType: TaskType = {
			kind: "Recurring",
			schedule: {
				type: "RollingInterval",
				interval: { value: Number(valueArg), unit: parseUnit(unitArg ?? "") },
			},
		};
		const routine = await createRoutine.execute({
			name,
			taskType,
			category: parseCategoryArg(categoryArg),
		});
		console.log(`Created RollingInterval routine ${routine.id.slice(0, 8)}`);
		return;
	}

	throw new Error(
		`Unknown create kind "${kind}" — expected oneoff, fixed, or rolling`,
	);
}

function printHelp(): void {
	console.log(`
Commands:
  create oneoff "<name>" [dueDate=YYYY-MM-DD|none] [category=<cat>]
  create fixed "<name>" daily <true|false> [category=<cat>]
  create fixed "<name>" weekly <Mon,Thu,...> <true|false> [category=<cat>]
  create fixed "<name>" monthly <dayOfMonth> <true|false> [category=<cat>]
  create rolling "<name>" <value> <days|weeks|months> [category=<cat>]
  list                        show the dashboard
  complete <idPrefix>         log a completion
  pause <idPrefix>            pause a routine
  resume <idPrefix>           resume a paused routine
  advance <value> <days|weeks|months>   move the simulated clock forward
  now                         print the simulated current time
  demo                        run the automated FixedCalendar-vs-RollingInterval truth test
  help                        show this message
  exit                        quit
`);
}

async function runDemo(): Promise<void> {
	console.log(
		"\n=== Truth Test: mandatory FixedCalendar vs RollingInterval ===\n",
	);

	const daily = await createRoutine.execute({
		name: "Take critical medication",
		category: "Health",
		taskType: {
			kind: "Recurring",
			schedule: {
				type: "FixedCalendar",
				recurrence: { kind: "Daily" },
				isMandatory: true,
			},
		},
	});
	const rolling = await createRoutine.execute({
		name: "Water the office plant",
		category: "Home",
		taskType: {
			kind: "Recurring",
			schedule: {
				type: "RollingInterval",
				interval: { value: 3, unit: "days" },
			},
		},
	});

	console.log("Day 0 — created both, neither completed yet:");
	await printRoutines();

	await completeRoutine.execute({ routineId: daily.id });
	await completeRoutine.execute({ routineId: rolling.id });
	console.log("\nDay 0 — completed both:");
	await printRoutines();

	clock.set(addDuration(clock.now(), { value: 1, unit: "days" }));
	console.log("\nDay +1 — advanced 1 day, neither completed again:");
	console.log("  Daily: fresh occurrence day just opened -> Due");
	console.log("  Rolling (3-day interval): still within window -> Done");
	await printRoutines();

	clock.set(addDuration(clock.now(), { value: 1, unit: "days" }));
	console.log(
		`\nDay +2 — advanced 1 more day, Daily's Day+1 slot was missed entirely:`,
	);
	console.log(
		"  Daily: mandatory Overdue now PERSISTS (the Step 5 bug fix in action)",
	);
	console.log("  Rolling: still within its 3-day window -> Done");
	await printRoutines();

	clock.set(addDuration(clock.now(), { value: 1, unit: "days" }));
	console.log("\nDay +3 — advanced 1 more day:");
	console.log("  Daily: still Overdue (persists until explicitly completed)");
	console.log(
		"  Rolling: interval has now elapsed -> Overdue too, but by a strict binary flip, not persistence",
	);
	await printRoutines();

	await completeRoutine.execute({ routineId: daily.id });
	console.log(
		"\nCompleted Daily -> resolves its Overdue; Rolling is untouched and independent:",
	);
	await printRoutines();

	await completeRoutine.execute({ routineId: rolling.id });
	console.log(
		"\nCompleted Rolling too -> both Done again, clock resets the interval from now:",
	);
	await printRoutines();

	console.log("\n=== End of Truth Test ===\n");
}

async function handleCommand(line: string): Promise<boolean> {
	const [command, ...args] = tokenize(line.trim());
	if (command === undefined) {
		return true;
	}

	switch (command) {
		case "help":
			printHelp();
			return true;

		case "exit":
		case "quit":
			return false;

		case "list":
			await printRoutines();
			return true;

		case "now":
			console.log(clock.now().toISOString());
			return true;

		case "create":
			await handleCreate(args);
			return true;

		case "complete": {
			const [prefix] = args;
			const id = prefix ? await findRoutineIdByPrefix(prefix) : null;
			if (id === null) {
				console.log(`No routine matches id prefix "${prefix ?? ""}"`);
				return true;
			}
			await completeRoutine.execute({ routineId: id });
			console.log("Completed.");
			return true;
		}

		case "pause":
		case "resume": {
			const [prefix] = args;
			const id = prefix ? await findRoutineIdByPrefix(prefix) : null;
			if (id === null) {
				console.log(`No routine matches id prefix "${prefix ?? ""}"`);
				return true;
			}
			await setRoutinePaused.execute({
				routineId: id,
				isPaused: command === "pause",
			});
			console.log(command === "pause" ? "Paused." : "Resumed.");
			return true;
		}

		case "advance": {
			const [valueArg, unitArg] = args;
			clock.set(
				addDuration(clock.now(), {
					value: Number(valueArg),
					unit: parseUnit(unitArg ?? ""),
				}),
			);
			console.log(`Clock advanced to ${clock.now().toISOString()}`);
			return true;
		}

		case "demo":
			await runDemo();
			return true;

		default:
			console.log(`Unknown command "${command}" — type "help" for the list.`);
			return true;
	}
}

async function main(): Promise<void> {
	console.log(
		"LE-REMINDER CLI — Phase 0 proof against in-memory mock adapters.",
	);
	printHelp();

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	// `for await...of` pulls one line at a time from the interface's own
	// buffer — unlike question() in a loop, it can't drop lines that arrive
	// (or are piped in all at once) faster than we finish handling the
	// previous one.
	process.stdout.write("> ");
	for await (const line of rl) {
		let shouldContinue = true;
		try {
			shouldContinue = await handleCommand(line);
		} catch (error) {
			console.log(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		if (!shouldContinue) {
			break;
		}
		process.stdout.write("> ");
	}
	rl.close();
}

main();
