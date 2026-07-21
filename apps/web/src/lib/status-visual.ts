import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

// Fill = the saturated color used for status glyphs/legend dots.
// Text = a darker, more readable shade of the same hue for labels on #E8DFCF.
export const STATUS_FILL: Record<RoutineStatus, string> = {
	Overdue: "#E05D3A",
	Due: "#4CB5F9",
	Done: "#34D399",
	Paused: "#D8B4FE",
	Finished: "#A8967E",
};

export const STATUS_TEXT: Record<RoutineStatus, string> = {
	Overdue: "#B4472B",
	Due: "#1D7BB8",
	Done: "#047857",
	Paused: "#7C3AED",
	Finished: "#83705A",
};
