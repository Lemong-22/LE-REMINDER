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

function CircularProgressIndicator({ progressPct }: { progressPct: number }) {
	const radius = 52;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset =
		circumference * (1 - Math.min(100, Math.max(0, progressPct)) / 100);

	return (
		<div className="relative flex size-36 items-center justify-center">
			<svg
				className="absolute inset-0 size-full -rotate-90 transform"
				viewBox="0 0 128 128"
				aria-hidden="true"
			>
				<defs>
					<linearGradient
						id="heroProgressNeonGradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
					>
						<stop offset="0%" stopColor="#06B6D4" />
						<stop offset="60%" stopColor="#38BDF8" />
						<stop offset="100%" stopColor="#3B82F6" />
					</linearGradient>
				</defs>
				{/* Holographic dial outer calibration ticks */}
				<circle
					cx="64"
					cy="64"
					r={58}
					fill="none"
					stroke="rgba(6, 182, 212, 0.15)"
					strokeWidth="1"
					strokeDasharray="2 6"
				/>
				{/* Background circular track */}
				<circle
					cx="64"
					cy="64"
					r={radius}
					fill="none"
					stroke="rgba(255, 255, 255, 0.05)"
					strokeWidth="5"
				/>
				{/* Luminous cyan/blue data ring with requested holographic drop-shadow */}
				<circle
					cx="64"
					cy="64"
					r={radius}
					fill="none"
					stroke="url(#heroProgressNeonGradient)"
					strokeWidth="5.5"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					className="drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-1000 ease-out"
				/>
			</svg>
			<div className="relative flex items-center justify-center">
				<NexusAnimation />
			</div>
		</div>
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
		<div className="relative flex flex-wrap overflow-hidden rounded-xl border border-white/5 bg-[#1A1F2C]/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md">
			<AuroraGlow />
			<div className="flex min-w-[150px] flex-1 flex-col gap-3 border-white/5 border-r p-5">
				<div className="font-bold text-[#FFFFFF] text-[15px] tracking-tight">
					Daily Task
				</div>
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
								className="size-4 cursor-pointer rounded border-[#38445C] transition-all duration-150 active:scale-90 group-hover/item:scale-105 data-checked:border-cyan-500 data-checked:bg-cyan-500"
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

			<div className="flex min-w-[170px] flex-none items-center justify-center border-white/5 border-r p-5">
				<CircularProgressIndicator progressPct={progressPct} />
			</div>

			<div className="flex min-w-[170px] flex-[1.2] flex-col justify-center gap-3 p-5">
				<div className="font-mono text-[11px] text-cyan-300/80 uppercase tracking-[0.08em] drop-shadow-[0_0_8px_rgba(6,182,212,0.25)]">
					OVERALL PROGRESS
				</div>
				<CountUp
					to={progressPct}
					duration={1.2}
					className="font-extrabold text-[#FFFFFF] text-[32px] tracking-tight"
				/>
				<div className="relative">
					{progressPct > 0 && (
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -inset-x-0.5 -inset-y-0.5 rounded-full opacity-45 blur-sm transition-opacity duration-500"
							style={{
								background: "linear-gradient(90deg, #3B82F6, #06B6D4)",
							}}
						/>
					)}
					<div className="relative flex h-1.5 overflow-hidden rounded-full bg-[#141926] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">
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
								className="inline-block size-1.5 rounded-full shadow-[0_0_6px_currentColor]"
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
