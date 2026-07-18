import { cn } from "@LE-REMINDER/ui/lib/utils";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { describeTaskType } from "@/lib/describe-task-type";
import { formatLastCompleted } from "@/lib/format-last-completed";
import { StatusShape } from "./status-shape";

export function RoutineListRow({ routine }: { routine: DashboardRoutine }) {
	const isFinished = routine.status === "Finished";

	return (
		<div className="flex items-center gap-4 border-[#f0efed] border-b p-3.5 px-5 last:border-0">
			<div className="flex w-3 shrink-0 items-center justify-center">
				<StatusShape status={routine.status} size={11} />
			</div>
			<div
				className={cn(
					"min-w-40 flex-1 font-semibold text-sm",
					isFinished ? "text-[#78716c] line-through" : "text-[#292524]",
				)}
			>
				{routine.name}
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#57534e] text-[10.5px] uppercase">
				{routine.category}
			</div>
			<div className="w-[180px] shrink-0 font-mono text-[#57534e] text-[11.5px]">
				{describeTaskType(routine.taskType, routine.status)}
			</div>
			<div className="w-[100px] shrink-0 font-mono text-[#57534e] text-[11.5px]">
				{formatLastCompleted(routine.lastCompletedAt)}
			</div>
		</div>
	);
}
