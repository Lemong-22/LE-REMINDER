import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import { STATUS_FILL } from "@/lib/status-visual";

// Status is never conveyed by color alone: each status also gets a distinct
// glyph shape (triangle/ring/filled/outlined) so it reads under color-blindness
// or grayscale printing.
export function StatusShape({
	status,
	size = 12,
}: {
	status: RoutineStatus;
	size?: number;
}) {
	const fill = STATUS_FILL[status];
	const style = { width: size, height: size };

	if (status === "Overdue") {
		return (
			<div
				aria-hidden
				className="shrink-0 [clip-path:polygon(50%_6%,95%_94%,5%_94%)]"
				style={{ ...style, background: fill }}
			/>
		);
	}

	if (status === "Due") {
		return (
			<div
				aria-hidden
				className="shrink-0 rounded-full"
				style={{ ...style, border: `2px solid ${fill}` }}
			/>
		);
	}

	if (status === "Finished") {
		return (
			<div
				aria-hidden
				className="shrink-0 rounded-full border border-[#a8a29e]"
				style={{ ...style, background: "#e7e5e4" }}
			/>
		);
	}

	// Done, Paused
	return (
		<div
			aria-hidden
			className="shrink-0 rounded-full"
			style={{ ...style, background: fill }}
		/>
	);
}
