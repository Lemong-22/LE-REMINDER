"use client";

import { Badge } from "@LE-REMINDER/ui/components/badge";
import { Button } from "@LE-REMINDER/ui/components/button";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { triggerCyberExplosion } from "@/lib/cyber-explosion";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { describeTaskType } from "@/lib/describe-task-type";
import { formatLastCompleted } from "@/lib/format-last-completed";
import { isStrictlyDueToday } from "@/lib/is-due-today";
import { STATUS_TEXT } from "@/lib/status-visual";
import { StatusShape } from "./status-shape";

function isMandatory(routine: DashboardRoutine): boolean {
	return (
		routine.taskType.kind === "Recurring" &&
		routine.taskType.schedule.type === "FixedCalendar" &&
		routine.taskType.schedule.isMandatory
	);
}

export function RoutineCard({
	routine,
	onComplete,
	onEdit,
	onTogglePause,
}: {
	routine: DashboardRoutine;
	onComplete: () => void;
	onEdit: () => void;
	onTogglePause: () => void;
}) {
	const [flipping, setFlipping] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);

	// Hover reveals the action row on desktop, but touch devices have no
	// hover state — tapping the card reveals it instead, and tapping
	// anywhere outside collapses it back, mirroring the tap-to-reveal
	// pattern of mobile task apps rather than showing actions permanently
	// on every card in a dense grid.
	useEffect(() => {
		if (!revealed) return;
		function handlePointerDown(event: PointerEvent) {
			if (!cardRef.current?.contains(event.target as Node)) {
				setRevealed(false);
			}
		}
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [revealed]);

	const isFinished = routine.status === "Finished";
	const isCompleted = routine.status === "Done" || isFinished;
	const isDue = isStrictlyDueToday(routine.taskType, routine.status);
	const isPaused = routine.status === "Paused";
	const showComplete = routine.status === "Overdue" || routine.status === "Due";
	const showPauseResume = !isFinished;
	const showMandatoryDot =
		routine.taskType.kind === "Recurring" &&
		routine.taskType.schedule.type === "FixedCalendar";

	function handleComplete(target?: HTMLElement) {
		if (target) {
			triggerCyberExplosion(target);
		}
		onComplete();
		setFlipping(true);
		setTimeout(() => setFlipping(false), 400);
	}

	return (
		<motion.div
			ref={cardRef}
			whileHover={{ scale: 1.02, y: -2 }}
			whileTap={{ scale: 0.98 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			onClick={() => setRevealed((v) => !v)}
			className={cn(
				"group relative flex flex-col gap-2.5 overflow-hidden rounded-[10px] border p-[17px] transition-[box-shadow,opacity,border-color] duration-200",
				isDue
					? "border-[#F59E0B]/75 bg-gradient-to-br from-[#1C1D21] via-[#252730] to-[#1F2126] shadow-[0_0_16px_-2px_rgba(245,158,11,0.25),inset_0_0_0_1px_rgba(245,158,11,0.2)] hover:shadow-[0_10px_24px_-4px_rgba(245,158,11,0.28),inset_0_0_0_1px_rgba(245,158,11,0.25)]"
					: "border-[#282A30]/70 bg-gradient-to-br from-[#1C1D21] to-[#1F2126]/80 shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]",
				isCompleted && "opacity-65 hover:opacity-100",
			)}
		>
			{flipping && (
				<div
					aria-hidden
					className="absolute inset-0 origin-left animate-[sweep-flip_0.4s_ease_forwards] bg-emerald-400/[0.14]"
				/>
			)}

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-[7px]">
					<div className="relative flex items-center justify-center">
						{isDue && (
							<span
								aria-hidden
								className="absolute -inset-1 animate-ping rounded-full bg-[#F59E0B]/20"
								style={{ animationDuration: "2.5s" }}
							/>
						)}
						<StatusShape status={routine.status} />
					</div>
					<div
						className={cn(
							"font-mono font-semibold text-[10.5px]",
							isDue && "animate-pulse",
						)}
						style={{ color: STATUS_TEXT[routine.status] }}
					>
						{routine.status}
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<Badge
						variant="outline"
						className={cn(
							"rounded-full px-[8px] py-0.5 font-bold font-mono text-[9px] uppercase tracking-[0.05em]",
							routine.isTask
								? "border-[#6366F1]/60 bg-[#6366F1]/15 text-[#818CF8]"
								: "border-[#32353E] bg-[#22242A]/60 text-[#9496A1]",
						)}
					>
						{routine.isTask ? "Task" : "Routine"}
					</Badge>
					<Badge
						variant="secondary"
						className="rounded-full border border-[#32353E] bg-[#262830] px-[9px] py-0.5 font-bold font-mono text-[#C3C5D0] text-[10px] uppercase tracking-[0.08em]"
					>
						{routine.category}
					</Badge>
				</div>
			</div>

			<div className="flex items-center gap-1.5">
				{routine.isImportant && (
					<Star className="size-4 shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
				)}
				<div
					className={cn(
						"font-bold text-[15px] transition-colors",
						isCompleted ? "text-[#6E717E] line-through" : "text-[#EDEDED]",
					)}
				>
					{routine.name}
				</div>
			</div>

			<div className="flex items-center gap-1.5 font-mono text-[#9496A1] text-[11.5px]">
				{showMandatoryDot && (
					<span
						aria-hidden
						className={cn(
							"size-1.5 shrink-0 rounded-full",
							isMandatory(routine)
								? "bg-[#EDEDED]"
								: "border border-[#636674] bg-transparent",
						)}
					/>
				)}
				<span>{describeTaskType(routine.taskType, routine.status)}</span>
			</div>
			<div className="font-mono text-[#9496A1] text-[11px]">
				Last done · {formatLastCompleted(routine.lastCompletedAt)}
			</div>

			<div
				className={cn(
					"pointer-events-none flex gap-1.5 opacity-0 transition-all duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
					revealed && "pointer-events-auto opacity-100",
				)}
			>
				{showComplete && (
					<Button
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							handleComplete(e.currentTarget);
						}}
						className="h-auto rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-semibold text-[11px] text-emerald-300 shadow-none transition-all duration-200 hover:scale-[1.04] hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 active:scale-95"
					>
						Complete
					</Button>
				)}
				{showPauseResume && (
					<Button
						size="sm"
						variant="outline"
						onClick={(e) => {
							e.stopPropagation();
							onTogglePause();
						}}
						className="h-auto rounded-md border-[#32353E] bg-[#1C1D21] px-2.5 py-1 font-normal text-[#EDEDED] text-[11px] shadow-none transition-all duration-200 hover:scale-[1.03] hover:bg-[#26282E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/40 active:scale-95"
					>
						{isPaused ? "Resume" : "Pause"}
					</Button>
				)}
				<Button
					size="sm"
					variant="outline"
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
					className="h-auto rounded-md border-[#32353E] bg-[#1C1D21] px-2.5 py-1 font-normal text-[#EDEDED] text-[11px] shadow-none transition-all duration-200 hover:scale-[1.03] hover:bg-[#26282E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/40 active:scale-95"
				>
					Edit
				</Button>
			</div>
		</motion.div>
	);
}
