import type { DashboardRoutine } from "@/lib/dashboard-routine";

const BASE_SUGGESTIONS = ["Tech", "Health", "Finance"];

// Category is a free-text field (packages/core/src/domain/category.ts), so
// there's no fixed list to draw suggestions from — only whatever's already
// been typed into a saved routine, plus a small starting set for a brand
// new install with zero routines. Case-insensitive de-dupe so "health" and
// "Health" don't both show up as separate pills; whichever spelling is
// encountered first wins.
export function buildCategorySuggestions(
	routines: DashboardRoutine[],
): string[] {
	const seen = new Map<string, string>();
	const used = routines
		.map((r) => r.category)
		.filter((c): c is string => Boolean(c?.trim()));

	for (const category of [...BASE_SUGGESTIONS, ...used]) {
		const key = category.toLowerCase();
		if (!seen.has(key)) seen.set(key, category);
	}

	return [...seen.values()];
}
