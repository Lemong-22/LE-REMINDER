export interface TimeRange {
	start: Date;
	end: Date;
}

/**
 * Parses schedule time strings in formats like "09.00 - 09.30", "07.20-08.00", "08:00 - 10:00"
 * into start and end JS Date objects relative to referenceDate.
 */
export function parseEventTimeRange(
	timeStr: string,
	referenceDate: Date,
	nextTimeStr?: string,
): TimeRange | null {
	const matches = Array.from(timeStr.matchAll(/(\d{1,2})[.:](\d{2})/g));
	if (matches.length === 0) return null;

	const startH = Number.parseInt(matches[0][1], 10);
	const startM = Number.parseInt(matches[0][2], 10);

	const start = new Date(referenceDate);
	start.setHours(startH, startM, 0, 0);

	if (matches.length >= 2) {
		const endH = Number.parseInt(matches[1][1], 10);
		const endM = Number.parseInt(matches[1][2], 10);
		const end = new Date(referenceDate);
		end.setHours(endH, endM, 0, 0);
		return { start, end };
	}

	if (nextTimeStr) {
		const nextMatches = Array.from(
			nextTimeStr.matchAll(/(\d{1,2})[.:](\d{2})/g),
		);
		if (nextMatches.length > 0) {
			const nextH = Number.parseInt(nextMatches[0][1], 10);
			const nextM = Number.parseInt(nextMatches[0][2], 10);
			const end = new Date(referenceDate);
			end.setHours(nextH, nextM, 0, 0);
			if (end.getTime() > start.getTime()) {
				return { start, end };
			}
		}
	}

	// Fallback for point in time without end: 45-minute default block
	const end = new Date(start.getTime() + 45 * 60 * 1000);
	return { start, end };
}
