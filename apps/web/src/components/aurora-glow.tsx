"use client";

import { motion } from "motion/react";

// Hand-built ambient backdrop — two soft blurred blobs drifting slowly
// behind the hero, low-opacity so it reads as warmth/depth rather than
// decoration competing with the data.
export function AuroraGlow() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
		>
			<motion.div
				className="absolute top-[-40%] left-[-10%] size-[380px] rounded-full blur-[90px] motion-reduce:transform-none"
				style={{ background: "#6366F133", willChange: "transform" }}
				animate={{
					x: [0, 40, -20, 0],
					y: [0, 20, -10, 0],
				}}
				transition={{
					duration: 22,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			/>
			<motion.div
				className="absolute right-[-10%] bottom-[-50%] size-[320px] rounded-full blur-[90px] motion-reduce:transform-none"
				style={{ background: "#2DD4BF26", willChange: "transform" }}
				animate={{
					x: [0, -30, 20, 0],
					y: [0, -20, 10, 0],
				}}
				transition={{
					duration: 26,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			/>
		</div>
	);
}
