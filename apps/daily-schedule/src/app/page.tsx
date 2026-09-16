"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { SCHEDULE_DATA, type ScheduleEventType } from "@/lib/schedule-data";
import { parseEventTimeRange } from "@/lib/time-parser";

const TYPE_CONFIG: Record<
	ScheduleEventType,
	{
		label: string;
		pastelClass: string;
	}
> = {
	class: {
		label: "Class",
		pastelClass: "bg-purple-300 text-purple-950",
	},
	study: {
		label: "Study",
		pastelClass: "bg-blue-300 text-blue-950",
	},
	routine: {
		label: "Routine",
		pastelClass: "bg-amber-300 text-amber-950",
	},
	rest: {
		label: "Rest",
		pastelClass: "bg-green-300 text-green-950",
	},
};

function DailyRundownView() {
	// Auto-select current real-world day on mount (0 = Sunday, 1 = Monday, etc.)
	const [selectedDay, setSelectedDay] = useState<number>(() =>
		new Date().getDay(),
	);
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

	const liveEventRef = useRef<HTMLDivElement | null>(null);
	const hasAutoScrolledRef = useRef(false);

	// Battery-efficient 60-second ticker (0% battery drain, no continuous rAF)
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const todayDayOfWeek = currentTime.getDay();
	const isViewingToday = selectedDay === todayDayOfWeek;

	const currentDaySchedule =
		SCHEDULE_DATA.find((d) => d.dayOfWeek === selectedDay) ?? SCHEDULE_DATA[0];

	// Auto-scroll to active live event on mount or when switching to today
	useEffect(() => {
		if (isViewingToday && liveEventRef.current && !hasAutoScrolledRef.current) {
			hasAutoScrolledRef.current = true;
			const timer = setTimeout(() => {
				liveEventRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isViewingToday]);

	// Format current live time string (e.g., "10:45 AM")
	const formattedTime = currentTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
			{/* OLED Minimalist Header */}
			<header className="flex items-end justify-between pt-2">
				<div className="flex flex-col gap-1">
					<span className="font-mono text-[#666666] text-xs uppercase tracking-widest">
						Daily Schedule
					</span>
					<h1 className="font-bold text-3xl text-white tracking-tight sm:text-4xl">
						{currentDaySchedule.dayName}
					</h1>
				</div>

				<div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#111111] px-3.5 py-1.5 font-mono text-[#888888] text-xs">
					<span className="size-1.5 rounded-full bg-lime-400" />
					<span>{formattedTime}</span>
				</div>
			</header>

			{/* Day Selector — iOS Segmented Control */}
			<nav
				aria-label="Days of week"
				className="no-scrollbar -mx-4 flex snap-x items-center gap-1.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0"
			>
				<div className="flex w-full items-center justify-between gap-1 rounded-full border border-white/[0.06] bg-[#111111] p-1.5">
					{SCHEDULE_DATA.map((schedule) => {
						const isSelected = schedule.dayOfWeek === selectedDay;
						const isToday = schedule.dayOfWeek === todayDayOfWeek;

						return (
							<button
								key={schedule.dayOfWeek}
								type="button"
								onClick={() => {
									setSelectedDay(schedule.dayOfWeek);
									if (schedule.dayOfWeek !== todayDayOfWeek) {
										hasAutoScrolledRef.current = false;
									}
								}}
								className={`relative flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-2 text-xs transition-all duration-200 active:scale-95 ${
									isSelected
										? "bg-[#222222] font-semibold text-white shadow-sm"
										: "font-medium text-[#666666] hover:text-[#A0A0A0]"
								}`}
							>
								<span>{schedule.dayName.slice(0, 3)}</span>
								{isToday && (
									<span
										className={`size-1 rounded-full ${
											isSelected ? "bg-lime-400" : "bg-[#666666]"
										}`}
									/>
								)}
							</button>
						);
					})}
				</div>
			</nav>

			{/* Event Bento Grid / Stack */}
			<section aria-label="Schedule Events" className="flex flex-col gap-3.5">
				{currentDaySchedule.events.map((event, index) => {
					const config = TYPE_CONFIG[event.type];

					let isPast = false;
					let isLive = false;

					if (isViewingToday) {
						const nextEvent = currentDaySchedule.events[index + 1];
						const range = parseEventTimeRange(
							event.time,
							currentTime,
							nextEvent?.time,
						);
						if (range) {
							const curMs = currentTime.getTime();
							isPast = curMs >= range.end.getTime();
							isLive =
								curMs >= range.start.getTime() && curMs < range.end.getTime();
						}
					}

					return (
						<article
							key={`${event.time}-${index}`}
							ref={isLive ? liveEventRef : null}
							className={`relative rounded-[24px] transition-all duration-200 ${
								isLive
									? "bg-lime-400 p-5 text-black shadow-[0_12px_32px_rgba(163,230,53,0.2)]"
									: `border border-white/[0.06] bg-[#111111] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] hover:border-white/[0.12] ${
											isPast ? "opacity-40 hover:opacity-70" : ""
										}`
							}`}
						>
							<div className="flex items-center justify-between gap-3">
								{/* Time — Bold and Primary */}
								<span
									className={`font-bold text-xl tracking-tight sm:text-2xl ${
										isLive ? "text-black" : "text-white"
									}`}
								>
									{event.time}
								</span>

								{/* Badges */}
								<div className="flex items-center gap-1.5">
									{isLive && (
										<span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 font-bold font-mono text-[10px] text-lime-400 tracking-wider">
											<span className="size-1.5 animate-ping rounded-full bg-lime-400" />
											LIVE NOW
										</span>
									)}
									<span
										className={`rounded-full px-2.5 py-0.5 font-semibold text-xs ${
											isLive ? "bg-black/15 text-black" : config.pastelClass
										}`}
									>
										{config.label}
									</span>
								</div>
							</div>

							{/* Activity — Highly Legible Secondary Text */}
							<p
								className={`mt-2 font-medium text-sm leading-relaxed sm:text-base ${
									isLive ? "font-semibold text-black/85" : "text-[#A0A0A0]"
								}`}
							>
								{event.activity}
							</p>
						</article>
					);
				})}
			</section>

			{/* Minimalist Footer */}
			<footer className="mt-6 flex items-center justify-center pb-8 font-mono text-[#444444] text-xs">
				<span>OLED Bento Tracker · 7-Day Live</span>
			</footer>
		</main>
	);
}

export default function HomePage() {
	return (
		<AuthGate>
			<DailyRundownView />
		</AuthGate>
	);
}
