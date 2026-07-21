import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";

// Fill = the saturated color used for status glyphs/legend dots.
// Text = a darker, more readable shade of the same hue for labels on #EEE7D9.
export const STATUS_FILL: Record<RoutineStatus, string> = {
	Overdue: "#E05D3A",
	// Muted steel/denim blue instead of the original neon #4CB5F9 — the
	// bright digital blue clashed with the warm sepia surfaces. Still
	// unmistakably blue, just lower-chroma so it sits in the earthy palette.
	Due: "#6082B6",
	Done: "#34D399",
	Paused: "#D8B4FE",
	Finished: "#A8967E",
};

export const STATUS_TEXT: Record<RoutineStatus, string> = {
	Overdue: "#B4472B",
	// Deeper denim for the label (was #1D7BB8) — enough contrast to read
	// on the latte card, same muted-blue family as the fill above.
	Due: "#3F5F82",
	Done: "#047857",
	Paused: "#7C3AED",
	Finished: "#83705A",
};
