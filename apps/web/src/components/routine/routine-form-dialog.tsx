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
const ACCENT = "#C2410C";

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
				"flex min-w-[150px] flex-1 flex-col gap-1.5 rounded-[10px] border p-[15px] text-left transition-all",
				selected
					? "border-[#C2410C] bg-[#C2410C]/[0.08]"
					: "border-[#C7B79C] bg-[#F7F2E8]",
			)}
		>
			{glyph}
			<div className="font-semibold text-[#2E2318] text-[13.5px]">{label}</div>
			<div className="text-[#5F4F3D] text-[11.5px] leading-[1.4]">
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
				"cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[12px] transition-all",
				selected
					? "border-[#C2410C] bg-[#C2410C]/10 font-semibold text-[#C2410C]"
					: "border-[#C7B79C] bg-[#F7F2E8] font-normal text-[#5F4F3D]",
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

	function handleDelete() {
		if (!routine) return;
		onDelete?.(routine);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-[#D6C9B2] bg-[#F7F2E8] text-[#2E2318] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{routine ? "Edit Routine" : "New Task"}</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label
							htmlFor="routine-name"
							className="font-semibold text-[#5F4F3D] text-[11.5px] uppercase tracking-[0.03em]"
						>
							Name
						</Label>
						<Input
							id="routine-name"
							value={state.name}
							onChange={(e) =>
								setState((prev) => ({ ...prev, name: e.target.value }))
							}
							placeholder="e.g. Server Data Backup"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label
							htmlFor="routine-category"
							className="font-semibold text-[#5F4F3D] text-[11.5px] uppercase tracking-[0.03em]"
						>
							Category
						</Label>
						<Input
							id="routine-category"
							value={state.category}
							onChange={(e) =>
								setState((prev) => ({ ...prev, category: e.target.value }))
							}
							placeholder="e.g. Tech"
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

					<div className="flex flex-col gap-3 border-[#D6C9B2]/60 border-y py-3 sm:flex-row sm:gap-4">
						<div className="flex flex-1 items-center justify-between gap-2">
							<div className="flex flex-col gap-0.5">
								<span className="font-semibold text-[#2E2318] text-[13px]">
									Is Task
								</span>
								<span className="text-[#5F4F3D] text-[11.5px]">
									Differentiate assignment from habit routine.
								</span>
							</div>
							<Switch
								checked={state.isTask}
								onCheckedChange={(checked) =>
									setState((prev) => ({ ...prev, isTask: checked }))
								}
								className="shrink-0 data-checked:bg-[#C2410C]"
							/>
						</div>
						<div className="flex flex-1 items-center justify-between gap-2 border-[#D6C9B2]/60 sm:border-l sm:pl-4">
							<div className="flex flex-col gap-0.5">
								<span className="font-semibold text-[#2E2318] text-[13px]">
									Important
								</span>
								<span className="text-[#5F4F3D] text-[11.5px]">
									Flag as high priority.
								</span>
							</div>
							<Switch
								checked={state.isImportant}
								onCheckedChange={(checked) =>
									setState((prev) => ({ ...prev, isImportant: checked }))
								}
								className="shrink-0 data-checked:bg-[#C2410C]"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="font-semibold text-[#5F4F3D] text-[11.5px] uppercase tracking-[0.03em]">
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
							<div className="flex flex-col gap-3 rounded-[10px] bg-[#F1EBDE] p-[15px]">
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
										<span className="text-[#5F4F3D] text-[12.5px]">
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
											className="w-16 font-mono"
										/>
									</div>
								)}

								<div className="flex items-center justify-between border-[#D6C9B2] border-t pt-2.5">
									<div className="flex flex-col gap-0.5">
										<span className="font-semibold text-[#2E2318] text-[13px]">
											Mandatory
										</span>
										<span className="text-[#5F4F3D] text-[11.5px]">
											Missed occurrences stay Overdue until completed.
										</span>
									</div>
									<Switch
										checked={state.isMandatory}
										onCheckedChange={(checked) =>
											setState((prev) => ({ ...prev, isMandatory: checked }))
										}
										className="data-checked:bg-[#C2410C]"
									/>
								</div>
							</div>
						)}

					{state.kind === "Recurring" &&
						state.scheduleType === "RollingInterval" && (
							<div className="flex items-center gap-2.5 rounded-[10px] bg-[#F1EBDE] p-[15px]">
								<span className="text-[#493B2C] text-[13px]">Every</span>
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
									className="w-16 font-mono"
								/>
								<select
									value={state.intervalUnit}
									onChange={(e) =>
										setState((prev) => ({
											...prev,
											intervalUnit: e.target.value as FormState["intervalUnit"],
										}))
									}
									className="rounded-lg border border-[#C7B79C] bg-[#F7F2E8] px-2.5 py-1.5 text-[#2E2318] text-[13px]"
								>
									<option value="days">days</option>
									<option value="weeks">weeks</option>
									<option value="months">months</option>
								</select>
							</div>
						)}

					{state.kind === "OneOff" && (
						<div className="flex flex-col gap-3 rounded-[10px] bg-[#F1EBDE] p-[15px]">
							<div className="flex items-center justify-between">
								<span className="text-[#493B2C] text-[13px]">
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
									className="data-checked:bg-[#C2410C]"
								/>
							</div>
							{hasDeadline && (
								<Input
									type="date"
									value={state.dueDate}
									onChange={(e) =>
										setState((prev) => ({ ...prev, dueDate: e.target.value }))
									}
									className="w-fit font-mono"
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
							className="text-red-500 hover:bg-red-50 hover:text-red-600"
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
