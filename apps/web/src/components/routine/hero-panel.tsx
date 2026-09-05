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
		<div className="relative flex flex-wrap overflow-hidden rounded-xl border border-[#D6C9B2]/70 bg-gradient-to-br from-[#F7F2E8] to-[#F3EDE1]/80 shadow-[0_1px_2px_rgba(41,37,36,0.05),inset_0_0_0_1px_rgba(255,255,255,0.6)]">
			<AuroraGlow />
			<div className="flex min-w-[150px] flex-1 flex-col gap-3 border-[#D6C9B2]/60 border-r p-5">
				<div className="font-bold text-[15px]">Daily Task</div>
				{dailyItems.length === 0 && (
					<div className="text-[#5F4F3D] text-xs">No daily routines yet.</div>
				)}
				{dailyItems.map((routine) => {
					const done =
						routine.status === "Done" || routine.status === "Finished";
					return (
						<div
							key={routine.id}
							className={cn(
								"group/item -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-all duration-200 hover:bg-[#EFE7D8]/70",
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
								className="size-4 cursor-pointer rounded border-[#9A876C] transition-all duration-150 active:scale-90 group-hover/item:scale-105 data-checked:border-[#2E2318] data-checked:bg-[#2E2318]"
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
									"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-all duration-200 active:scale-[0.99]",
									done
										? "text-[#83705A] line-through"
										: "text-[#2E2318] hover:text-[#C2410C]",
								)}
							>
								{routine.name}
							</button>
						</div>
					);
				})}
			</div>

			<div className="flex min-w-[150px] flex-none items-center justify-center border-[#D6C9B2]/60 border-r p-5">
				<NexusAnimation />
			</div>

			<div className="flex min-w-[170px] flex-[1.2] flex-col justify-center gap-3 p-5">
				<div className="font-mono text-[#5F4F3D] text-[11px] tracking-[0.08em]">
					OVERALL PROGRESS
				</div>
				<CountUp
					to={progressPct}
					duration={1.2}
					className="font-extrabold text-[30px]"
				/>
				<div className="flex h-1.5 overflow-hidden rounded-full bg-[#E6DCCA]">
					{STATUS_ORDER.map((status) => (
						<div
							key={status}
							className="h-full transition-all duration-500 ease-out"
							style={{
								background: STATUS_FILL[status],
								width: `${(counts[status] / total) * 100}%`,
							}}
						/>
					))}
				</div>
				<div className="flex flex-wrap gap-3 font-mono text-[#5F4F3D] text-[11px]">
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
