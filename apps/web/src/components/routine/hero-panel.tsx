"use client";

import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { AuroraGlow } from "@/components/aurora-glow";
import { NexusAnimation } from "@/components/nexus-animation";
import { CountUp } from "@/components/ui/count-up";
import { triggerCyberExplosion } from "@/lib/cyber-explosion";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { sortByStatus } from "@/lib/sort-routines";
import { STATUS_FILL } from "@/lib/status-visual";

const STATUS_ORDER: RoutineStatus[] = [
	"Overdue",
	"Due",
	"Done",
	"Paused",
	"Finished",
];

const STATUS_GRADIENT: Record<RoutineStatus, string> = {
	Overdue: "linear-gradient(90deg, #DC2626, #EF4444)",
	Due: "linear-gradient(90deg, #2563EB, #38BDF8)",
	Done: "linear-gradient(90deg, #059669, #10B981)",
	Paused: "linear-gradient(90deg, #7C3AED, #A855F7)",
	Finished: "linear-gradient(90deg, #475569, #64748B)",
};

function isDailyRoutine(routine: DashboardRoutine): boolean {
	return (
		routine.taskType.kind === "Recurring" &&
		routine.taskType.schedule.type === "FixedCalendar" &&
		routine.taskType.schedule.recurrence.kind === "Daily"
	);
}

// The Daily Task checklist is a direct view onto real routine state — only
// the sidebar "Today's To-Do" scratchpad is isolated from the backend.
// Checking a box here fires the same complete mutation as a Routine Card's
// Complete button, so the DB, the progress bar, and the card grid below all
// stay in sync.
export function HeroPanel({
	routines,
	onComplete,
}: {
	routines: DashboardRoutine[];
	onComplete: (routine: DashboardRoutine) => void;
}) {
	const dailyItems = sortByStatus(routines.filter(isDailyRoutine));

	const counts: Record<RoutineStatus, number> = {
		Overdue: 0,
		Due: 0,
		Done: 0,
		Paused: 0,
		Finished: 0,
	};
	for (const r of routines) counts[r.status]++;
	const total = routines.length || 1;
	const progressPct = Math.round(
		((counts.Done + counts.Finished) / total) * 100,
	);

	return (
		<div className="relative flex flex-wrap overflow-hidden rounded-xl border border-[#2E384D] bg-gradient-to-br from-[#1E2433] to-[#242C3E]/85 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.06)]">
			<AuroraGlow />
			<div className="flex min-w-[150px] flex-1 flex-col gap-3 border-[#2E384D]/60 border-r p-5">
				<div className="font-bold text-[#F1F5F9] text-[15px]">Daily Task</div>
				{dailyItems.length === 0 && (
					<div className="text-[#94A3B8] text-xs">No daily routines yet.</div>
				)}
				{dailyItems.map((routine) => {
					const done =
						routine.status === "Done" || routine.status === "Finished";
					return (
						<div
							key={routine.id}
							className={cn(
								"group/item -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-white/5",
								done && "opacity-60 hover:opacity-100",
							)}
						>
							<Checkbox
								checked={done}
								onCheckedChange={() => {
									if (!done) onComplete(routine);
								}}
								onClick={(e) => {
									if (!done) {
										triggerCyberExplosion(e.currentTarget);
									}
								}}
								className="size-4 cursor-pointer rounded border-[#38445C] transition-all duration-150 active:scale-90 group-hover/item:scale-105 data-checked:border-[#3B82F6] data-checked:bg-[#3B82F6]"
							/>
							<button
								type="button"
								onClick={(e) => {
									if (!done) {
										triggerCyberExplosion(e.currentTarget);
										onComplete(routine);
									}
								}}
								className={cn(
									"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-colors duration-200 active:scale-[0.99]",
									done
										? "text-[#64748B] line-through"
										: "text-[#F1F5F9] hover:text-[#38BDF8]",
								)}
							>
								{routine.name}
							</button>
						</div>
					);
				})}
			</div>

			<div className="flex min-w-[150px] flex-none items-center justify-center border-[#2E384D]/60 border-r p-5">
				<NexusAnimation />
			</div>

			<div className="flex min-w-[170px] flex-[1.2] flex-col justify-center gap-3 p-5">
				<div className="font-mono text-[#94A3B8] text-[11px] tracking-[0.08em]">
					OVERALL PROGRESS
				</div>
				<CountUp
					to={progressPct}
					duration={1.2}
					className="font-extrabold text-[#F1F5F9] text-[30px]"
				/>
				<div className="relative">
					{progressPct > 0 && (
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -inset-x-0.5 -inset-y-0.5 rounded-full opacity-35 blur-sm transition-opacity duration-500"
							style={{
								background: "linear-gradient(90deg, #3B82F6, #06B6D4)",
							}}
						/>
					)}
					<div className="relative flex h-1.5 overflow-hidden rounded-full bg-[#181E2B] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
						{STATUS_ORDER.map((status) => (
							<div
								key={status}
								className="h-full transition-all duration-500 ease-out"
								style={{
									background: STATUS_GRADIENT[status] ?? STATUS_FILL[status],
									width: `${(counts[status] / total) * 100}%`,
								}}
							/>
						))}
						{routines.length > 0 && (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-y-0 w-24 animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
							/>
						)}
					</div>
				</div>
				<div className="flex flex-wrap gap-3 font-mono text-[#94A3B8] text-[11px]">
					{STATUS_ORDER.map((status) => (
						<div key={status} className="flex items-center gap-1.5">
							<span
								className="inline-block size-1.5 rounded-full"
								style={{ background: STATUS_FILL[status] }}
							/>
							{counts[status]} {status}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
