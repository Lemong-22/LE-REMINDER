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
				"group flex items-center gap-4 border-[#263044] border-b p-3.5 px-5 transition-all duration-200 last:border-0 hover:bg-white/5",
				isCompleted && "opacity-65 hover:opacity-100",
				isDue && "bg-[#252D3E]/40",
			)}
		>
			<div className="relative flex w-3 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
				{isDue && (
					<span
						aria-hidden
						className="absolute -inset-1 animate-ping rounded-full bg-[#F59E0B]/20"
						style={{ animationDuration: "2.5s" }}
					/>
				)}
				<StatusShape status={routine.status} size={11} />
			</div>
			<div className="flex min-w-40 flex-1 items-center gap-1.5 transition-transform duration-200 group-hover:translate-x-0.5">
				{routine.isImportant && (
					<Star className="size-3.5 shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
				)}
				<div
					className={cn(
						"font-semibold text-sm transition-colors duration-150",
						isCompleted
							? "text-[#64748B] line-through"
							: "text-[#F1F5F9] group-hover:text-white",
					)}
				>
					{routine.name}
				</div>
			</div>
			<div className="w-[80px] shrink-0">
				<Badge
					variant="outline"
					className={cn(
						"rounded-full px-2 py-0.5 font-bold font-mono text-[9px] uppercase tracking-[0.05em]",
						routine.isTask
							? "border-[#3B82F6]/60 bg-[#3B82F6]/15 text-[#60A5FA]"
							: "border-[#38445C] bg-[#181E2B]/60 text-[#94A3B8]",
					)}
				>
					{routine.isTask ? "Task" : "Routine"}
				</Badge>
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#94A3B8] text-[10.5px] uppercase">
				{routine.category}
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
