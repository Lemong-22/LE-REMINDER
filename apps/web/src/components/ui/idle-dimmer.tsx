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

// Small + coarse-pointer, not just coarse-pointer alone — the wall-mounted
// kiosk tablet this was built for is also a touchscreen, so gating on
// touch input by itself would disable the dimmer for its own intended
// device. A phone is both small *and* coarse-pointer; a tablet is
// coarse-pointer but not small. `639px` matches the `sm` breakpoint used
// for the same phone/tablet split in nexus-animation.tsx.
const PHONE_QUERY = "(pointer: coarse) and (max-width: 639px)";

// Always-on tablet display: after 5 minutes with no touch/mouse/keyboard
// activity, dim the screen (burn-in/glare mitigation for a kiosk-style
// mount). Skipped entirely on a phone — leaving the tab/app and coming
// back after the timeout would otherwise show a jarring dark flash for a
// device that was never at risk of screen burn-in in the first place.
// The dim fades in, but clearing it on the next touch is deliberately
// instant rather than animated — an idle screen waking up should feel
// immediate, not like it's still catching up.
export function IdleDimmer({ children }: { children: React.ReactNode }) {
	const [idle, setIdle] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		if (window.matchMedia(PHONE_QUERY).matches) return;

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
