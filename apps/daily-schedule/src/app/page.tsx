"use client";

import {
	BookOpen,
	Calendar,
	Clock,
	Coffee,
	GraduationCap,
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { SCHEDULE_DATA, type ScheduleEventType } from "@/lib/schedule-data";
import { parseEventTimeRange } from "@/lib/time-parser";

const TYPE_CONFIG: Record<
	ScheduleEventType,
	{
		label: string;
		nodeColor: string;
		badgeClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	class: {
		label: "Class",
		nodeColor: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]",
		badgeClass: "border-purple-500/30 bg-purple-950/40 text-purple-300",
		icon: GraduationCap,
	},
	study: {
		label: "Study",
		nodeColor: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
		badgeClass: "border-sky-500/30 bg-sky-950/40 text-sky-300",
		icon: BookOpen,
	},
	routine: {
		label: "Routine",
		nodeColor: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
		badgeClass: "border-amber-500/30 bg-amber-950/40 text-amber-300",
		icon: Clock,
	},
	rest: {
		label: "Rest",
		nodeColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
		badgeClass: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
		icon: Coffee,
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

	// Battery-efficient 60-second ticker (0% battery drain, no requestAnimationFrame)
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

	const eventCountByType = currentDaySchedule.events.reduce(
		(acc, event) => {
			acc[event.type] = (acc[event.type] || 0) + 1;
			return acc;
		},
		{} as Record<ScheduleEventType, number>,
	);

	return (
		<main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
			{/* Ambient top glow */}
			<div
				aria-hidden
				className="pointer-events-none fixed inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
			>
				<div className="h-[220px] w-[500px] rounded-full bg-cyan-500/10 blur-[90px]" />
			</div>

			{/* Header */}
			<header className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<Calendar className="size-5 text-cyan-400" />
					<h1 className="font-extrabold text-2xl text-white tracking-tight drop-shadow-[0_0_12px_rgba(6,182,212,0.3)] sm:text-3xl">
						Daily Rundown
					</h1>
				</div>
				<p className="font-mono text-[#94A3B8] text-xs">
					Personal 7-Day Live Schedule Tracker
				</p>
			</header>

			{/* Day Selector — horizontal scrollable pill row */}
			<nav
				aria-label="Days of week"
				className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
			>
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
							className={`relative flex min-h-[44px] shrink-0 cursor-pointer snap-start flex-col items-center justify-center rounded-xl px-4 py-2 text-xs transition-all duration-200 active:scale-95 ${
								isSelected
									? "bg-cyan-900/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
									: "border border-white/5 bg-[#1A1F2C]/60 text-[#94A3B8] hover:border-white/15 hover:text-[#F1F5F9]"
							}`}
						>
							<div className="flex items-center gap-1.5 font-semibold text-[13px]">
								<span>{schedule.dayName}</span>
								{isToday && (
									<span
										className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider ${
											isSelected
												? "bg-cyan-500/20 text-cyan-300"
												: "bg-white/10 text-[#94A3B8]"
										}`}
									>
										Today
									</span>
								)}
							</div>
							<span className="font-mono text-[#7888A0] text-[10px] opacity-90">
								{schedule.events.length} events
							</span>
						</button>
					);
				})}
			</nav>

			{/* Active Day Summary Card */}
			<section className="relative overflow-hidden rounded-xl border border-white/5 bg-[#1A1F2C]/60 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-0.5">
						<div className="flex items-center gap-2 font-mono text-cyan-400 text-xs uppercase tracking-wider">
							<span>{currentDaySchedule.dayName}</span>
							{isViewingToday && (
								<span className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-950/50 px-2 py-0.5 text-[10px] text-cyan-300">
									<span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
									Active Today
								</span>
							)}
						</div>
						<div className="font-bold text-base text-white sm:text-lg">
							{currentDaySchedule.events.length} Scheduled Activities
						</div>
					</div>

					{/* Category Count Chips */}
					<div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
						{(
							Object.keys(eventCountByType) as readonly ScheduleEventType[]
						).map((type) => {
							const config = TYPE_CONFIG[type];
							const count = eventCountByType[type];
							const Icon = config.icon;
							return (
								<span
									key={type}
									className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${config.badgeClass}`}
								>
									<Icon className="size-3" />
									<span>
										{count} {config.label}
									</span>
								</span>
							);
						})}
					</div>
				</div>
			</section>

			{/* Vertical Timeline */}
			<section
				aria-label="Timeline"
				className="relative ml-3 space-y-4 border-white/10 border-l pl-5 sm:ml-4 sm:pl-7"
			>
				{currentDaySchedule.events.map((event, index) => {
					const config = TYPE_CONFIG[event.type];
					const Icon = config.icon;

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
						<div
							key={`${event.time}-${index}`}
							ref={isLive ? liveEventRef : null}
							className={`group relative transition-all duration-300 ${
								isPast ? "opacity-40 grayscale-[30%] hover:opacity-75" : ""
							}`}
						>
							{/* Timeline Node on vertical track */}
							<div
								className={`absolute top-4.5 -left-[25px] size-2.5 rounded-full ring-4 ring-[#0F1115] transition-all duration-300 sm:-left-[33px] ${
									isLive
										? "animate-pulse bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)] ring-cyan-500/30"
										: isPast
											? "bg-slate-600 ring-[#0F1115]"
											: config.nodeColor
								}`}
							/>

							{/* Live event card gets the Neon Edge wrapper, otherwise standard glassmorphism card */}
							{isLive ? (
								<div className="relative rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.3)]">
									<div className="flex flex-col gap-2 rounded-[11px] bg-[#1A1F2C]/90 p-3.5 backdrop-blur-md transition-all duration-200 sm:p-4">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-2 font-mono font-semibold text-cyan-300 text-xs sm:text-[13px]">
												<Clock className="size-3.5 animate-pulse text-cyan-400" />
												<span>{event.time}</span>
											</div>
											<div className="flex items-center gap-1.5">
												<span className="flex items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-950/60 px-2 py-0.5 font-bold font-mono text-[9.5px] text-cyan-300 tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.5)]">
													<span className="size-1.5 animate-ping rounded-full bg-cyan-400" />
													LIVE NOW
												</span>
												<span
													className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${config.badgeClass}`}
												>
													<Icon className="size-2.5" />
													<span>{config.label}</span>
												</span>
											</div>
										</div>

										<div className="font-semibold text-[14px] text-white leading-relaxed sm:text-[15px]">
											{event.activity}
										</div>
									</div>
								</div>
							) : (
								<div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#1A1F2C]/80 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-200 hover:border-white/15 sm:p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2 font-mono text-sky-400/90 text-xs sm:text-[13px]">
											<Clock className="size-3.5 text-sky-400/70" />
											<span>{event.time}</span>
										</div>
										<span
											className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${config.badgeClass}`}
										>
											<Icon className="size-2.5" />
											<span>{config.label}</span>
										</span>
									</div>

									<div className="font-medium text-[13.5px] text-white leading-relaxed sm:text-[14.5px]">
										{event.activity}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</section>

			{/* Footer */}
			<footer className="mt-8 flex items-center justify-center gap-1.5 pb-6 font-mono text-[#64748B] text-xs">
				<Sparkles className="size-3 text-cyan-500/70" />
				<span>Daily Schedule Tracker · Lightweight & Battery Efficient</span>
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
