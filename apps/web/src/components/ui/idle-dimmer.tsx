"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 300_000;
const ACTIVITY_EVENTS = [
	"mousemove",
	"mousedown",
	"touchstart",
	"touchmove",
	"keydown",
] as const;

// Always-on tablet display: after 5 minutes with no touch/mouse/keyboard
// activity, dim the screen (burn-in/glare mitigation for a kiosk-style
// mount). The dim fades in, but clearing it on the next touch is
// deliberately instant rather than animated — an idle screen waking up
// should feel immediate, not like it's still catching up.
export function IdleDimmer({ children }: { children: React.ReactNode }) {
	const [idle, setIdle] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		function resetTimer() {
			setIdle(false);
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
		}

		resetTimer();
		for (const event of ACTIVITY_EVENTS) {
			window.addEventListener(event, resetTimer);
		}

		return () => {
			clearTimeout(timerRef.current);
			for (const event of ACTIVITY_EVENTS) {
				window.removeEventListener(event, resetTimer);
			}
		};
	}, []);

	return (
		<>
			{children}
			{idle && (
				<motion.div
					aria-hidden
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, ease: "easeInOut" }}
					className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
				/>
			)}
		</>
	);
}
