"use client";

import { cn } from "@LE-REMINDER/ui/lib/utils";
import {
	BookOpen,
	Calendar,
	Clock,
	Dumbbell,
	Moon,
	Radio,
	Utensils,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MASTER_SCHEDULE, type ScheduleEventType } from "@/lib/schedule-data";

const TYPE_CONFIG: Record<
	ScheduleEventType,
	{
		label: string;
		nodeColor: string;
		badgeClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	study: {
		label: "Study & Work",
		nodeColor: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
		badgeClass: "border-sky-500/30 bg-sky-950/40 text-sky-300",
		icon: BookOpen,
	},
	physical: {
		label: "Physical & Gym",
		nodeColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
		badgeClass: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
		icon: Dumbbell,
	},
	meal: {
		label: "Nutrition & Fuel",
		nodeColor: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
		badgeClass: "border-amber-500/30 bg-amber-950/40 text-amber-300",
		icon: Utensils,
	},
	rest: {
		label: "Rest & Recovery",
		nodeColor: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]",
		badgeClass: "border-purple-500/30 bg-purple-950/40 text-purple-300",
		icon: Moon,
	},
};

/**
 * Parses time strings like "08:00 - 09:00", "06:30", "17:00 - dst", "18:30 ke atas"
 * into start and end Date objects on the given referenceDate (today).
 */
function parseEventTimeRange(
	timeStr: string,
	nextTimeStr: string | undefined,
	referenceDate: Date,
): { start: Date; end: Date } | null {
	const matches = Array.from(timeStr.matchAll(/(\d{1,2})[:.](\d{2})/g));
	if (matches.length === 0) return null;

	const startH = Number.parseInt(matches[0][1], 10);
	const startM = Number.parseInt(matches[0][2], 10);

	const start = new Date(referenceDate);
	start.setHours(startH, startM, 0, 0);

	const lower = timeStr.toLowerCase();
	const isUntilEndOfDay = lower.includes("dst") || lower.includes("ke atas");

	if (matches.length >= 2) {
		const endH = Number.parseInt(matches[1][1], 10);
		const endM = Number.parseInt(matches[1][2], 10);
		const end = new Date(referenceDate);
		end.setHours(endH, endM, 0, 0);
		return { start, end };
	}

	if (isUntilEndOfDay) {
		const end = new Date(referenceDate);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	}

	if (nextTimeStr) {
		const nextMatches = Array.from(
			nextTimeStr.matchAll(/(\d{1,2})[:.](\d{2})/g),
		);
		if (nextMatches.length > 0) {
			const nextH = Number.parseInt(nextMatches[0][1], 10);
			const nextM = Number.parseInt(nextMatches[0][2], 10);
			const end = new Date(referenceDate);
			end.setHours(nextH, nextM, 0, 0);
			if (end.getTime() > start.getTime()) {
				return { start, end };
			}
		}
	}

	// Fallback for standalone point in time: 45-minute active window or midnight
	const end = new Date(start.getTime() + 45 * 60 * 1000);
	const endOfDay = new Date(referenceDate);
	endOfDay.setHours(23, 59, 59, 999);
	return { start, end: end.getTime() > endOfDay.getTime() ? endOfDay : end };
}

export function ScheduleView() {
	// Initialize with today's day of week (0 = Sunday, 1 = Monday, etc.)
	const [selectedDay, setSelectedDay] = useState<number>(() =>
		new Date().getDay(),
	);
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

	const liveEventRef = useRef<HTMLDivElement | null>(null);
	const hasAutoScrolledRef = useRef(false);

	// Low-overhead 60-second ticker (0% battery drain, no requestAnimationFrame)
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const todayDayOfWeek = currentTime.getDay();
	const isSelectedDayToday = selectedDay === todayDayOfWeek;

	const currentDaySchedule =
		MASTER_SCHEDULE.find((d) => d.dayOfWeek === selectedDay) ??
		MASTER_SCHEDULE[0];

	// Auto-scroll to active live event on mount or when switching to today
	useEffect(() => {
		if (
			isSelectedDayToday &&
			liveEventRef.current &&
			!hasAutoScrolledRef.current
		) {
			hasAutoScrolledRef.current = true;
			const timer = setTimeout(() => {
				liveEventRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isSelectedDayToday]);

	const eventCountByType = currentDaySchedule.events.reduce(
		(acc, event) => {
			acc[event.type] = (acc[event.type] || 0) + 1;
			return acc;
		},
		{} as Record<ScheduleEventType, number>,
	);

	return (
		<div className="flex flex-col gap-6">
			{/* Day Selector Header */}
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Calendar className="size-5 text-[#3B82F6]" />
						<h2 className="font-extrabold text-[#FFFFFF] text-[18px] tracking-tight">
							Master Schedule
						</h2>
					</div>
					<div className="flex items-center gap-2 font-mono text-[#7888A0] text-xs">
						<span>Daily Rundown</span>
						{isSelectedDayToday && (
							<span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-400">
								<span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
								LIVE
							</span>
						)}
					</div>
				</div>

				{/* Horizontal Scrollable Day Picker */}
				<div className="-mx-2 flex items-center gap-2 overflow-x-auto scroll-smooth px-2 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{MASTER_SCHEDULE.map((schedule) => {
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
								className={cn(
									"relative flex min-h-[44px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl px-4 py-2 text-xs transition-all duration-200 active:scale-95",
									isSelected
										? "border border-cyan-400/50 bg-[#0E1A2D] text-white shadow-[0_0_14px_-2px_rgba(6,182,212,0.35)]"
										: "border border-white/5 bg-[#1A1F2C]/60 text-[#94A3B8] hover:border-white/20 hover:text-[#F1F5F9]",
								)}
							>
								<div className="flex items-center gap-1.5 font-semibold text-[13px]">
									<span>{schedule.dayName}</span>
									{isToday && (
										<span
											className={cn(
												"rounded-full px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider",
												isSelected
													? "bg-cyan-500/20 text-cyan-300"
													: "bg-white/10 text-[#94A3B8]",
											)}
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
				</div>
			</div>

			{/* Day Theme Banner */}
			<div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#1A1F2C]/60 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<span className="font-mono text-cyan-400 text-xs uppercase tracking-wider">
								{currentDaySchedule.dayName}
							</span>
							{isSelectedDayToday && (
								<span className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-950/50 px-2 py-0.5 font-mono text-[10px] text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
									<Radio className="size-2.5 animate-pulse text-cyan-400" />
									Active Day
								</span>
							)}
						</div>
						<h3 className="font-bold text-[#F1F5F9] text-base sm:text-lg">
							{currentDaySchedule.theme}
						</h3>
					</div>

					{/* Quick stats pills */}
					<div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
						{(
							Object.keys(eventCountByType) as readonly ScheduleEventType[]
						).map((type) => {
							const config = TYPE_CONFIG[type];
							const count = eventCountByType[type];
							const Icon = config.icon;
							return (
								<div
									key={type}
									className={cn(
										"flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px]",
										config.badgeClass,
									)}
								>
									<Icon className="size-3" />
									<span>
										{count} {config.label.split(" ")[0]}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Vertical Timeline */}
			<div className="relative ml-3 space-y-4 border-white/10 border-l pl-5 sm:ml-4 sm:pl-7">
				{currentDaySchedule.events.map((event, index) => {
					const config = TYPE_CONFIG[event.type];
					const Icon = config.icon;

					let isPast = false;
					let isLive = false;

					if (isSelectedDayToday) {
						const range = parseEventTimeRange(
							event.time,
							currentDaySchedule.events[index + 1]?.time,
							currentTime,
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
							className={cn(
								"group relative transition-all duration-300",
								isPast && "opacity-45 grayscale-[25%] hover:opacity-75",
							)}
						>
							{/* Node on the timeline track */}
							<div
								className={cn(
									"absolute top-4.5 -left-[25px] size-2.5 rounded-full ring-4 ring-[#131722] transition-all duration-300 sm:-left-[33px]",
									isLive
										? "animate-pulse bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] ring-cyan-500/20"
										: isPast
											? "bg-slate-600 ring-[#131722]"
											: config.nodeColor,
								)}
							/>

							{/* Event Card: Neon Edge wrapper if Live, standard frosted glass if normal/past */}
							{isLive ? (
								<div className="relative rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
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
													className={cn(
														"flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
														config.badgeClass,
													)}
												>
													<Icon className="size-2.5" />
													<span>{config.label.split(" ")[0]}</span>
												</span>
											</div>
										</div>

										<div className="font-semibold text-[14px] text-white leading-relaxed sm:text-[15px]">
											{event.activity}
										</div>
									</div>
								</div>
							) : (
								<div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#1A1F2C]/60 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-200 hover:border-white/15 sm:p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2 font-mono text-sky-400/90 text-xs sm:text-[13px]">
											<Clock className="size-3.5 text-sky-400/70" />
											<span>{event.time}</span>
										</div>
										<span
											className={cn(
												"flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
												config.badgeClass,
											)}
										>
											<Icon className="size-2.5" />
											<span>{config.label.split(" ")[0]}</span>
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
			</div>
		</div>
	);
}
