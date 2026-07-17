import type { Clock } from "@LE-REMINDER/core/domain/clock";

// A CLI-only Clock that can be advanced on command, so the passage of time
// (days/weeks/months) can be simulated interactively without waiting for it —
// not a Step 8 deliverable, just a demo tool for driving the same Clock port.
export class SteerableClock implements Clock {
	private current: Date;

	constructor(initial: Date = new Date()) {
		this.current = initial;
	}

	now(): Date {
		return new Date(this.current.getTime());
	}

	set(date: Date): void {
		this.current = date;
	}
}
