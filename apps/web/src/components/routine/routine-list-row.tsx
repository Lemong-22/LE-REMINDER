import { Badge } from "@LE-REMINDER/ui/components/badge";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { Star } from "lucide-react";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { describeTaskType } from "@/lib/describe-task-type";
import { formatLastCompleted } from "@/lib/format-last-completed";
import { isStrictlyDueToday } from "@/lib/is-due-today";
import { StatusShape } from "./status-shape";

export function RoutineListRow({ routine }: { routine: DashboardRoutine }) {
	const isFinished = routine.status === "Finished";
	const isCompleted = routine.status === "Done" || isFinished;
	const isDue = isStrictlyDueToday(routine.taskType, routine.status);

	return (
		<div
			className={cn(
				"group flex items-center gap-4 border-white/5 border-b p-3.5 px-5 transition-all duration-200 last:border-0 hover:bg-white/[0.04]",
				isCompleted && "opacity-65 hover:opacity-100",
				isDue &&
					"border-cyan-500/20 bg-cyan-950/25 shadow-[inset_0_0_16px_rgba(6,182,212,0.12)]",
			)}
		>
			<div className="relative flex w-3 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
				{isDue && (
					<span
						aria-hidden
						className="absolute -inset-1 animate-ping rounded-full bg-cyan-400/35"
						style={{ animationDuration: "2.2s" }}
					/>
				)}
				<StatusShape status={routine.status} size={11} />
			</div>
			<div className="flex min-w-40 flex-1 items-center gap-1.5 transition-transform duration-200 group-hover:translate-x-0.5">
				{routine.isImportant && (
					<Star className="size-3.5 shrink-0 fill-[#F59E0B] text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
				)}
				<div
					className={cn(
						"font-semibold text-sm transition-colors duration-150",
						isCompleted
							? "text-[#64748B] line-through"
							: "text-[#FFFFFF] group-hover:text-cyan-200",
					)}
				>
					{routine.name}
				</div>
			</div>
			<div className="w-[80px] shrink-0">
				<Badge
					variant="outline"
					className={cn(
						"rounded-full px-2 py-0.5 font-bold font-mono text-[9px] uppercase tracking-[0.06em] transition-all",
						routine.isTask
							? "border-cyan-400/40 bg-[#091528]/90 text-cyan-300 shadow-[0_0_10px_-2px_rgba(6,182,212,0.3)]"
							: "border-blue-500/35 bg-[#080E1C]/90 text-sky-300 shadow-[0_0_10px_-2px_rgba(59,130,246,0.25)]",
					)}
				>
					{routine.isTask ? "Task" : "Routine"}
				</Badge>
			</div>
			<div className="w-[100px] shrink-0">
				<Badge
					variant="secondary"
					className="rounded-full border border-cyan-500/25 bg-[#091322]/90 px-2 py-0.5 font-bold font-mono text-[9.5px] text-cyan-200 uppercase tracking-[0.08em] shadow-[0_0_10px_-3px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.06)]"
				>
					{routine.category}
				</Badge>
			</div>
			<div className="w-[180px] shrink-0 font-mono text-[#94A3B8] text-[11.5px]">
				{describeTaskType(routine.taskType, routine.status)}
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#94A3B8] text-[11.5px]">
				{formatLastCompleted(routine.lastCompletedAt)}
			</div>
		</div>
	);
}
