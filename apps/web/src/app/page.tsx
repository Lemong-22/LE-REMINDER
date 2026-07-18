"use client";

import { cn } from "@LE-REMINDER/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Github } from "lucide-react";
import { useState } from "react";
import { HeroPanel } from "@/components/routine/hero-panel";
import { RoutineFormDialog } from "@/components/routine/routine-form-dialog";
import { RoutineList } from "@/components/routine/routine-list";
import { RoutineListRow } from "@/components/routine/routine-list-row";
import { TodoSidebar } from "@/components/todo-sidebar";
import type { DashboardRoutine } from "@/lib/dashboard-routine";
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
				"cursor-pointer whitespace-nowrap border-transparent border-b-2 bg-transparent py-1.5 font-semibold text-sm transition-all",
				active ? "border-[#292524] text-[#292524]" : "text-[#a8a29e]",
			)}
		>
			{children}
		</button>
	);
}

function RoutinesLoadingState() {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="h-[140px] animate-pulse rounded-[10px] border border-[#e7e5e4]/70 bg-[#f5f4f0]/60"
				/>
			))}
		</div>
	);
}

function RoutinesErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-[#e7e5e4] bg-white px-4 py-16 text-center">
			<div className="text-[#57534e] text-sm">
				Couldn't load routines from the database.
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="cursor-pointer rounded-lg border border-[#d6d3d1] bg-white px-3 py-1.5 font-semibold text-[#292524] text-xs hover:border-[#292524]"
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
	const routinesQuery = useQuery(trpc.routine.list.queryOptions({}));
	const routines: DashboardRoutine[] = (routinesQuery.data ?? []).map(
		toDashboardRoutine,
	);

	const [activeTab, setActiveTab] = useState<Tab>("home");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRoutine, setEditingRoutine] = useState<DashboardRoutine | null>(
		null,
	);

	function invalidateRoutines() {
		queryClient.invalidateQueries(trpc.routine.pathFilter());
	}

	const createMutation = useMutation(
		trpc.routine.create.mutationOptions({ onSuccess: invalidateRoutines }),
	);
	const editMutation = useMutation(
		trpc.routine.edit.mutationOptions({ onSuccess: invalidateRoutines }),
	);
	const deleteMutation = useMutation(
		trpc.routine.delete.mutationOptions({ onSuccess: invalidateRoutines }),
	);
	const setPausedMutation = useMutation(
		trpc.routine.setPaused.mutationOptions({ onSuccess: invalidateRoutines }),
	);
	const completeMutation = useMutation(
		trpc.routine.complete.mutationOptions({ onSuccess: invalidateRoutines }),
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
		values: Pick<DashboardRoutine, "name" | "category" | "taskType">,
	) {
		if (editingRoutine) {
			editMutation.mutate({ routineId: editingRoutine.id, ...values });
			return;
		}
		createMutation.mutate(values);
	}

	const sortedRoutines = sortByStatus(routines);

	return (
		<div
			className="min-h-screen text-[#292524]"
			style={{ background: "#FAF9F6" }}
		>
			<div className="sticky top-0 z-20 flex items-center justify-between border-[#e7e5e4] border-b bg-[#FAF9F6] px-10 py-4">
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
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-[#78716c] text-xs transition-colors hover:bg-[#f5f4f0] hover:text-[#292524]"
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
								<div className="flex items-center justify-between">
									<div className="font-extrabold text-[#292524] text-[18px] tracking-[-0.015em]">
										Routines
									</div>
									<button
										type="button"
										onClick={handleOpenCreate}
										className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-[#d6d3d1] bg-white px-[15px] py-2 font-semibold text-[#292524] text-[13px] transition-colors hover:border-[#292524]"
									>
										+ New Routine
									</button>
								</div>

								{routinesQuery.isLoading ? (
									<RoutinesLoadingState />
								) : routinesQuery.isError ? (
									<RoutinesErrorState onRetry={() => routinesQuery.refetch()} />
								) : (
									<RoutineList
										routines={routines}
										onComplete={handleComplete}
										onEdit={handleOpenEdit}
										onTogglePause={handleTogglePause}
									/>
								)}
							</>
						)}

						{activeTab === "all" && (
							<div className="overflow-hidden rounded-xl border border-[#e7e5e4] bg-white">
								{sortedRoutines.map((routine) => (
									<RoutineListRow key={routine.id} routine={routine} />
								))}
							</div>
						)}

						{activeTab === "analytics" && (
							<div className="px-0.5 py-2.5 text-[#57534e] text-sm">
								Analytics is not part of this view yet — Phase 0 is state, not
								history.
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
				onSubmit={handleSubmit}
				onDelete={handleDelete}
			/>
		</div>
	);
}
