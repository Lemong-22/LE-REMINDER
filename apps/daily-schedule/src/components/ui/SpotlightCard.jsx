"use client";

import { useRef } from "react";
import "./SpotlightCard.css";

const SpotlightCard = ({
	children,
	className = "",
	spotlightColor = "rgba(255, 255, 255, 0.05)",
}) => {
	const divRef = useRef(null);

	const handleMouseMove = (e) => {
		if (!divRef.current) return;
		const rect = divRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		divRef.current.style.setProperty("--mouse-x", `${x}px`);
		divRef.current.style.setProperty("--mouse-y", `${y}px`);
		divRef.current.style.setProperty("--spotlight-color", spotlightColor);
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
