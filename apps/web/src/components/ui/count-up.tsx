"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

export function CountUp({
	to,
	from = 0,
	duration = 2,
	className = "",
}: {
	to: number;
	from?: number;
	duration?: number;
	className?: string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	const motionValue = useMotionValue(from);
	const springValue = useSpring(motionValue, {
		damping: 20 + 40 * (1 / duration),
		stiffness: 100 * (1 / duration),
	});
	const isInView = useInView(ref, { once: true, margin: "0px" });

	useEffect(() => {
		if (isInView) motionValue.set(to);
	}, [isInView, motionValue, to]);

	useEffect(() => {
		return springValue.on("change", (latest) => {
			if (ref.current) ref.current.textContent = `${Math.round(latest)}%`;
		});
	}, [springValue]);

	return (
		<span className={className} ref={ref}>
			{Math.round(from)}%
		</span>
	);
}
