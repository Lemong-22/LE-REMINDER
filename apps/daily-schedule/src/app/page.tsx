"use client";

import { BookOpen, Clock, Coffee, GraduationCap, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGate, useAuth } from "@/components/auth-gate";
import AnimatedList from "@/components/ui/AnimatedList";
import SoftAurora from "@/components/ui/SoftAurora";
import SpotlightCard from "@/components/ui/SpotlightCard";
import type {
	DaySchedule,
	ScheduleEvent,
	ScheduleEventType,
} from "@/lib/schedule-data";
import { parseEventTimeRange } from "@/lib/time-parser";

const TYPE_CONFIG: Record<
	ScheduleEventType,
	{
		label: string;
		categoryName: string;
		badgeClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	class: {
		label: "Academic",
		categoryName: "Class",
		badgeClass: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
		icon: GraduationCap,
	},
	study: {
		label: "Deep Work",
		categoryName: "Study",
		badgeClass: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
		icon: BookOpen,
	},
	routine: {
		label: "Routine",
		categoryName: "Routine",
		badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
		icon: Clock,
	},
	rest: {
		label: "Rest",
		categoryName: "Rest",
		badgeClass:
			"bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
		icon: Coffee,
	},
};

function formatRemainingTime(end: Date, now: Date): string {
	const diffMins = Math.max(
		1,
		Math.round((end.getTime() - now.getTime()) / (1000 * 60)),
	);
	if (diffMins >= 60) {
		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}
	return `${diffMins}m`;
}

function DailyRundownView() {
	const { logout } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [schedules, setSchedules] = useState<readonly DaySchedule[] | null>(
		null,
	);
	const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
	const [scheduleError, setScheduleError] = useState("");

	// Auto-select current real-world day on mount (0 = Sunday, 1 = Monday, etc.)
	const [selectedDay, setSelectedDay] = useState<number>(() =>
		new Date().getDay(),
	);
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

	const liveEventRef = useRef<HTMLDivElement | null>(null);
	const hasAutoScrolledRef = useRef(false);

	const fetchSchedule = useCallback(async () => {
		setIsLoadingSchedule(true);
		setScheduleError("");
		try {
			const res = await fetch("/api/schedule");
			if (!res.ok) {
				throw new Error("Failed to load schedule");
			}
			const data = await res.json();
			if (data.schedule) {
				setSchedules(data.schedule);
			}
		} catch {
			setScheduleError("Unable to load schedule. Please try again.");
		} finally {
			setIsLoadingSchedule(false);
		}
	}, []);

	useEffect(() => {
		fetchSchedule();
	}, [fetchSchedule]);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await logout();
		} finally {
			setIsLoggingOut(false);
		}
	};

	// Battery-efficient visibility-aware ticker: sleeps when phone screen is locked or app is in background
	useEffect(() => {
		let timerId: ReturnType<typeof setTimeout>;

		function tick() {
			setCurrentTime(new Date());
		}

		function scheduleNextTick() {
			// Align to the next exact minute boundary for maximum accuracy and battery sleep
			const now = new Date();
			const msUntilNextMinute =
				(60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
			timerId = setTimeout(() => {
				tick();
				scheduleNextTick();
			}, msUntilNextMinute);
		}

		scheduleNextTick();

		// Power efficiency: When phone screen is turned off or tab hidden, sleep; upon wake-up sync immediately
		function handleVisibilityChange() {
			if (!document.hidden) {
				tick();
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearTimeout(timerId);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	const todayDayOfWeek = currentTime.getDay();
	const isViewingToday = selectedDay === todayDayOfWeek;

	const currentDaySchedule = schedules
		? (schedules.find((d) => d.dayOfWeek === selectedDay) ?? schedules[0])
		: null;

	// Auto-scroll to active live event on mount or when switching to today
	useEffect(() => {
		if (isViewingToday && liveEventRef.current && !hasAutoScrolledRef.current) {
			hasAutoScrolledRef.current = true;
			const timer = setTimeout(() => {
				liveEventRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isViewingToday]);

	// Digital live clock string
	const formattedLiveTime = currentTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// Compute completed, live, and upcoming events for Today's Overview widget
	const totalEvents = currentDaySchedule ? currentDaySchedule.events.length : 0;
	let pastEventsCount = 0;
	const upcomingEvents: ScheduleEvent[] = [];

	if (currentDaySchedule) {
		for (let i = 0; i < currentDaySchedule.events.length; i++) {
			const ev = currentDaySchedule.events[i];
			const nextEv = currentDaySchedule.events[i + 1];
			const range = parseEventTimeRange(ev.time, currentTime, nextEv?.time);

			if (isViewingToday && range) {
				const curMs = currentTime.getTime();
				if (curMs >= range.end.getTime()) {
					pastEventsCount++;
				} else if (curMs < range.start.getTime()) {
					upcomingEvents.push(ev);
				}
			} else if (!isViewingToday) {
				if (i < 3) upcomingEvents.push(ev);
			}
		}
	}

	const completionRate =
		totalEvents > 0 ? Math.round((pastEventsCount / totalEvents) * 100) : 0;

	return (
		<div className="relative min-h-screen bg-[#08090d] text-zinc-200 antialiased selection:bg-amber-500/30 selection:text-amber-200">
			{/* AMBIENT CANVAS BACKGROUND */}
			<div
				aria-hidden
				className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
			>
				<SoftAurora
					color1="#0F1115"
					color2="#1A1F2C"
					speed={0.4}
					brightness={0.8}
					noiseFrequency={2.2}
					noiseAmplitude={1.0}
					bandHeight={0.45}
					bandSpread={1.2}
				/>
				{/* Refined dark vignette for text contrast */}
				<div className="absolute inset-0 bg-radial from-transparent via-[#08090d]/50 to-[#08090d]/90" />
			</div>

			{/* 1. CLEANED MINIMALIST HEADER */}
			<header className="sticky top-0 z-40 border-white/[0.08] border-b bg-[#08090d]/80 px-4 py-3.5 backdrop-blur-2xl sm:px-8">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
					{/* Brand Text Only - Cleaned */}
					<div className="flex items-center gap-1.5 font-bold text-[15px] text-white tracking-tight">
						<span>YOSUA</span>
						<span className="font-mono font-normal text-amber-500/70">
							{"//"}
						</span>
						<span className="font-medium text-zinc-300">SCHEDULE</span>
					</div>

					{/* Right Section: Digital Clock & Logout */}
					<div className="flex items-center gap-2 sm:gap-3">
						{/* Digital Live Clock */}
						<div className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 font-mono text-xs text-zinc-200 shadow-sm backdrop-blur-md">
							<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
							<span className="font-medium text-zinc-100 tabular-nums">
								{formattedLiveTime}
							</span>
						</div>

						{/* Logout Button */}
						<button
							type="button"
							onClick={handleLogout}
							disabled={isLoggingOut}
							title="Sign Out"
							className="group flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-zinc-300 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<LogOut className="size-3.5 text-zinc-400 transition-colors group-hover:text-red-400" />
							<span className="hidden sm:inline">
								{isLoggingOut ? "Exiting..." : "Logout"}
							</span>
						</button>
					</div>
				</div>
			</header>

			{/* MAIN CONTENT AREA */}
			<main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
				{isLoadingSchedule ? (
					<div className="flex flex-1 flex-col items-center justify-center py-28 text-center">
						<div className="size-8 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-400" />
						<p className="mt-4 font-mono text-xs text-zinc-400">
							Loading schedule...
						</p>
					</div>
				) : scheduleError || !currentDaySchedule ? (
					<div className="flex flex-1 flex-col items-center justify-center py-28 text-center">
						<div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 backdrop-blur-xl">
							<p className="text-red-300 text-sm">
								{scheduleError || "Schedule not found"}
							</p>
							<button
								type="button"
								onClick={fetchSchedule}
								className="mt-4 cursor-pointer rounded-xl bg-white px-4 py-2 font-semibold text-black text-xs transition-all hover:bg-neutral-200"
							>
								Retry
							</button>
						</div>
					</div>
				) : (
					<>
						{/* Day Title & Selector */}
						<section className="flex flex-col justify-between gap-4 border-white/[0.06] border-b pb-4 sm:flex-row sm:items-end">
							<div>
								<h1 className="font-extrabold font-sans text-3xl text-white tracking-tight sm:text-4xl">
									{currentDaySchedule.dayName}
								</h1>
								<p className="font-sans text-sm text-zinc-400">
									{totalEvents} scheduled activities
								</p>
							</div>

							{/* Segmented Day Selector with momentum touch scroll */}
							<nav
								aria-label="Day Selector"
								className="scroll-touch overflow-x-auto pb-1"
							>
								<div className="inline-flex items-center gap-1 rounded-2xl border border-white/[0.1] bg-[#121520]/70 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
									{(schedules ?? []).map((schedule) => {
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
												className={`flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs transition-all duration-200 active:scale-95 ${
													isSelected
														? "border border-amber-500/40 bg-gradient-to-r from-amber-600/30 to-orange-600/30 font-bold text-white shadow-[0_0_16px_rgba(245,158,11,0.2)]"
														: "font-medium text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
												}`}
											>
												<span>{schedule.dayName.slice(0, 3)}</span>
												{isToday && (
													<span
														className={`rounded px-1.5 py-0.2 font-mono font-semibold text-[9px] uppercase tracking-wider ${
															isSelected
																? "border border-amber-400/30 bg-amber-400/20 text-amber-300"
																: "bg-white/10 text-zinc-400"
														}`}
													>
														TODAY
													</span>
												)}
											</button>
										);
									})}
								</div>
							</nav>
						</section>

						{/* Two-Column Layout: Events Timeline (8 cols) + Overview Widget (4 cols) */}
						<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
							{/* Primary Timeline Feed */}
							<section className="space-y-3.5 lg:col-span-8">
								<AnimatedList
									items={currentDaySchedule.events}
									showGradients={false}
									enableArrowNavigation={true}
									displayScrollbar={false}
									renderItem={(event: ScheduleEvent, index: number) => {
										const config = TYPE_CONFIG[event.type];
										const Icon = config.icon;

										let isPast = false;
										let isLive = false;
										let remainingStr = "";
										let progressPct = 0;

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
													curMs >= range.start.getTime() &&
													curMs < range.end.getTime();
												if (isLive) {
													remainingStr = formatRemainingTime(
														range.end,
														currentTime,
													);
													const totalMs = Math.max(
														60000,
														range.end.getTime() - range.start.getTime(),
													);
													const elapsedMs = Math.max(
														0,
														curMs - range.start.getTime(),
													);
													progressPct = Math.min(
														100,
														Math.round((elapsedMs / totalMs) * 100),
													);
												}
											}
										}

										return (
											<div
												ref={isLive ? liveEventRef : null}
												className="w-full transition-all duration-300"
											>
												{/* 2. LIVE CARD: DYNAMIC ANIMATED LASER BORDER */}
												{isLive ? (
													<div className="relative overflow-hidden rounded-[24px] p-[2px] shadow-[0_0_30px_rgba(6,182,212,0.25)]">
														{/* Ambient soft glow background */}
														<div className="pointer-events-none absolute inset-0 rounded-[24px] bg-cyan-500/10 blur-md" />

														{/* Outer blurred laser beam aura */}
														<motion.div
															className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[320%] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[8px]"
															style={{
																background:
																	"conic-gradient(from 0deg, transparent 0%, transparent 60%, rgba(6, 182, 212, 0.4) 75%, rgba(14, 165, 233, 0.85) 88%, #38bdf8 96%, transparent 100%)",
															}}
															animate={{ rotate: 360 }}
															transition={{
																repeat: Number.POSITIVE_INFINITY,
																ease: "linear",
																duration: 3.5,
															}}
														/>

														{/* Inner sharp laser beam comet */}
														<motion.div
															className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[320%] -translate-x-1/2 -translate-y-1/2"
															style={{
																background:
																	"conic-gradient(from 0deg, transparent 0%, transparent 68%, rgba(6, 182, 212, 0.3) 78%, rgba(14, 165, 233, 0.8) 88%, #38bdf8 94%, #ffffff 99%, transparent 100%)",
															}}
															animate={{ rotate: 360 }}
															transition={{
																repeat: Number.POSITIVE_INFINITY,
																ease: "linear",
																duration: 3.5,
															}}
														/>

														{/* The inner dark card */}
														<div className="relative z-10 flex h-full w-full flex-col gap-3 rounded-[22px] bg-gradient-to-b from-[#111622] to-[#0A0D14] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
															{/* Card Header: Time & Badges */}
															<div className="flex flex-wrap items-center justify-between gap-3">
																<span className="font-bold font-sans text-2xl text-white tabular-nums tracking-tight sm:text-3xl">
																	{event.time}
																</span>

																<div className="flex items-center gap-2">
																	<span className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/70 px-2.5 py-0.5 font-bold font-mono text-[10px] text-cyan-300 tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.4)]">
																		<span className="size-1.5 animate-ping rounded-full bg-cyan-400" />
																		LIVE NOW
																	</span>
																	<span
																		className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-medium font-mono text-xs ${config.badgeClass}`}
																	>
																		<Icon className="size-3" />
																		<span>{config.categoryName}</span>
																	</span>
																</div>
															</div>

															{/* Title / Activity Only — NO filler text */}
															<div className="font-semibold text-lg text-white leading-snug sm:text-xl">
																{event.activity}
															</div>

															{/* Live Progress Bar */}
															<div className="space-y-1.5 border-white/[0.08] border-t pt-2.5">
																<div className="flex justify-between font-mono text-xs text-zinc-400">
																	<span>{remainingStr} remaining</span>
																	<span className="font-semibold text-cyan-400">
																		{progressPct}% elapsed
																	</span>
																</div>
																<div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
																	<div
																		className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-400 transition-all duration-500"
																		style={{ width: `${progressPct}%` }}
																	/>
																</div>
															</div>
														</div>
													</div>
												) : (
													/* PAST & UPCOMING: ULTRA-GLASSY SPOTLIGHT CARD */
													<SpotlightCard
														className="w-full rounded-[24px]"
														spotlightColor="rgba(255, 255, 255, 0.08)"
													>
														<div
															className={`flex w-full flex-col justify-between gap-2.5 rounded-[24px] border border-white/[0.12] bg-[#121624]/75 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl transition-all duration-200 hover:border-white/[0.22] hover:bg-[#151b2c]/85 sm:p-5 ${
																isPast
																	? "opacity-40 grayscale-[25%] hover:opacity-75"
																	: ""
															}`}
														>
															<div className="flex items-center justify-between gap-3">
																<span className="font-bold font-sans text-white text-xl tabular-nums tracking-tight sm:text-2xl">
																	{event.time}
																</span>
																<span
																	className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-medium font-mono text-xs ${config.badgeClass}`}
																>
																	<Icon className="size-3" />
																	<span>{config.categoryName}</span>
																</span>
															</div>

															{/* Title / Activity Only — NO filler text */}
															<div className="font-medium text-sm text-zinc-200 leading-snug sm:text-base">
																{event.activity}
															</div>
														</div>
													</SpotlightCard>
												)}
											</div>
										);
									}}
								/>
							</section>

							{/* 3. REDESIGNED RIGHT SIDEBAR: TODAY'S OVERVIEW WIDGET */}
							<aside className="lg:col-span-4">
								<SpotlightCard
									className="w-full rounded-[24px]"
									spotlightColor="rgba(245, 158, 11, 0.1)"
								>
									<div className="flex w-full flex-col gap-5 rounded-[24px] border border-white/[0.12] bg-[#121624]/75 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
										{/* Header */}
										<div className="flex items-center justify-between border-white/[0.08] border-b pb-3">
											<h2 className="font-bold text-base text-white tracking-tight">
												Today&apos;s Overview
											</h2>
											<span className="font-mono text-xs text-zinc-400">
												{currentDaySchedule.dayName}
											</span>
										</div>

										{/* Completion Stats & Progress Bar */}
										<div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
											<div className="flex items-baseline justify-between">
												<span className="font-bold font-sans text-2xl text-white sm:text-3xl">
													{pastEventsCount} / {totalEvents}
												</span>
												<span className="font-mono font-semibold text-amber-400 text-sm">
													{completionRate}% Completed
												</span>
											</div>
											<div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
												<div
													className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-500"
													style={{ width: `${completionRate}%` }}
												/>
											</div>
										</div>

										{/* Upcoming 3 Events List */}
										<div className="flex flex-col gap-2.5">
											<span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
												Up Next
											</span>

											{upcomingEvents.length > 0 ? (
												<div className="flex flex-col gap-2">
													{upcomingEvents.slice(0, 3).map((event, idx) => {
														const config = TYPE_CONFIG[event.type];
														return (
															<div
																key={`${event.time}-${idx}`}
																className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
															>
																<div className="flex min-w-0 flex-col gap-0.5">
																	<span className="truncate font-medium text-sm text-zinc-200">
																		{event.activity}
																	</span>
																	<span className="font-mono text-xs text-zinc-400">
																		{event.time}
																	</span>
																</div>
																<span
																	className={`shrink-0 rounded px-2 py-0.5 font-medium font-mono text-[10px] ${config.badgeClass}`}
																>
																	{config.categoryName}
																</span>
															</div>
														);
													})}
												</div>
											) : (
												<div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center text-xs text-zinc-400">
													All scheduled events concluded for today.
												</div>
											)}
										</div>
									</div>
								</SpotlightCard>
							</aside>
						</div>
					</>
				)}
			</main>

			{/* MINIMALIST CLEAN FOOTER */}
			<footer className="mt-16 border-white/[0.06] border-t bg-[#08090d]/80 px-4 py-6 font-mono text-xs text-zinc-500 sm:px-8">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
					<span>YOSUA SCHEDULE</span>
					<span>7-Day Live Tracker</span>
				</div>
			</footer>
		</div>
	);
}

export default function HomePage() {
	return (
		<AuthGate>
			<DailyRundownView />
		</AuthGate>
	);
}
