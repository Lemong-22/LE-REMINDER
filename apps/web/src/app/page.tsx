"use client";

import type { RoutineView } from "@LE-REMINDER/core/application/routine-view";
import type { RoutineId } from "@LE-REMINDER/core/domain/identity";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { BarChart2, Github, Search, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeroPanel } from "@/components/routine/hero-panel";
import { RoutineFormDialog } from "@/components/routine/routine-form-dialog";
import { RoutineList } from "@/components/routine/routine-list";
import { RoutineListRow } from "@/components/routine/routine-list-row";
import { TodoSidebar } from "@/components/todo-sidebar";
import { buildCategorySuggestions } from "@/lib/category-suggestions";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
import {
	withCompleted,
	withPaused,
	withRemoved,
} from "@/lib/optimistic-routines";
import { sortByStatus } from "@/lib/sort-routines";
import { toDashboardRoutine } from "@/lib/to-dashboard-routine";
import { queryClient, trpc } from "@/utils/trpc";

type Tab = "home" | "all" | "analytics";

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative cursor-pointer whitespace-nowrap rounded-sm px-1 py-1.5 font-semibold text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]/40",
				active ? "text-[#2E2318]" : "text-[#83705A] hover:text-[#2E2318]",
			)}
		>
			{children}
			{active && (
				<motion.div
					layoutId="activeTabUnderline"
					transition={{ type: "spring", stiffness: 450, damping: 35 }}
					className="absolute inset-x-0 -bottom-[17px] h-[2px] rounded-full bg-[#2E2318]"
				/>
			)}
		</button>
	);
}

function RoutinesLoadingState() {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="flex flex-col gap-3 rounded-[10px] border border-[#D6C9B2]/60 bg-[#F7F2E8]/60 p-[17px]"
				>
					<div className="flex items-center justify-between">
						<div className="size-3 animate-pulse rounded-full bg-[#D6C9B2]/80" />
						<div className="h-4 w-16 animate-pulse rounded-full bg-[#D6C9B2]/70" />
					</div>
					<div className="h-5 w-3/4 animate-pulse rounded bg-[#D6C9B2]/80" />
					<div className="h-3.5 w-1/2 animate-pulse rounded bg-[#D6C9B2]/60" />
					<div className="h-3 w-1/3 animate-pulse rounded bg-[#D6C9B2]/40" />
				</div>
			))}
		</div>
	);
}

function RoutinesErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-[#D6C9B2] bg-[#F7F2E8] px-4 py-16 text-center">
			<div className="text-[#5F4F3D] text-sm">
				Couldn't load routines from the database.
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="cursor-pointer rounded-lg border border-[#C7B79C] bg-[#F7F2E8] px-3 py-1.5 font-semibold text-[#2E2318] text-xs transition-colors hover:border-[#2E2318] active:scale-95"
			>
				Retry
			</button>
		</div>
	);
}

// Step 14: real tRPC + Turso backend. Routines and Today's To-Do are both
// server state now (useQuery + mutations, invalidated on writes) — see
// todo-sidebar.tsx. The hero's Daily Task checklist is still a local-only
// scratchpad by design — see hero-panel.tsx.
export default function Home() {
	const router = useRouter();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const listQueryOptions = trpc.routine.list.queryOptions({
		searchQuery: debouncedSearch || undefined,
	});
	const routinesQuery = useQuery(listQueryOptions);
	const routines: DashboardRoutine[] = (routinesQuery.data ?? []).map(
		toDashboardRoutine,
	);

	// proxy.ts only checks that a session cookie is present, not that it's
	// still valid — an expired/revoked session reaches this page and the
	// first protectedProcedure call throws UNAUTHORIZED. Without this, that
	// showed as "Couldn't load routines from the database" with a Retry
	// button that would fail forever, instead of sending the user back to
	// where they can actually fix it.
	useEffect(() => {
		const error = routinesQuery.error;
		if (
			error instanceof TRPCClientError &&
			error.data?.code === "UNAUTHORIZED"
		) {
			router.replace("/login");
		}
	}, [routinesQuery.error, router]);

	const [activeTab, setActiveTab] = useState<Tab>("home");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRoutine, setEditingRoutine] = useState<DashboardRoutine | null>(
		null,
	);

	function invalidateRoutines() {
		queryClient.invalidateQueries(trpc.routine.pathFilter());
	}

	// Shared onMutate/onError plumbing for the three highest-frequency
	// actions (complete/pause/delete are single taps on the main grid —
	// waiting on a Turso round-trip before anything visibly happens reads
	// as broken). create/edit stay invalidate-only: they're dialog-based,
	// lower-frequency, and a temp-id insert isn't worth the complexity.
	async function cancelAndSnapshot() {
		await queryClient.cancelQueries(listQueryOptions);
		return queryClient.getQueryData(listQueryOptions.queryKey);
	}

	function rollback(previous: RoutineView[] | undefined) {
		if (previous) {
			queryClient.setQueryData(listQueryOptions.queryKey, previous);
		}
	}

	const createMutation = useMutation(
		trpc.routine.create.mutationOptions({ onSuccess: invalidateRoutines }),
	);
	const editMutation = useMutation(
		trpc.routine.edit.mutationOptions({ onSuccess: invalidateRoutines }),
	);

	const deleteMutation = useMutation(
		trpc.routine.delete.mutationOptions({
			onMutate: async ({ routineId }) => {
				const previous = await cancelAndSnapshot();
				queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
					old ? withRemoved(old, routineId as RoutineId) : old,
				);
				return { previous };
			},
			onError: (_error, _vars, context) => rollback(context?.previous),
			onSettled: invalidateRoutines,
		}),
	);

	const setPausedMutation = useMutation(
		trpc.routine.setPaused.mutationOptions({
			onMutate: async ({ routineId, isPaused }) => {
				const previous = await cancelAndSnapshot();
				queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
					old
						? withPaused(old, routineId as RoutineId, isPaused, new Date())
						: old,
				);
				return { previous };
			},
			onError: (_error, _vars, context) => rollback(context?.previous),
			onSettled: invalidateRoutines,
		}),
	);

	const completeMutation = useMutation(
		trpc.routine.complete.mutationOptions({
			onMutate: async ({ routineId }) => {
				const previous = await cancelAndSnapshot();
				queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
					old ? withCompleted(old, routineId as RoutineId, new Date()) : old,
				);
				return { previous };
			},
			onError: (_error, _vars, context) => rollback(context?.previous),
			onSettled: invalidateRoutines,
		}),
	);

	function handleComplete(routine: DashboardRoutine) {
		completeMutation.mutate({ routineId: routine.id });
	}

	function handleTogglePause(routine: DashboardRoutine) {
		setPausedMutation.mutate({
			routineId: routine.id,
			isPaused: routine.status !== "Paused",
		});
	}

	function handleOpenCreate() {
		setEditingRoutine(null);
		setDialogOpen(true);
	}

	function handleOpenEdit(routine: DashboardRoutine) {
		setEditingRoutine(routine);
		setDialogOpen(true);
	}

	function handleDelete(routine: DashboardRoutine) {
		deleteMutation.mutate({ routineId: routine.id });
	}

	function handleSubmit(
		values: Pick<
			DashboardRoutine,
			"name" | "category" | "taskType" | "isTask" | "isImportant"
		>,
	) {
		if (editingRoutine) {
			editMutation.mutate({ routineId: editingRoutine.id, ...values });
			return;
		}
		createMutation.mutate(values);
	}

	const allCategories = Array.from(
		new Set(routines.map((r) => r.category).filter(Boolean)),
	);

	const filteredRoutines = selectedCategory
		? routines.filter((r) => r.category === selectedCategory)
		: routines;

	const sortedRoutines = sortByStatus(filteredRoutines);

	return (
		<div
			className="min-h-screen text-[#2E2318]"
			style={{ background: "#EEE7D9" }}
		>
			<div className="sticky top-0 z-20 flex items-center justify-between border-[#D6C9B2] border-b bg-[#EEE7D9] px-10 py-4">
				<div className="w-[180px] font-extrabold text-[19px] tracking-[-0.02em]">
					LE-REMINDER
				</div>
				<div className="flex gap-8">
					<TabButton
						active={activeTab === "home"}
						onClick={() => setActiveTab("home")}
					>
						Home
					</TabButton>
					<TabButton
						active={activeTab === "all"}
						onClick={() => setActiveTab("all")}
					>
						All Tasks
					</TabButton>
					<TabButton
						active={activeTab === "analytics"}
						onClick={() => setActiveTab("analytics")}
					>
						Analytics
					</TabButton>
				</div>
				<div className="flex w-[180px] justify-end">
					<a
						href="https://github.com/Lemong-22/LE-REMINDER.git"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-[#83705A] text-xs transition-colors hover:bg-[#E8DFCD] hover:text-[#2E2318]"
					>
						<Github className="size-4" />
						Lemong-22
					</a>
				</div>
			</div>

			<div className="flex flex-col gap-6 px-10 pt-[26px] pb-14">
				{activeTab === "home" && (
					<HeroPanel routines={routines} onComplete={handleComplete} />
				)}

				<div className="flex items-start gap-[22px]">
					<div className="flex min-w-0 flex-1 flex-col gap-6">
						{activeTab === "home" && (
							<>
								<div className="flex flex-col gap-2.5">
									<div className="flex items-center justify-between gap-4">
										<div className="flex flex-1 items-center gap-4">
											<div className="shrink-0 font-extrabold text-[#2E2318] text-[18px] tracking-[-0.015em]">
												Routines
											</div>
											<div className="relative flex w-full max-w-xs items-center">
												<Search className="pointer-events-none absolute left-3 size-3.5 text-[#A8967E]" />
												<input
													type="text"
													placeholder="Search tasks & routines..."
													value={searchInput}
													onChange={(e) => setSearchInput(e.target.value)}
													className="w-full rounded-lg border border-[#C7B79C] bg-[#F7F2E8] py-1.5 pr-8 pl-8.5 font-sans text-[#2E2318] text-[12.5px] placeholder-[#A8967E] outline-none transition-all duration-200 focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20"
												/>
												{searchInput && (
													<button
														type="button"
														onClick={() => setSearchInput("")}
														className="absolute right-2.5 cursor-pointer text-[#A8967E] transition-colors hover:text-[#2E2318]"
														aria-label="Clear search"
													>
														<X className="size-3.5" />
													</button>
												)}
											</div>
										</div>
										<button
											type="button"
											onClick={handleOpenCreate}
											className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-[#C7B79C] bg-[#F7F2E8] px-[15px] py-2 font-semibold text-[#2E2318] text-[13px] shadow-[0_1px_2px_rgba(41,37,36,0.04)] transition-all duration-200 hover:scale-[1.02] hover:border-[#2E2318] hover:bg-[#F3EDE1] active:scale-95"
										>
											+ New Routine
										</button>
									</div>

									{allCategories.length > 0 && (
										<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
											<button
												type="button"
												onClick={() => setSelectedCategory(null)}
												className={cn(
													"cursor-pointer rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-all duration-150 active:scale-95",
													selectedCategory === null
														? "border-[#2E2318] bg-[#2E2318] font-semibold text-white"
														: "border-[#D6C9B2] bg-[#F7F2E8] text-[#5F4F3D] hover:border-[#2E2318]",
												)}
											>
												All
											</button>
											{allCategories.map((cat) => (
												<button
													key={cat}
													type="button"
													onClick={() =>
														setSelectedCategory(
															selectedCategory === cat ? null : cat,
														)
													}
													className={cn(
														"cursor-pointer rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-all duration-150 active:scale-95",
														selectedCategory === cat
															? "border-[#C2410C] bg-[#C2410C] font-semibold text-white"
															: "border-[#D6C9B2] bg-[#F7F2E8] text-[#5F4F3D] hover:border-[#C2410C]",
													)}
												>
													{cat}
												</button>
											))}
											{(searchInput || selectedCategory) && (
												<span className="ml-2 font-mono text-[#83705A] text-[11px]">
													Showing {sortedRoutines.length} of {routines.length}
												</span>
											)}
										</div>
									)}
								</div>

								{routinesQuery.isLoading ? (
									<RoutinesLoadingState />
								) : routinesQuery.isError ? (
									<RoutinesErrorState onRetry={() => routinesQuery.refetch()} />
								) : sortedRoutines.length === 0 ? (
									<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#D6C9B2] border-dashed bg-[#F7F2E8]/60 px-4 py-12 text-center">
										<div className="font-semibold text-[#2E2318] text-sm">
											No routines match your current filters
										</div>
										<div className="text-[#83705A] text-xs">
											Try clearing your search query or selecting a different
											category.
										</div>
										<button
											type="button"
											onClick={() => {
												setSearchInput("");
												setSelectedCategory(null);
											}}
											className="mt-1.5 cursor-pointer rounded-lg border border-[#C7B79C] bg-[#F7F2E8] px-3 py-1 font-semibold text-[#2E2318] text-xs transition-colors hover:border-[#2E2318] active:scale-95"
										>
											Reset filters
										</button>
									</div>
								) : (
									<RoutineList
										routines={sortedRoutines}
										onComplete={handleComplete}
										onEdit={handleOpenEdit}
										onTogglePause={handleTogglePause}
									/>
								)}
							</>
						)}

						{activeTab === "all" && (
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2.5">
									<div className="flex items-center justify-between gap-4">
										<div className="flex flex-1 items-center gap-4">
											<div className="shrink-0 font-extrabold text-[#2E2318] text-[18px] tracking-[-0.015em]">
												All Tasks
											</div>
											<div className="relative flex w-full max-w-xs items-center">
												<Search className="pointer-events-none absolute left-3 size-3.5 text-[#A8967E]" />
												<input
													type="text"
													placeholder="Search tasks & routines..."
													value={searchInput}
													onChange={(e) => setSearchInput(e.target.value)}
													className="w-full rounded-lg border border-[#C7B79C] bg-[#F7F2E8] py-1.5 pr-8 pl-8.5 font-sans text-[#2E2318] text-[12.5px] placeholder-[#A8967E] outline-none transition-all duration-200 focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20"
												/>
												{searchInput && (
													<button
														type="button"
														onClick={() => setSearchInput("")}
														className="absolute right-2.5 cursor-pointer text-[#A8967E] transition-colors hover:text-[#2E2318]"
														aria-label="Clear search"
													>
														<X className="size-3.5" />
													</button>
												)}
											</div>
										</div>
									</div>

									{allCategories.length > 0 && (
										<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
											<button
												type="button"
												onClick={() => setSelectedCategory(null)}
												className={cn(
													"cursor-pointer rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-all duration-150 active:scale-95",
													selectedCategory === null
														? "border-[#2E2318] bg-[#2E2318] font-semibold text-white"
														: "border-[#D6C9B2] bg-[#F7F2E8] text-[#5F4F3D] hover:border-[#2E2318]",
												)}
											>
												All
											</button>
											{allCategories.map((cat) => (
												<button
													key={cat}
													type="button"
													onClick={() =>
														setSelectedCategory(
															selectedCategory === cat ? null : cat,
														)
													}
													className={cn(
														"cursor-pointer rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-all duration-150 active:scale-95",
														selectedCategory === cat
															? "border-[#C2410C] bg-[#C2410C] font-semibold text-white"
															: "border-[#D6C9B2] bg-[#F7F2E8] text-[#5F4F3D] hover:border-[#C2410C]",
													)}
												>
													{cat}
												</button>
											))}
											{(searchInput || selectedCategory) && (
												<span className="ml-2 font-mono text-[#83705A] text-[11px]">
													Showing {sortedRoutines.length} of {routines.length}
												</span>
											)}
										</div>
									)}
								</div>

								{sortedRoutines.length === 0 ? (
									<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#D6C9B2] border-dashed bg-[#F7F2E8]/60 px-4 py-12 text-center">
										<div className="font-semibold text-[#2E2318] text-sm">
											No routines match your current filters
										</div>
										<button
											type="button"
											onClick={() => {
												setSearchInput("");
												setSelectedCategory(null);
											}}
											className="mt-1.5 cursor-pointer rounded-lg border border-[#C7B79C] bg-[#F7F2E8] px-3 py-1 font-semibold text-[#2E2318] text-xs transition-colors hover:border-[#2E2318] active:scale-95"
										>
											Reset filters
										</button>
									</div>
								) : (
									<div className="overflow-hidden rounded-xl border border-[#D6C9B2] bg-[#F7F2E8]">
										{sortedRoutines.map((routine) => (
											<RoutineListRow key={routine.id} routine={routine} />
										))}
									</div>
								)}
							</div>
						)}

						{activeTab === "analytics" && (
							<div className="flex flex-col gap-5">
								<div className="flex items-center gap-2">
									<BarChart2 className="size-5 text-[#C2410C]" />
									<div className="font-extrabold text-[#2E2318] text-[18px] tracking-[-0.015em]">
										System Analytics
									</div>
								</div>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<div className="flex flex-col gap-1 rounded-xl border border-[#D6C9B2]/70 bg-[#F7F2E8] p-4 shadow-xs">
										<div className="font-mono text-[#83705A] text-[11px] uppercase tracking-wider">
											Total Routines
										</div>
										<div className="font-extrabold text-2xl text-[#2E2318]">
											{routines.length}
										</div>
										<div className="text-[#5F4F3D] text-[11.5px]">
											Configured in your dashboard
										</div>
									</div>
									<div className="flex flex-col gap-1 rounded-xl border border-[#D6C9B2]/70 bg-[#F7F2E8] p-4 shadow-xs">
										<div className="font-mono text-[#83705A] text-[11px] uppercase tracking-wider">
											Cycle Completion
										</div>
										<div className="font-extrabold text-2xl text-[#2E2318]">
											{routines.length > 0
												? Math.round(
														(routines.filter(
															(r) =>
																r.status === "Done" || r.status === "Finished",
														).length /
															routines.length) *
															100,
													)
												: 0}
											%
										</div>
										<div className="text-[#5F4F3D] text-[11.5px]">
											Current period completion
										</div>
									</div>
									<div className="flex flex-col gap-1 rounded-xl border border-[#D6C9B2]/70 bg-[#F7F2E8] p-4 shadow-xs">
										<div className="font-mono text-[#83705A] text-[11px] uppercase tracking-wider">
											Active Categories
										</div>
										<div className="font-extrabold text-2xl text-[#2E2318]">
											{allCategories.length}
										</div>
										<div className="text-[#5F4F3D] text-[11.5px]">
											Distinct routine categories
										</div>
									</div>
								</div>
								<div className="flex items-start gap-3 rounded-xl border border-[#D6C9B2]/60 bg-[#F1EBDE]/80 p-4 text-[#5F4F3D] text-[12.5px]">
									<Sparkles className="mt-0.5 size-4 shrink-0 text-[#C2410C]" />
									<div className="leading-relaxed">
										<strong className="text-[#2E2318]">
											Phase 0 Architecture:
										</strong>{" "}
										LE-REMINDER records every{" "}
										<code className="font-mono text-[#2E2318]">
											CompletionEvent
										</code>{" "}
										directly in your database. Historical charts, consistency
										velocity, and habit streaks will activate in future roadmap
										phases.
									</div>
								</div>
							</div>
						)}
					</div>

					<TodoSidebar />
				</div>
			</div>

			<RoutineFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				routine={editingRoutine}
				categorySuggestions={buildCategorySuggestions(routines)}
				onSubmit={handleSubmit}
				onDelete={handleDelete}
			/>
		</div>
	);
}
