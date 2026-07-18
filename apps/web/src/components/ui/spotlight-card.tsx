"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useRef } from "react";

export function SpotlightCard({
	children,
	className = "",
	spotlightColor = "rgba(255, 255, 255, 0.1)",
}: {
	children: ReactNode;
	className?: string;
	spotlightColor?: string;
}) {
	const divRef = useRef<HTMLDivElement>(null);

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const el = divRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
		el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
		el.style.setProperty("--spotlight-color", spotlightColor);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: decorative mouse-tracked glow; children stay independently interactive
		<div
			ref={divRef}
			onMouseMove={handleMouseMove}
			className={`group relative overflow-hidden ${className}`}
		>
			<div
				className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
				style={
					{
						background:
							"radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 40%)",
						zIndex: 10,
					} as CSSProperties
				}
			/>
			{children}
		</div>
	);
}
