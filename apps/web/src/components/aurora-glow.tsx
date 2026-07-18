"use client";

import { motion } from "framer-motion";

// Hand-built, reactbits.dev-style ambient backdrop (their site is a
// copy-paste gallery, not an installable package) — two soft blurred blobs
// drifting slowly behind the hero, low-opacity so it reads as warmth/depth
// rather than decoration competing with the data.
export function AuroraGlow() {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
			<motion.div
				className="absolute top-[-40%] left-[-10%] size-[380px] rounded-full blur-[90px]"
				style={{ background: "#C2410C33" }}
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
				className="absolute right-[-10%] bottom-[-50%] size-[320px] rounded-full blur-[90px]"
				style={{ background: "#7C3AED26" }}
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
