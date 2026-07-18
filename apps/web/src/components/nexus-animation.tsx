const ACCENT = "#C2410C";

// Purely decorative "system is alive" motion for the dashboard hero — two
// counter-rotating dashed rings around a pulsing core, echoing the
// deterministic-clock feel of computeRoutineStatus without depicting any
// real data.
export function NexusAnimation() {
	return (
		<div aria-hidden className="relative size-28">
			<div className="absolute inset-0 animate-[spin-cw_13s_linear_infinite] rounded-full border-[#d6d3d1] border-[1.5px] border-dashed" />
			<div className="absolute inset-[18px] animate-[spin-ccw_9s_linear_infinite] rounded-full border-[#a8a29e] border-[1.5px] border-dashed" />
			<div className="absolute inset-9 rounded-full border border-[#e7e5e4]" />
			<div
				className="absolute top-1/2 left-1/2 -m-[5px] size-2.5 animate-[core-pulse_2.6s_ease-in-out_infinite] rounded-full"
				style={{ background: ACCENT }}
			/>
		</div>
	);
}
