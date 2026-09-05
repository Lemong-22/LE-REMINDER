import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

// Fill = the saturated color used for status glyphs/legend dots.
// Text = a bright, high-contrast shade of the same hue for labels on dark slate surfaces (#121316 / #1C1D21).
export const STATUS_FILL: Record<RoutineStatus, string> = {
	Overdue: "#EF4444",
	Due: "#818CF8",
	Done: "#34D399",
	Paused: "#C084FC",
	Finished: "#6E717E",
};

export const STATUS_TEXT: Record<RoutineStatus, string> = {
	Overdue: "#FCA5A5",
	Due: "#A5B4FC",
	Done: "#6EE7B7",
	Paused: "#E9D5FF",
	Finished: "#9496A1",
};
