"use client";

import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import { sortByStatus } from "@/lib/sort-routines";
import { RoutineCard } from "./routine-card";

const GRID_VARIANTS = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.04 },
	},
};

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
		<motion.div
			initial="hidden"
			animate="visible"
			variants={GRID_VARIANTS}
			className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
		>
			{sorted.map((routine) => (
				<SpotlightCard
					key={routine.id}
					className="rounded-[10px]"
					spotlightColor="rgba(194, 65, 12, 0.08)"
				>
					<RoutineCard
						routine={routine}
						onComplete={() => onComplete(routine)}
						onEdit={() => onEdit(routine)}
						onTogglePause={() => onTogglePause(routine)}
					/>
				</SpotlightCard>
			))}
		</motion.div>
	);
}
