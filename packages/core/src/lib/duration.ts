import type { Duration } from "../domain/schedule";

export function addDuration(date: Date, duration: Duration): Date {
	const result = new Date(date);
	switch (duration.unit) {
		case "days":
			result.setDate(result.getDate() + duration.value);
			return result;
		case "weeks":
			result.setDate(result.getDate() + duration.value * 7);
			return result;
		case "months":
			result.setMonth(result.getMonth() + duration.value);
			return result;
	}
}
