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
				"group relative rounded-[12px] transition-[box-shadow,opacity] duration-200",
				isDue
					? "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_24px_rgba(6,182,212,0.6)]"
					: "border border-white/5 bg-[#1A1F2C]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md hover:border-white/10 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_36px_0_rgba(0,0,0,0.45)]",
				isCompleted && "opacity-65 hover:opacity-100",
			)}
		>
			<div
				className={cn(
					"relative flex h-full w-full flex-col gap-2.5 rounded-[11px] backdrop-blur-md transition-colors duration-200",
					isDue
						? "bg-[#1A1F2C]/95 p-[16px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
						: "bg-transparent p-[17px]",
				)}
			>
				{flipping && (
					<div
						aria-hidden
						className="absolute inset-0 origin-left animate-[sweep-flip_0.4s_ease_forwards] rounded-[11px] bg-emerald-400/[0.14]"
					/>
				)}

				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-[7px]">
						<div className="relative flex items-center justify-center">
							{isDue && (
								<span
									aria-hidden
									className="absolute -inset-1 animate-ping rounded-full bg-cyan-400/35"
									style={{ animationDuration: "2.2s" }}
								/>
							)}
							<StatusShape status={routine.status} />
						</div>
						<div
							className={cn(
								"font-mono font-semibold text-[10.5px]",
								isDue && "animate-pulse text-cyan-300",
							)}
							style={{ color: isDue ? undefined : STATUS_TEXT[routine.status] }}
						>
							{routine.status}
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<Badge
							variant="outline"
							className={cn(
								"rounded-full px-[8px] py-0.5 font-bold font-mono text-[9px] uppercase tracking-[0.06em] transition-all",
								routine.isTask
									? "border-cyan-400/40 bg-[#091528]/90 text-cyan-300 shadow-[0_0_10px_-2px_rgba(6,182,212,0.35)]"
									: "border-blue-500/35 bg-[#080E1C]/90 text-sky-300 shadow-[0_0_10px_-2px_rgba(59,130,246,0.3)]",
							)}
						>
							{routine.isTask ? "Task" : "Routine"}
						</Badge>
						<Badge
							variant="secondary"
							className="rounded-full border border-cyan-500/25 bg-[#091322]/90 px-[9px] py-0.5 font-bold font-mono text-[9.5px] text-cyan-200 uppercase tracking-[0.08em] shadow-[0_0_10px_-3px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.06)]"
						>
							{routine.category}
						</Badge>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					{routine.isImportant && (
						<Star className="size-4 shrink-0 fill-[#F59E0B] text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
					)}
					<div
						className={cn(
							"font-bold text-[15px] tracking-[-0.01em] transition-colors",
							isCompleted ? "text-[#64748B] line-through" : "text-[#FFFFFF]",
						)}
					>
						{routine.name}
					</div>
				</div>

				<div className="flex items-center gap-1.5 font-mono text-[#94A3B8] text-[11.5px]">
					{showMandatoryDot && (
						<span
							aria-hidden
							className={cn(
								"size-1.5 shrink-0 rounded-full",
								isMandatory(routine)
									? "bg-[#FFFFFF] shadow-[0_0_6px_rgba(255,255,255,0.7)]"
									: "border border-[#64748B] bg-transparent",
							)}
						/>
					)}
					<span>{describeTaskType(routine.taskType, routine.status)}</span>
				</div>
				<div className="font-mono text-[#94A3B8] text-[11px]">
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
							className="h-auto rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 font-semibold text-[11px] text-emerald-300 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)] backdrop-blur-xs transition-all duration-200 hover:scale-[1.04] hover:border-emerald-400/60 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 active:scale-95"
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
							className="h-auto rounded-md border border-white/10 bg-[#161C2C]/70 px-2.5 py-1 font-normal text-[11px] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xs transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
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
						className="h-auto rounded-md border border-white/10 bg-[#161C2C]/70 px-2.5 py-1 font-normal text-[11px] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xs transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-95"
					>
						Edit
					</Button>
				</div>
			</div>
		</motion.div>
	);
}
