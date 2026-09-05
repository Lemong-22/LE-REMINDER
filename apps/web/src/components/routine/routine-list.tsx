"use client";

import { Inbox } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { sortByStatus } from "@/lib/sort-routines";
import { RoutineCard } from "./routine-card";

export function RoutineList({
	routines,
	onComplete,
	onEdit,
	onTogglePause,
}: {
	routines: DashboardRoutine[];
	onComplete: (routine: DashboardRoutine) => void;
	onEdit: (routine: DashboardRoutine) => void;
	onTogglePause: (routine: DashboardRoutine) => void;
}) {
	const sorted = sortByStatus(routines);

	if (sorted.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#282A30]/70 border-dashed bg-[#1C1D21]/40 px-6 py-14 text-center">
				<div className="flex size-11 items-center justify-center rounded-full border border-[#282A30] bg-[#18191E]/80 text-[#636674] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
					<Inbox className="size-5 stroke-[1.5]" />
				</div>
				<p className="font-serif text-[#6E717E] text-sm italic">
					No routines yet.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
			<AnimatePresence mode="popLayout" initial={false}>
				{sorted.map((routine) => (
					<motion.div
						key={routine.id}
						layout
						initial={{ opacity: 0, y: -20, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{
							opacity: 0,
							scale: 0.8,
							transition: { duration: 0.2, ease: "easeOut" },
						}}
						transition={{
							layout: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
							opacity: { duration: 0.2 },
							scale: { duration: 0.2 },
						}}
						className="h-full"
					>
						<SpotlightCard
							className="h-full rounded-[10px]"
							spotlightColor="rgba(99, 102, 241, 0.15)"
						>
							<RoutineCard
								routine={routine}
								onComplete={() => onComplete(routine)}
								onEdit={() => onEdit(routine)}
								onTogglePause={() => onTogglePause(routine)}
							/>
						</SpotlightCard>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
