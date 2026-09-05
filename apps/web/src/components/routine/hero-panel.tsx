"use client";

import type { RoutineStatus } from "@LE-REMINDER/core/domain/routine-status";
import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { motion } from "motion/react";
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
	Due: "linear-gradient(90deg, #6366F1, #818CF8)",
	Done: "linear-gradient(90deg, #059669, #34D399)",
	Paused: "linear-gradient(90deg, #9333EA, #C084FC)",
	Finished: "linear-gradient(90deg, #4B4D58, #6E717E)",
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
		<div className="relative flex flex-wrap overflow-hidden rounded-xl border border-[#282A30]/70 bg-gradient-to-br from-[#1C1D21] to-[#1F2126]/80 shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.05)]">
			<AuroraGlow />
			<div className="flex min-w-[150px] flex-1 flex-col gap-3 border-[#282A30]/60 border-r p-5">
				<div className="font-bold text-[15px]">Daily Task</div>
				{dailyItems.length === 0 && (
					<div className="text-[#9496A1] text-xs">No daily routines yet.</div>
				)}
				{dailyItems.map((routine) => {
					const done =
						routine.status === "Done" || routine.status === "Finished";
					return (
						<div
							key={routine.id}
							className={cn(
								"group/item -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-all duration-200 hover:bg-[#26282E]/70",
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
								className="size-4 cursor-pointer rounded border-[#484B56] transition-all duration-150 active:scale-90 group-hover/item:scale-105 data-checked:border-[#6366F1] data-checked:bg-[#6366F1]"
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
										? "text-[#6E717E] line-through"
										: "text-[#EDEDED] hover:text-[#818CF8]",
								)}
							>
								{routine.name}
							</button>
						</div>
					);
				})}
			</div>

			<div className="flex min-w-[150px] flex-none items-center justify-center border-[#282A30]/60 border-r p-5">
				<NexusAnimation />
			</div>

			<div className="flex min-w-[170px] flex-[1.2] flex-col justify-center gap-3 p-5">
				<div className="font-mono text-[#9496A1] text-[11px] tracking-[0.08em]">
					OVERALL PROGRESS
				</div>
				<CountUp
					to={progressPct}
					duration={1.2}
					className="font-extrabold text-[30px]"
				/>
				<div className="relative">
					{progressPct > 0 && (
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -inset-x-0.5 -inset-y-0.5 rounded-full opacity-25 blur-sm transition-opacity duration-500"
							style={{
								background: "linear-gradient(90deg, #6366F1, #34D399)",
							}}
						/>
					)}
					<div className="relative flex h-1.5 overflow-hidden rounded-full bg-[#22242A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
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
							<motion.div
								aria-hidden="true"
								className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/35 to-transparent"
								animate={{ x: ["-100%", "500%"] }}
								transition={{
									duration: 2.6,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									repeatDelay: 0.8,
								}}
							/>
						)}
					</div>
				</div>
				<div className="flex flex-wrap gap-3 font-mono text-[#9496A1] text-[11px]">
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
