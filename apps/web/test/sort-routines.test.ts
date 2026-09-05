/// <reference types="bun" />

import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import { describe, expect, test } from "bun:test";
import { sortByStatus } from "../src/lib/sort-routines";

interface TestItem {
	id: string;
	status: RoutineStatus;
	isImportant?: boolean;
}

describe("sortByStatus", () => {
	test("sorts Overdue and Due to top, Paused to middle, Done and Finished to bottom", () => {
		const items: TestItem[] = [
			{ id: "finished-1", status: "Finished" },
			{ id: "due-1", status: "Due" },
			{ id: "done-1", status: "Done" },
			{ id: "overdue-1", status: "Overdue" },
			{ id: "paused-1", status: "Paused" },
		];

		const sorted = sortByStatus(items);
		expect(sorted.map((i) => i.id)).toEqual([
			"overdue-1",
			"due-1",
			"paused-1",
			"done-1",
			"finished-1",
		]);
	});

	test("prioritizes isImportant within the same status category", () => {
		const items: TestItem[] = [
			{ id: "due-normal", status: "Due", isImportant: false },
			{ id: "due-important", status: "Due", isImportant: true },
			{ id: "overdue-normal", status: "Overdue", isImportant: false },
			{ id: "overdue-important", status: "Overdue", isImportant: true },
			{ id: "done-important", status: "Done", isImportant: true },
			{ id: "done-normal", status: "Done", isImportant: false },
		];

		const sorted = sortByStatus(items);
		expect(sorted.map((i) => i.id)).toEqual([
			"overdue-important",
			"overdue-normal",
			"due-important",
			"due-normal",
			"done-important",
			"done-normal",
		]);
	});

	test("preserves relative stability for items with same status and importance", () => {
		const items: TestItem[] = [
			{ id: "due-a", status: "Due" },
			{ id: "due-b", status: "Due" },
			{ id: "done-a", status: "Done" },
			{ id: "done-b", status: "Done" },
		];

		const sorted = sortByStatus(items);
		expect(sorted.map((i) => i.id)).toEqual([
			"due-a",
			"due-b",
			"done-a",
			"done-b",
		]);
	});
});
