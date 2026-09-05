import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

// Fill = the saturated color used for status glyphs/legend dots.
// Text = a bright, high-contrast shade of the same hue for labels on midnight blue surfaces (#131722 / #1E2433).
export const STATUS_FILL: Record<RoutineStatus, string> = {
	Overdue: "#EF4444",
	Due: "#38BDF8",
	Done: "#10B981",
	Paused: "#C084FC",
	Finished: "#64748B",
};

export const STATUS_TEXT: Record<RoutineStatus, string> = {
	Overdue: "#FCA5A5",
	Due: "#BAE6FD",
	Done: "#6EE7B7",
	Paused: "#E9D5FF",
	Finished: "#94A3B8",
};
