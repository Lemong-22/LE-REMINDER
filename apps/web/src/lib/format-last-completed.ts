function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function formatLastCompleted(
	date: Date | null,
	now = new Date(),
): string {
	if (!date) return "Never";

	if (isSameDay(date, now)) return "Today";

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (isSameDay(date, yesterday)) return "Yesterday";

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
