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
	const rafRef = useRef<number | null>(null);

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const el = divRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
		}
		rafRef.current = requestAnimationFrame(() => {
			if (!el) return;
			el.style.setProperty("--mouse-x", `${x}px`);
			el.style.setProperty("--mouse-y", `${y}px`);
			el.style.setProperty("--spotlight-color", spotlightColor);
		});
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: decorative mouse-tracked glow; children stay independently interactive
		<div
			ref={divRef}
			onMouseMove={handleMouseMove}
			className={`group relative ${className}`}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
			>
				<div
					className="absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
					style={
						{
							background:
								"radial-gradient(550px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--spotlight-color, rgba(194, 65, 12, 0.08)), transparent 40%)",
							zIndex: 10,
						} as CSSProperties
					}
				/>
			</div>
			{children}
		</div>
	);
}
