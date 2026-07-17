import type { Clock } from "../domain/clock";

// For tests: pins `now()` to a specific instant so status computation is
// deterministic. Returns a fresh Date each call so a caller mutating the
// returned instance can't corrupt the fixed value for the next call.
export class FixedClock implements Clock {
	constructor(private readonly fixedDate: Date) {}

	now(): Date {
		return new Date(this.fixedDate.getTime());
	}
}
