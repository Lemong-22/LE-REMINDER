import { Badge } from "@LE-REMINDER/ui/components/badge";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { Star } from "lucide-react";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { describeTaskType } from "@/lib/describe-task-type";
import { formatLastCompleted } from "@/lib/format-last-completed";
import { StatusShape } from "./status-shape";

export function RoutineListRow({ routine }: { routine: DashboardRoutine }) {
	const isFinished = routine.status === "Finished";

	return (
		<div className="group flex items-center gap-4 border-[#E6DCCA] border-b p-3.5 px-5 transition-colors duration-200 last:border-0 hover:bg-[#EFE7D8]/80">
			<div className="flex w-3 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
				<StatusShape status={routine.status} size={11} />
			</div>
			<div className="flex min-w-40 flex-1 items-center gap-1.5 transition-transform duration-200 group-hover:translate-x-0.5">
				{routine.isImportant && (
					<Star className="size-3.5 shrink-0 fill-[#D97706] text-[#D97706]" />
				)}
				<div
					className={cn(
						"font-semibold text-sm transition-colors duration-150",
						isFinished
							? "text-[#83705A] line-through"
							: "text-[#2E2318] group-hover:text-[#2E2318]",
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
							? "border-[#C2410C]/60 bg-[#C2410C]/10 text-[#C2410C]"
							: "border-[#493B2C]/40 bg-[#493B2C]/5 text-[#493B2C]",
					)}
				>
					{routine.isTask ? "Task" : "Routine"}
				</Badge>
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#5F4F3D] text-[10.5px] uppercase">
				{routine.category}
			</div>
			<div className="w-[180px] shrink-0 font-mono text-[#5F4F3D] text-[11.5px]">
				{describeTaskType(routine.taskType, routine.status)}
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#5F4F3D] text-[11.5px]">
				{formatLastCompleted(routine.lastCompletedAt)}
			</div>
		</div>
	);
}
