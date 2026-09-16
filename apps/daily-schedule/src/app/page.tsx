"use client";

import {
	BookOpen,
	CheckCircle2,
	Clock,
	Coffee,
	GraduationCap,
	Headphones,
	ShieldCheck,
	Sparkles,
	Timer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import AnimatedList from "@/components/ui/AnimatedList";
import BorderGlow from "@/components/ui/BorderGlow";
import SoftAurora from "@/components/ui/SoftAurora";
import SpotlightCard from "@/components/ui/SpotlightCard";
import {
	SCHEDULE_DATA,
	type ScheduleEvent,
	type ScheduleEventType,
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
		badgeClass: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25",
		icon: GraduationCap,
	},
	study: {
		label: "Deep Work",
		categoryName: "Study",
		badgeClass: "bg-sky-500/10 text-sky-300 border border-sky-500/25",
		icon: BookOpen,
	},
	routine: {
		label: "Routine",
		categoryName: "Routine",
		badgeClass: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
		icon: Clock,
	},
	rest: {
		label: "Rest & Health",
		categoryName: "Rest",
		badgeClass:
			"bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
		icon: Coffee,
	},
};

function formatDurationMinutes(start: Date, end: Date): string {
	const diffMins = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
	if (diffMins >= 60) {
		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
	}
	return `${diffMins} min`;
}

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
	// Auto-select current real-world day on mount (0 = Sunday, 1 = Monday, etc.)
	const [selectedDay, setSelectedDay] = useState<number>(() =>
		new Date().getDay(),
	);
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

	const liveEventRef = useRef<HTMLDivElement | null>(null);
	const hasAutoScrolledRef = useRef(false);

	// Battery-efficient 60-second ticker (0% battery drain, no continuous rAF in scheduling logic)
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
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isViewingToday]);

	// Digital live clock string
	const formattedLiveTime = currentTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// Compute overall daily progress for today
	let activeEventFound: {
		event: ScheduleEvent;
		index: number;
		range: { start: Date; end: Date };
		progressPct: number;
		remainingStr: string;
	} | null = null;

	if (isViewingToday) {
		for (let i = 0; i < currentDaySchedule.events.length; i++) {
			const ev = currentDaySchedule.events[i];
			const nextEv = currentDaySchedule.events[i + 1];
			const range = parseEventTimeRange(ev.time, currentTime, nextEv?.time);
			if (range) {
				const curMs = currentTime.getTime();
				if (curMs >= range.start.getTime() && curMs < range.end.getTime()) {
					const totalMs = Math.max(
						60000,
						range.end.getTime() - range.start.getTime(),
					);
					const elapsedMs = Math.max(0, curMs - range.start.getTime());
					const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
					activeEventFound = {
						event: ev,
						index: i,
						range,
						progressPct: pct,
						remainingStr: formatRemainingTime(range.end, currentTime),
					};
					break;
				}
			}
		}
	}

	const totalEvents = currentDaySchedule.events.length;
	const pastEventsCount = isViewingToday
		? currentDaySchedule.events.filter((ev, i) => {
				const nextEv = currentDaySchedule.events[i + 1];
				const range = parseEventTimeRange(ev.time, currentTime, nextEv?.time);
				return range && currentTime.getTime() >= range.end.getTime();
			}).length
		: 0;
	const dayProgressPct =
		totalEvents > 0 ? Math.round((pastEventsCount / totalEvents) * 100) : 0;

	return (
		<div className="relative min-h-screen bg-[#08090d] text-zinc-200 antialiased selection:bg-amber-500/30 selection:text-amber-200">
			{/* STAGE 2: AMBIENT CANVAS BACKGROUND (Fixed inset-0 z-[-1]) */}
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
				{/* Subtle dark vignette overlay for readability */}
				<div className="absolute inset-0 bg-radial from-transparent via-[#08090d]/60 to-[#08090d]/95" />
			</div>

			{/* STAGE 5: OJOS GLOBAL HEADER */}
			<header className="sticky top-0 z-40 border-white/[0.07] border-b bg-[#08090d]/85 px-4 py-3 backdrop-blur-xl sm:px-8">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
					{/* Brand & Version Identity */}
					<div className="flex items-center gap-3 sm:gap-4">
						<div className="flex size-8 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-orange-600/30 to-amber-600/10 font-extrabold font-mono text-amber-300 text-xs tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)]">
							OJ
						</div>
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5 font-bold text-[15px] text-white tracking-tight">
								<span>OJOS</span>
								<span className="font-mono font-normal text-amber-500/70">
									{"//"}
								</span>
								<span className="font-medium text-zinc-300">SCHEDULE</span>
							</div>
							<span className="font-mono text-[10px] text-zinc-500 tracking-wider">
								v2.4.0 · PRODUCTION PROTOCOL
							</span>
						</div>
					</div>

					{/* Header Controls: Live Clock & Protocol Status */}
					<div className="flex items-center gap-2.5 sm:gap-3">
						<div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 font-mono text-xs text-zinc-300 shadow-sm">
							<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
							<span className="font-medium text-zinc-100 tabular-nums">
								{formattedLiveTime}
							</span>
							<span className="hidden rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-semibold text-[10px] text-amber-400 sm:inline">
								ACTIVE
							</span>
						</div>

						<div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-400 md:flex">
							<span className="size-1.5 rounded-full bg-emerald-400" />
							<span>SYSTEM NORMAL</span>
						</div>
					</div>
				</div>
			</header>

			{/* MAIN DASHBOARD CONTENT */}
			<main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-8 sm:px-8">
				{/* Hero Schedule Header & Day Progress */}
				<section className="flex flex-col justify-between gap-5 border-white/[0.06] border-b pb-4 lg:flex-row lg:items-end">
					<div className="space-y-1.5">
						<div className="flex items-center gap-2.5">
							<span className="flex items-center gap-2 font-mono font-semibold text-[11px] text-amber-400 uppercase tracking-[0.2em]">
								<span className="inline-block size-1.5 rounded-full bg-amber-400" />
								Daily Schedule Protocol
							</span>
							<span className="text-xs text-zinc-600">•</span>
							<span className="font-mono text-[11px] text-zinc-400">
								Academic & Routine Tracker
							</span>
						</div>
						<div className="flex flex-wrap items-baseline gap-4">
							<h1 className="font-extrabold font-sans text-4xl text-white tracking-tight sm:text-5xl">
								{currentDaySchedule.dayName}
							</h1>
							<span className="font-normal font-sans text-lg text-zinc-400 sm:text-xl">
								{totalEvents} Planned Intervals
							</span>
						</div>
					</div>

					{/* Right: Daily Progress Metric Meter */}
					<div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-zinc-900/70 px-5 py-3.5 shadow-2xl backdrop-blur-xl sm:min-w-[260px]">
						<div className="flex w-full flex-col">
							<div className="mb-1.5 flex items-center justify-between font-mono text-xs text-zinc-400">
								<span>Cycle Progress</span>
								<span className="font-semibold text-amber-400">
									{dayProgressPct}%
								</span>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
								<div
									className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-500"
									style={{ width: `${dayProgressPct}%` }}
								/>
							</div>
							<span className="mt-1.5 font-mono text-[10px] text-zinc-500">
								{pastEventsCount} of {totalEvents} blocks concluded
							</span>
						</div>
					</div>
				</section>

				{/* Day Selector Tabs (iOS Segmented Style in OJOS Palette) */}
				<nav aria-label="Day Selector" className="w-full overflow-x-auto pb-1">
					<div className="inline-flex min-w-full items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-1.5 backdrop-blur-md sm:min-w-0">
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
									className={`flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition-all duration-200 active:scale-95 ${
										isSelected
											? "border border-amber-500/40 bg-gradient-to-r from-amber-600/30 to-orange-600/30 font-bold text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]"
											: "font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
									}`}
								>
									<span>{schedule.dayName.slice(0, 3)}</span>
									{isToday && (
										<span
											className={`rounded px-1.5 py-0.5 font-mono font-semibold text-[9px] uppercase tracking-wider ${
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

				{/* Two-Column Responsive Grid: Main Timeline + Telemetry Dock */}
				<div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
					{/* Primary Column: Chronological Event Cards (8 Cols) */}
					<section className="space-y-4 lg:col-span-8">
						{/* Active Routine Notification Banner */}
						{isViewingToday && activeEventFound && (
							<div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-2.5 font-mono text-amber-300 text-xs shadow-sm">
								<div className="flex items-center gap-2.5">
									<span className="relative flex size-2">
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
										<span className="relative inline-flex size-2 rounded-full bg-amber-400" />
									</span>
									<span className="font-semibold tracking-wide">
										ACTIVE PROTOCOL BLOCK #{activeEventFound.index + 1}
									</span>
								</div>
								<span className="font-mono text-[11px] text-zinc-400">
									Ends in{" "}
									<strong className="font-semibold text-amber-300">
										{activeEventFound.remainingStr}
									</strong>
								</span>
							</div>
						)}

						{/* STAGE 3: TIMELINE ENHANCED WITH ANIMATEDLIST */}
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
								let durationStr = "";
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
										durationStr = formatDurationMinutes(range.start, range.end);
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
										{/* STAGE 4: ULTRA-PREMIUM HERO LIVE CARD (BORDERGLOW) */}
										{isLive ? (
											<BorderGlow
												glowColor="192 100 64"
												animated={true}
												colors={["#06b6d4", "#3b82f6", "#0ea5e9"]}
												backgroundColor="#08090d"
												borderRadius={24}
												glowRadius={36}
												glowIntensity={1.2}
												edgeSensitivity={35}
												className="w-full"
											>
												<div className="flex w-full flex-col gap-4 p-5 sm:p-6">
													{/* Live Card Header */}
													<div className="flex flex-wrap items-start justify-between gap-3">
														<div className="space-y-1">
															<div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 font-bold font-mono text-[10px] text-cyan-300 tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.4)]">
																<span className="size-1.5 animate-ping rounded-full bg-cyan-400" />
																LIVE NOW
															</div>
															<h2 className="font-extrabold font-sans text-2xl text-white tabular-nums tracking-tight sm:text-3xl">
																{event.time}
															</h2>
														</div>

														{/* Tags */}
														<div className="flex items-center gap-2">
															<span
																className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium font-mono text-xs ${config.badgeClass}`}
															>
																<Icon className="size-3.5" />
																<span>{config.categoryName}</span>
															</span>
															{durationStr && (
																<span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-zinc-300">
																	<Timer className="size-3.5 text-cyan-400" />
																	<span>{durationStr}</span>
																</span>
															)}
														</div>
													</div>

													{/* Activity Description */}
													<div>
														<h3 className="font-bold text-lg text-white sm:text-xl">
															{event.activity}
														</h3>
														<p className="mt-1 font-normal text-xs text-zinc-400 leading-relaxed sm:text-sm">
															Active chronological session currently progressing
															under real-time telemetry.
														</p>
													</div>

													{/* Live Elapsed Progress Bar */}
													<div className="space-y-1.5 border-white/[0.08] border-t pt-3">
														<div className="flex justify-between font-mono text-xs text-zinc-400">
															<span>
																Session Progress ({remainingStr} left)
															</span>
															<span className="font-semibold text-cyan-400">
																{progressPct}% elapsed
															</span>
														</div>
														<div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
															<div
																className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-400 transition-all duration-500"
																style={{ width: `${progressPct}%` }}
															/>
														</div>
													</div>
												</div>
											</BorderGlow>
										) : (
											/* STAGE 4: PAST & FUTURE CARDS (SPOTLIGHTCARD) */
											<SpotlightCard
												className="w-full rounded-[24px]"
												spotlightColor="rgba(255, 255, 255, 0.05)"
											>
												<div
													className={`flex w-full flex-col justify-between gap-3.5 rounded-[24px] border border-white/[0.06] bg-[#0c0d11]/80 p-5 backdrop-blur-md transition-all duration-200 hover:border-white/[0.14] sm:p-5 ${
														isPast
															? "opacity-40 grayscale-[25%] hover:opacity-75"
															: ""
													}`}
												>
													<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
														<div className="flex items-center gap-3">
															<span className="font-bold font-sans text-white text-xl tabular-nums tracking-tight sm:text-2xl">
																{event.time}
															</span>
															<span
																className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-medium font-mono text-[11px] ${config.badgeClass}`}
															>
																<Icon className="size-3" />
																<span>{config.categoryName}</span>
															</span>
														</div>

														{durationStr && (
															<span className="self-start rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-400 sm:self-auto">
																{durationStr}
															</span>
														)}
													</div>

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

					{/* Secondary Column: Right Telemetry Dock (4 Cols) */}
					<aside className="space-y-5 lg:col-span-4">
						{/* Widget 1: Focus Audio / Lo-Fi Soundscape */}
						<div className="space-y-4 rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 shadow-2xl backdrop-blur-xl">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
									<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
									<span>Focus Audio</span>
								</div>
								<span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono font-semibold text-[10px] text-amber-400">
									LOSSLESS FLOW
								</span>
							</div>

							{/* Equalizer animation bars */}
							<div className="flex h-9 items-center justify-between gap-1.5 rounded-xl border border-white/[0.04] bg-zinc-950/70 px-3.5 py-2">
								<div className="h-2 w-1 animate-[pulse_1s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-5 w-1 animate-[pulse_0.7s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-3 w-1 animate-[pulse_1.2s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-6 w-1 animate-[pulse_0.9s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-4 w-1 animate-[pulse_1.1s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-7 w-1 animate-[pulse_0.8s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-4 w-1 animate-[pulse_1.3s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-2 w-1 animate-[pulse_0.6s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-5 w-1 animate-[pulse_1.0s_infinite] rounded-full bg-amber-400/80" />
								<div className="h-3 w-1 animate-[pulse_0.9s_infinite] rounded-full bg-amber-400/80" />
							</div>

							<div className="flex items-center justify-between">
								<div>
									<p className="font-semibold text-white text-xs tracking-normal">
										Cyber Synth & Binaural Flow
									</p>
									<p className="font-mono text-[11px] text-zinc-500">
										Channel 04 · 60 BPM Alpha Waves
									</p>
								</div>
								<div className="flex size-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-zinc-300">
									<Headphones className="size-4" />
								</div>
							</div>
						</div>

						{/* Widget 2: Session Metrics */}
						<div className="space-y-4 rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 shadow-2xl backdrop-blur-xl">
							<div className="flex items-center justify-between border-white/[0.06] border-b pb-2.5">
								<h4 className="font-mono font-semibold text-xs text-zinc-300 uppercase tracking-wider">
									Session Metrics
								</h4>
								<span className="font-mono text-[11px] text-zinc-500">
									{currentDaySchedule.dayName}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-2.5">
								<div className="rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3">
									<span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
										Events Total
									</span>
									<p className="mt-0.5 font-bold text-lg text-white">
										{totalEvents}{" "}
										<span className="font-mono font-normal text-xs text-zinc-400">
											items
										</span>
									</p>
								</div>
								<div className="rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3">
									<span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
										Completed
									</span>
									<p className="mt-0.5 font-bold text-emerald-300 text-lg">
										{pastEventsCount}{" "}
										<span className="font-mono font-normal text-xs text-zinc-400">
											done
										</span>
									</p>
								</div>
								<div className="rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3">
									<span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
										Security
									</span>
									<p className="mt-0.5 font-bold text-indigo-300 text-lg">
										Single{" "}
										<span className="font-mono font-normal text-xs text-zinc-400">
											User
										</span>
									</p>
								</div>
								<div className="rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3">
									<span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
										Engine
									</span>
									<p className="mt-0.5 font-bold text-amber-400 text-lg">
										60s{" "}
										<span className="font-mono font-normal text-xs text-zinc-400">
											Ticker
										</span>
									</p>
								</div>
							</div>
						</div>

						{/* Widget 3: Quick Protocol Checklist */}
						<div className="space-y-3 rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 shadow-2xl backdrop-blur-xl">
							<div className="flex items-center justify-between">
								<span className="font-mono font-semibold text-xs text-zinc-300 uppercase tracking-wider">
									Protocol Checklist
								</span>
								<ShieldCheck className="size-3.5 text-amber-400" />
							</div>
							<div className="space-y-2 font-sans text-xs">
								<div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-zinc-950/40 p-2.5 text-zinc-400">
									<CheckCircle2 className="size-3.5 text-emerald-400" />
									<span>Hydration & readiness verification</span>
								</div>
								<div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-zinc-950/40 p-2.5 text-zinc-400">
									<CheckCircle2 className="size-3.5 text-emerald-400" />
									<span>Continuous 60s battery-safe interval</span>
								</div>
								<div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-zinc-950/40 p-2.5 text-zinc-300">
									<Sparkles className="size-3.5 text-amber-400" />
									<span>Active session live glow enabled</span>
								</div>
							</div>
						</div>
					</aside>
				</div>
			</main>

			{/* FOOTER */}
			<footer className="mt-16 border-white/[0.06] border-t bg-[#08090d]/80 px-4 py-6 font-mono text-xs text-zinc-500 sm:px-8">
				<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
					<div className="flex items-center gap-2.5">
						<span className="size-1.5 rounded-full bg-emerald-400" />
						<span>OJOS SCHEDULE TRACKER {"//"} PROTOCOL NORMAL</span>
					</div>
					<div className="flex items-center gap-6">
						<span>React Bits Motion Engine</span>
						<span>·</span>
						<span>OLED + Cyber Ambient UI</span>
					</div>
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
