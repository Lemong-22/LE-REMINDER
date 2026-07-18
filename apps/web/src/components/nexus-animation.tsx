const ACCENT = "#C2410C";

const MERIDIAN_ANGLES = [0, 60, 120];

const COMET_TRAIL = [
	{ size: 6, opacity: 1, delay: "0s", glow: "0 0 8px 2px rgba(194,65,12,0.7)" },
	{
		size: 4.5,
		opacity: 0.55,
		delay: "-0.22s",
		glow: "0 0 5px 1px rgba(194,65,12,0.4)",
	},
	{ size: 3.2, opacity: 0.32, delay: "-0.44s", glow: "none" },
	{ size: 2.2, opacity: 0.16, delay: "-0.66s", glow: "none" },
];

// Deterministic PRNG so the starfield is identical between server render and
// hydration — Math.random() here would cause a hydration mismatch.
function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(20260718);
const STARS = Array.from({ length: 30 }, (_, i) => ({
	left: rand() * 100,
	top: rand() * 100,
	size: 1 + rand() * 1.6,
	duration: 1.8 + rand() * 2.8,
	delay: rand() * 3,
	accent: i % 5 === 0,
}));

// A spark orbiting inside one ring plane of the sphere. The trail is the
// same spinner several times with a negative animation-delay, which reads
// as an angular offset behind the head — a comet tail for free.
function Comet({
	planeTransform,
	animation,
}: {
	planeTransform: string;
	animation: string;
}) {
	return (
		<div
			className="absolute inset-1"
			style={{ transform: planeTransform, transformStyle: "preserve-3d" }}
		>
			{COMET_TRAIL.map((t) => (
				<div
					key={t.delay}
					className={`absolute inset-0 motion-reduce:animate-none ${animation}`}
					style={{ animationDelay: t.delay }}
				>
					<div
						className="absolute left-1/2 -translate-x-1/2 rounded-full"
						style={{
							width: t.size,
							height: t.size,
							top: -t.size / 2,
							opacity: t.opacity,
							background: ACCENT,
							boxShadow: t.glow,
						}}
					/>
				</div>
			))}
		</div>
	);
}

// Purely decorative "system is alive" motion for the dashboard hero — a
// tumbling 3D wireframe sphere (three meridians + a dashed equator) with
// three comet-trailed sparks orbiting a glowing core, set against a slowly
// drifting field of twinkling stars. Pure CSS transforms; depicts no real
// data, echoing the deterministic-clock feel of computeRoutineStatus.
export function NexusAnimation() {
	return (
		<div
			aria-hidden
			className="relative size-28"
			style={{ perspective: "600px" }}
		>
			<div className="absolute -inset-6 animate-[spin-cw_150s_linear_infinite] motion-reduce:animate-none">
				{STARS.map((s) => (
					<div
						key={`${s.left}-${s.top}`}
						className="nexus-star absolute rounded-full"
						style={
							{
								left: `${s.left}%`,
								top: `${s.top}%`,
								width: s.size,
								height: s.size,
								background: s.accent ? ACCENT : "#a8a29e",
								boxShadow: s.accent
									? "0 0 4px 1px rgba(194,65,12,0.5)"
									: "none",
								"--star-duration": `${s.duration}s`,
								"--star-delay": `${s.delay}s`,
							} as React.CSSProperties
						}
					/>
				))}
			</div>
			<div
				className="absolute inset-2 animate-[nexus-glow_3.4s_ease-in-out_infinite] rounded-full motion-reduce:animate-none"
				style={{
					background:
						"radial-gradient(circle, rgba(194,65,12,0.16), transparent 65%)",
				}}
			/>
			<div
				className="absolute inset-0 animate-[nexus-tumble_16s_linear_infinite] motion-reduce:animate-none"
				style={{ transformStyle: "preserve-3d" }}
			>
				{MERIDIAN_ANGLES.map((angle) => (
					<div
						key={angle}
						className="absolute inset-1 rounded-full border-[#d6d3d1] border-[1.5px]"
						style={{ transform: `rotateY(${angle}deg)` }}
					/>
				))}
				<div
					className="absolute inset-1 rounded-full border-[#a8a29e] border-[1.5px] border-dashed"
					style={{ transform: "rotateX(78deg)" }}
				/>
				<Comet
					planeTransform="rotateY(60deg)"
					animation="animate-[spin-cw_5s_linear_infinite]"
				/>
				<Comet
					planeTransform="rotateX(78deg)"
					animation="animate-[spin-ccw_7s_linear_infinite]"
				/>
				<Comet
					planeTransform="rotateY(120deg)"
					animation="animate-[spin-cw_8.5s_linear_infinite]"
				/>
			</div>
			<div
				className="absolute top-1/2 left-1/2 -m-[5px] size-2.5 animate-[core-pulse_2.6s_ease-in-out_infinite] rounded-full motion-reduce:animate-none"
				style={{
					background: ACCENT,
					boxShadow: "0 0 12px 3px rgba(194,65,12,0.5)",
				}}
			/>
		</div>
	);
}
