"use client";

import type { DayOfWeek } from "@LE-REMINDER/core/domain/schedule";
import type { TaskType } from "@LE-REMINDER/core/domain/task-type";
import { Button } from "@LE-REMINDER/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@LE-REMINDER/ui/components/dialog";
import { Input } from "@LE-REMINDER/ui/components/input";
import { Label } from "@LE-REMINDER/ui/components/label";
import { Switch } from "@LE-REMINDER/ui/components/switch";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { useEffect, useState } from "react";
import type { DashboardRoutine } from "@/lib/dashboard-routine";

const ALL_DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACCENT = "#3B82F6";

interface FormState {
	name: string;
	category: string;
	kind: "OneOff" | "Recurring";
	dueDate: string;
	scheduleType: "FixedCalendar" | "RollingInterval";
	recurrenceKind: "Daily" | "Weekly" | "Monthly";
	daysOfWeek: DayOfWeek[];
	dayOfMonth: number;
	isMandatory: boolean;
	intervalValue: number;
	intervalUnit: "days" | "weeks" | "months";
	isTask: boolean;
	isImportant: boolean;
}

function toFormState(routine: DashboardRoutine | null): FormState {
	const base: FormState = {
		name: routine?.name ?? "",
		category: routine?.category ?? "",
		kind: "Recurring",
		dueDate: "",
		scheduleType: "FixedCalendar",
		recurrenceKind: "Daily",
		daysOfWeek: ["Mon"],
		dayOfMonth: 1,
		isMandatory: true,
		intervalValue: 7,
		intervalUnit: "days",
		isTask: routine?.isTask ?? false,
		isImportant: routine?.isImportant ?? false,
	};

	if (!routine) return base;

	if (routine.taskType.kind === "OneOff") {
		return {
			...base,
			kind: "OneOff",
			dueDate: routine.taskType.dueDate
				? routine.taskType.dueDate.toISOString().slice(0, 10)
				: "",
		};
	}

	const schedule = routine.taskType.schedule;
	if (schedule.type === "RollingInterval") {
		return {
			...base,
			kind: "Recurring",
			scheduleType: "RollingInterval",
			intervalValue: schedule.interval.value,
			intervalUnit: schedule.interval.unit,
		};
	}

	return {
		...base,
		kind: "Recurring",
		scheduleType: "FixedCalendar",
		recurrenceKind: schedule.recurrence.kind,
		daysOfWeek:
			schedule.recurrence.kind === "Weekly"
				? [...schedule.recurrence.daysOfWeek]
				: ["Mon"],
		dayOfMonth:
			schedule.recurrence.kind === "Monthly"
				? schedule.recurrence.dayOfMonth
				: 1,
		isMandatory: schedule.isMandatory,
	};
}

function toTaskType(state: FormState): TaskType {
	if (state.kind === "OneOff") {
		return {
			kind: "OneOff",
			dueDate: state.dueDate ? new Date(`${state.dueDate}T23:59:59.999`) : null,
		};
	}

	if (state.scheduleType === "RollingInterval") {
		return {
			kind: "Recurring",
			schedule: {
				type: "RollingInterval",
				interval: { value: state.intervalValue, unit: state.intervalUnit },
			},
		};
	}

	const recurrence =
		state.recurrenceKind === "Daily"
			? ({ kind: "Daily" } as const)
			: state.recurrenceKind === "Weekly"
				? ({ kind: "Weekly", daysOfWeek: state.daysOfWeek } as const)
				: ({ kind: "Monthly", dayOfMonth: state.dayOfMonth } as const);

	return {
		kind: "Recurring",
		schedule: {
			type: "FixedCalendar",
			recurrence,
			isMandatory: state.isMandatory,
		},
	};
}

function TaskTypeCard({
	selected,
	glyph,
	label,
	description,
	onClick,
}: {
	selected: boolean;
	glyph: React.ReactNode;
	label: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex min-w-[140px] flex-1 cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-200",
				selected
					? "border-[#3B82F6] bg-gradient-to-b from-[#263044] to-[#1E2433] shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3),inset_0_0_0_1px_rgba(59,130,246,0.4)]"
					: "border-[#2E384D]/80 bg-[#1E2433]/90 hover:border-[#64748B] hover:bg-white/5 hover:shadow-xs",
			)}
		>
			<div className="flex items-center justify-between">
				{glyph}
				{selected && <span className="size-1.5 rounded-full bg-[#3B82F6]" />}
			</div>
			<div className="font-semibold text-[#F1F5F9] text-[13.5px]">{label}</div>
			<div className="text-[#94A3B8] text-[11.5px] leading-[1.45]">
				{description}
			</div>
		</button>
	);
}

function Pill({
	selected,
	onClick,
	children,
}: {
	selected: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"cursor-pointer rounded-full border px-3 py-1 font-mono text-[11.5px] transition-all duration-150 active:scale-95",
				selected
					? "border-[#3B82F6] bg-[#3B82F6]/15 font-semibold text-[#60A5FA] shadow-xs"
					: "border-[#38445C] bg-[#1E2433] font-normal text-[#94A3B8] hover:border-[#F1F5F9] hover:text-[#F1F5F9]",
			)}
		>
			{children}
		</button>
	);
}

export function RoutineFormDialog({
	open,
	onOpenChange,
	routine,
	categorySuggestions,
	onSubmit,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	routine: DashboardRoutine | null;
	// Categories are a free-text field (packages/core/src/domain/category.ts
	// — an open string, not a closed enum), so this list is only ever a set
	// of one-tap suggestions, never a validation constraint. Callers derive
	// it from whatever categories already exist across saved routines, so
	// anything the user types once becomes a suggestion the next time they
	// create or edit a routine — no separate "manage categories" screen or
	// table needed for that to work.
	categorySuggestions: string[];
	onSubmit: (values: {
		name: string;
		category: string;
		taskType: TaskType;
		isTask: boolean;
		isImportant: boolean;
	}) => void;
	onDelete?: (routine: DashboardRoutine) => void;
}) {
	const [state, setState] = useState<FormState>(() => toFormState(routine));

	useEffect(() => {
		if (open) setState(toFormState(routine));
	}, [open, routine]);

	function toggleDay(day: DayOfWeek) {
		setState((prev) => ({
			...prev,
			daysOfWeek: prev.daysOfWeek.includes(day)
				? prev.daysOfWeek.filter((d) => d !== day)
				: [...prev.daysOfWeek, day],
		}));
	}

	function handleSubmit() {
		if (!state.name.trim()) return;
		onSubmit({
			name: state.name.trim(),
			category: state.category.trim() || "General",
			taskType: toTaskType(state),
			isTask: state.isTask,
			isImportant: state.isImportant,
		});
		onOpenChange(false);
	}

	const saveEnabled = state.name.trim().length > 0;
	const hasDeadline = state.dueDate !== "";

	useEffect(() => {
		if (!open) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				onOpenChange(false);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onOpenChange]);

	function handleDelete() {
		if (!routine) return;
		onDelete?.(routine);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-[#2E384D] bg-[#1E2433] text-[#F1F5F9] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{routine ? "Edit Routine" : "New Task"}</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label
							htmlFor="routine-name"
							className="font-semibold text-[#94A3B8] text-[11.5px] uppercase tracking-[0.03em]"
						>
							Name
						</Label>
						<Input
							id="routine-name"
							value={state.name}
							onChange={(e) =>
								setState((prev) => ({ ...prev, name: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter" && saveEnabled) {
									e.preventDefault();
									handleSubmit();
								}
							}}
							placeholder="e.g. Server Data Backup"
							className="h-9 rounded-lg border-[#38445C] bg-[#181E2B]/80 text-[#F1F5F9] text-[13px] placeholder-[#64748B] transition-colors focus-visible:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]/30 focus-visible:ring-offset-0"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label
							htmlFor="routine-category"
							className="font-semibold text-[#94A3B8] text-[11.5px] uppercase tracking-[0.03em]"
						>
							Category
						</Label>
						<Input
							id="routine-category"
							value={state.category}
							onChange={(e) =>
								setState((prev) => ({ ...prev, category: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter" && saveEnabled) {
									e.preventDefault();
									handleSubmit();
								}
							}}
							placeholder="e.g. Tech"
							className="h-9 rounded-lg border-[#38445C] bg-[#181E2B]/80 text-[#F1F5F9] text-[13px] placeholder-[#64748B] transition-colors focus-visible:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]/30 focus-visible:ring-offset-0"
						/>
						<div className="flex flex-wrap gap-1.5">
							{categorySuggestions.map((chip) => (
								<Pill
									key={chip}
									selected={state.category === chip}
									onClick={() =>
										setState((prev) => ({ ...prev, category: chip }))
									}
								>
									{chip}
								</Pill>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-3 rounded-xl border border-[#2E384D]/75 bg-[#181E2B]/60 p-3 sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-[#2E384D]/60">
						<label
							htmlFor="is-task-switch"
							className="flex flex-1 cursor-pointer items-center justify-between gap-3 pr-0 sm:pr-4"
						>
							<div className="flex flex-col gap-0.5">
								<span className="font-semibold text-[#F1F5F9] text-[13px]">
									Is Task
								</span>
								<span className="text-[#94A3B8] text-[11.5px]">
									Differentiate assignment from habit routine.
								</span>
							</div>
							<Switch
								id="is-task-switch"
								checked={state.isTask}
								onCheckedChange={(checked) =>
									setState((prev) => ({ ...prev, isTask: checked }))
								}
								className="shrink-0 data-checked:bg-[#3B82F6]"
							/>
						</label>
						<label
							htmlFor="is-important-switch"
							className="flex flex-1 cursor-pointer items-center justify-between gap-3 pt-2 sm:pt-0 sm:pl-4"
						>
							<div className="flex flex-col gap-0.5">
								<span className="font-semibold text-[#F1F5F9] text-[13px]">
									Important
								</span>
								<span className="text-[#94A3B8] text-[11.5px]">
									Flag as high priority for top ranking.
								</span>
							</div>
							<Switch
								id="is-important-switch"
								checked={state.isImportant}
								onCheckedChange={(checked) =>
									setState((prev) => ({ ...prev, isImportant: checked }))
								}
								className="shrink-0 data-checked:bg-[#3B82F6]"
							/>
						</label>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="font-semibold text-[#94A3B8] text-[11.5px] uppercase tracking-[0.03em]">
							Task Type
						</Label>
						<div className="flex flex-wrap gap-2.5">
							<TaskTypeCard
								selected={
									state.kind === "Recurring" &&
									state.scheduleType === "FixedCalendar"
								}
								glyph={
									<div
										className="size-4 rounded-[3px]"
										style={{ background: ACCENT }}
									/>
								}
								label="Fixed Calendar"
								description="Repeats on a schedule — daily, weekly, or a day of month."
								onClick={() =>
									setState((prev) => ({
										...prev,
										kind: "Recurring",
										scheduleType: "FixedCalendar",
									}))
								}
							/>
							<TaskTypeCard
								selected={
									state.kind === "Recurring" &&
									state.scheduleType === "RollingInterval"
								}
								glyph={
									<div
										className="size-4 rounded-full"
										style={{ background: ACCENT }}
									/>
								}
								label="Rolling Interval"
								description="Due a fixed number of days/weeks/months after last done."
								onClick={() =>
									setState((prev) => ({
										...prev,
										kind: "Recurring",
										scheduleType: "RollingInterval",
									}))
								}
							/>
							<TaskTypeCard
								selected={state.kind === "OneOff"}
								glyph={
									<div
										className="size-3.5 rotate-45"
										style={{ background: ACCENT }}
									/>
								}
								label="One-off"
								description="Happens once — with or without a deadline."
								onClick={() =>
									setState((prev) => ({ ...prev, kind: "OneOff" }))
								}
							/>
						</div>
					</div>

					{state.kind === "Recurring" &&
						state.scheduleType === "FixedCalendar" && (
							<div className="flex flex-col gap-3 rounded-[10px] bg-[#181E2B] p-[15px]">
								<div className="flex gap-2">
									<Pill
										selected={state.recurrenceKind === "Daily"}
										onClick={() =>
											setState((prev) => ({ ...prev, recurrenceKind: "Daily" }))
										}
									>
										Daily
									</Pill>
									<Pill
										selected={state.recurrenceKind === "Weekly"}
										onClick={() =>
											setState((prev) => ({
												...prev,
												recurrenceKind: "Weekly",
											}))
										}
									>
										Weekly
									</Pill>
									<Pill
										selected={state.recurrenceKind === "Monthly"}
										onClick={() =>
											setState((prev) => ({
												...prev,
												recurrenceKind: "Monthly",
											}))
										}
									>
										Monthly
									</Pill>
								</div>

								{state.recurrenceKind === "Weekly" && (
									<div className="flex flex-wrap gap-1.5">
										{ALL_DAYS.map((day) => (
											<Pill
												key={day}
												selected={state.daysOfWeek.includes(day)}
												onClick={() => toggleDay(day)}
											>
												{day}
											</Pill>
										))}
									</div>
								)}

								{state.recurrenceKind === "Monthly" && (
									<div className="flex items-center gap-2.5">
										<span className="text-[#94A3B8] text-[12.5px]">
											Day of month
										</span>
										<Input
											type="number"
											min={1}
											max={31}
											value={state.dayOfMonth}
											onChange={(e) =>
												setState((prev) => ({
													...prev,
													dayOfMonth: Number(e.target.value) || 1,
												}))
											}
											className="w-16 rounded-lg border-[#38445C] bg-[#1E2433] text-center font-mono text-[#F1F5F9] text-[13px] transition-colors focus-visible:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]/30 focus-visible:ring-offset-0"
										/>
									</div>
								)}

								<div className="flex items-center justify-between border-[#2E384D] border-t pt-2.5">
									<div className="flex flex-col gap-0.5">
										<span className="font-semibold text-[#F1F5F9] text-[13px]">
											Mandatory
										</span>
										<span className="text-[#94A3B8] text-[11.5px]">
											Missed occurrences stay Overdue until completed.
										</span>
									</div>
									<Switch
										checked={state.isMandatory}
										onCheckedChange={(checked) =>
											setState((prev) => ({ ...prev, isMandatory: checked }))
										}
										className="data-checked:bg-[#3B82F6]"
									/>
								</div>
							</div>
						)}

					{state.kind === "Recurring" &&
						state.scheduleType === "RollingInterval" && (
							<div className="flex items-center gap-2.5 rounded-[10px] bg-[#181E2B] p-[15px]">
								<span className="text-[#CBD5E1] text-[13px]">Every</span>
								<Input
									type="number"
									min={1}
									value={state.intervalValue}
									onChange={(e) =>
										setState((prev) => ({
											...prev,
											intervalValue: Number(e.target.value) || 1,
										}))
									}
									className="w-16 rounded-lg border-[#38445C] bg-[#1E2433] text-center font-mono text-[#F1F5F9] text-[13px] transition-colors focus-visible:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]/30 focus-visible:ring-offset-0"
								/>
								<select
									value={state.intervalUnit}
									onChange={(e) =>
										setState((prev) => ({
											...prev,
											intervalUnit: e.target.value as FormState["intervalUnit"],
										}))
									}
									className="rounded-lg border border-[#38445C] bg-[#1E2433] px-2.5 py-1.5 text-[#F1F5F9] text-[13px] transition-colors focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/30"
								>
									<option value="days">days</option>
									<option value="weeks">weeks</option>
									<option value="months">months</option>
								</select>
							</div>
						)}

					{state.kind === "OneOff" && (
						<div className="flex flex-col gap-3 rounded-[10px] bg-[#181E2B] p-[15px]">
							<div className="flex items-center justify-between">
								<span className="text-[#CBD5E1] text-[13px]">
									Has a deadline
								</span>
								<Switch
									checked={hasDeadline}
									onCheckedChange={(checked) =>
										setState((prev) => ({
											...prev,
											dueDate: checked
												? prev.dueDate || new Date().toISOString().slice(0, 10)
												: "",
										}))
									}
									className="data-checked:bg-[#3B82F6]"
								/>
							</div>
							{hasDeadline && (
								<Input
									type="date"
									value={state.dueDate}
									onChange={(e) =>
										setState((prev) => ({ ...prev, dueDate: e.target.value }))
									}
									className="w-fit rounded-lg border-[#38445C] bg-[#1E2433] px-2.5 py-1.5 font-mono text-[#F1F5F9] text-[12.5px] transition-colors focus-visible:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]/30 focus-visible:ring-offset-0"
								/>
							)}
						</div>
					)}
				</div>

				<DialogFooter className="sm:justify-between">
					{routine ? (
						<Button
							variant="ghost"
							onClick={handleDelete}
							className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
						>
							Delete Routine
						</Button>
					) : (
						<div />
					)}
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={!saveEnabled}
							style={
								saveEnabled
									? { background: ACCENT, borderColor: ACCENT }
									: undefined
							}
						>
							Save Routine
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
