"use client";

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
			<div className="px-4 py-16 text-center text-[#5F4F3D] text-sm">
				No routines yet.
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
							spotlightColor="rgba(194, 65, 12, 0.08)"
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
