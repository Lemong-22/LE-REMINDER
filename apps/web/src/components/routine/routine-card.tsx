"use client";

import { Badge } from "@LE-REMINDER/ui/components/badge";
import { Button } from "@LE-REMINDER/ui/components/button";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { describeTaskType } from "@/lib/describe-task-type";
import { formatLastCompleted } from "@/lib/format-last-completed";
import { STATUS_TEXT } from "@/lib/status-visual";
import { StatusShape } from "./status-shape";

function isMandatory(routine: DashboardRoutine): boolean {
	return (
		routine.taskType.kind === "Recurring" &&
		routine.taskType.schedule.type === "FixedCalendar" &&
		routine.taskType.schedule.isMandatory
	);
}

const CARD_ENTRANCE = {
	hidden: { opacity: 0, y: 10 },
	visible: { opacity: 1, y: 0 },
};

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
	const isPaused = routine.status === "Paused";
	const showComplete = routine.status === "Overdue" || routine.status === "Due";
	const showPauseResume = !isFinished;
	const showMandatoryDot =
		routine.taskType.kind === "Recurring" &&
		routine.taskType.schedule.type === "FixedCalendar";

	function handleComplete() {
		setFlipping(true);
		setTimeout(() => {
			setFlipping(false);
			onComplete();
		}, 400);
	}

	return (
		<motion.div
			ref={cardRef}
			layout
			variants={CARD_ENTRANCE}
			whileHover={{ y: -2 }}
			transition={{ type: "spring", stiffness: 400, damping: 32 }}
			onClick={() => setRevealed((v) => !v)}
			className="group relative flex flex-col gap-2.5 overflow-hidden rounded-[10px] border border-[#D6C9B2]/70 bg-gradient-to-br from-[#F3ECDD] to-[#EFE7D8]/80 p-[17px] shadow-[0_1px_2px_rgba(41,37,36,0.05),inset_0_0_0_1px_rgba(255,255,255,0.6)] hover:shadow-[0_8px_20px_-4px_rgba(41,37,36,0.15),inset_0_0_0_1px_rgba(255,255,255,0.6)]"
		>
			{flipping && (
				<div
					aria-hidden
					className="absolute inset-0 origin-left animate-[sweep-flip_0.4s_ease_forwards] bg-emerald-400/[0.14]"
				/>
			)}

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-[7px]">
					<StatusShape status={routine.status} />
					<div
						className="font-mono font-semibold text-[10.5px]"
						style={{ color: STATUS_TEXT[routine.status] }}
					>
						{routine.status}
					</div>
				</div>
				<Badge
					variant="secondary"
					className="rounded-full border border-[#D6C9B2] bg-[#E3D8C4]/60 px-[9px] py-0.5 font-bold font-mono text-[#5F4F3D] text-[10px] uppercase tracking-[0.08em]"
				>
					{routine.category}
				</Badge>
			</div>

			<div
				className={cn(
					"font-bold text-[15px] transition-colors",
					isFinished ? "text-[#83705A] line-through" : "text-[#2E2318]",
				)}
			>
				{routine.name}
			</div>

			<div className="flex items-center gap-1.5 font-mono text-[#5F4F3D] text-[11.5px]">
				{showMandatoryDot && (
					<span
						aria-hidden
						className={cn(
							"size-1.5 shrink-0 rounded-full",
							isMandatory(routine)
								? "bg-[#493B2C]"
								: "border border-[#A8967E] bg-transparent",
						)}
					/>
				)}
				<span>{describeTaskType(routine.taskType, routine.status)}</span>
			</div>
			<div className="font-mono text-[#5F4F3D] text-[11px]">
				Last done · {formatLastCompleted(routine.lastCompletedAt)}
			</div>

			<div
				className={cn(
					"pointer-events-none flex gap-1.5 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
					revealed && "pointer-events-auto opacity-100",
				)}
			>
				{showComplete && (
					<Button
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							handleComplete();
						}}
						className="h-auto rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-[11px] text-emerald-700 shadow-none hover:bg-emerald-100"
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
						className="h-auto rounded-md border-[#C7B79C] bg-[#F3ECDD] px-2.5 py-1 font-normal text-[#493B2C] text-[11px] shadow-none hover:bg-[#EDE4D4]"
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
					className="h-auto rounded-md border-[#C7B79C] bg-[#F3ECDD] px-2.5 py-1 font-normal text-[#493B2C] text-[11px] shadow-none hover:bg-[#EDE4D4]"
				>
					Edit
				</Button>
			</div>
		</motion.div>
	);
}
