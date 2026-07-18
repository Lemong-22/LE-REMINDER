"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function AnimatedItem({
	children,
	index,
}: {
	children: ReactNode;
	index: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={{ duration: 0.2, delay: index * 0.05 }}
			layout
		>
			{children}
		</motion.div>
	);
}
