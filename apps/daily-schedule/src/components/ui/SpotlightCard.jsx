"use client";

import { useEffect, useRef } from "react";
import "./SpotlightCard.css";

const SpotlightCard = ({
	children,
	className = "",
	spotlightColor = "rgba(255, 255, 255, 0.05)",
}) => {
	const divRef = useRef(null);
	const rafRef = useRef(null);

	useEffect(() => {
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	const handleMouseMove = (e) => {
		if (!divRef.current || rafRef.current) return;
		const clientX = e.clientX;
		const clientY = e.clientY;

		rafRef.current = requestAnimationFrame(() => {
			if (divRef.current) {
				const rect = divRef.current.getBoundingClientRect();
				const x = clientX - rect.left;
				const y = clientY - rect.top;
				divRef.current.style.setProperty("--mouse-x", `${x}px`);
				divRef.current.style.setProperty("--mouse-y", `${y}px`);
				divRef.current.style.setProperty("--spotlight-color", spotlightColor);
			}
			rafRef.current = null;
		});
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: mouse spotlight visual effect
		<div
			ref={divRef}
			onMouseMove={handleMouseMove}
			className={`card-spotlight ${className}`}
		>
			{children}
		</div>
	);
};

export default SpotlightCard;
