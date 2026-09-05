"use client";

import type { AppRouter } from "@LE-REMINDER/api/routers/index";
import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { GripVertical } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { triggerCyberExplosion } from "@/lib/cyber-explosion";
import { queryClient, trpc } from "@/utils/trpc";

type Todo = inferRouterOutputs<AppRouter>["todo"]["list"][number];

const ACCENT = "#6366F1";

// The row's inner markup, shared by the in-list sortable row and the
// DragOverlay copy so the picked-up item is pixel-identical to the one it
// detached from. The grip is passed in as a node because only the sortable
// row has real drag listeners to attach — the overlay's grip is decorative.
function TodoRowContent({
	todo,
	editMode,
	grip,
	onToggle,
	onDelete,
}: {
	todo: Todo;
	editMode: boolean;
	grip: React.ReactNode;
	onToggle?: (target?: HTMLElement) => void;
	onDelete?: () => void;
}) {
	return (
		<div
			className={cn(
				"group/todo -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 transition-all duration-200 hover:bg-[#26282E]/60",
				todo.done && "opacity-60 hover:opacity-100",
			)}
		>
			{grip}
			<Checkbox
				checked={todo.done}
				onCheckedChange={() => onToggle?.()}
				onClick={(e) => {
					onToggle?.(e.currentTarget);
				}}
				className="size-4 cursor-pointer rounded border-[#484B56] transition-all duration-150 active:scale-90 group-hover/todo:scale-105 data-checked:border-[#6366F1] data-checked:bg-[#6366F1]"
			/>
			<button
				type="button"
				onClick={(e) => {
					onToggle?.(e.currentTarget);
				}}
				className={cn(
					"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-all duration-200 active:scale-[0.99]",
					todo.done
						? "text-[#6E717E] line-through"
						: "text-[#EDEDED] hover:text-[#818CF8]",
				)}
			>
				{todo.text}
			</button>
			{editMode && (
				<button
					type="button"
					onClick={onDelete}
					aria-label={`Remove ${todo.text}`}
					className="cursor-pointer bg-transparent px-1 text-[#636674] text-sm transition-all hover:scale-110 hover:text-[#818CF8] active:scale-90"
				>
					×
				</button>
			)}
		</div>
	);
}

function GripHandle({
	label,
	...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			aria-label={`Reorder ${label}`}
			className="cursor-grab touch-none bg-transparent text-[#636674] active:cursor-grabbing"
			{...props}
		>
			<GripVertical className="size-3.5" />
		</button>
	);
}

// One sortable, animated row. dnd-kit's transform/transition make the
// non-dragged rows slide out of the way smoothly; the dragged row itself
// stays in the list as a low-opacity ghost while the fully-opaque
// DragOverlay copy follows the cursor. framer-motion owns opacity/scale/height
// for mount/unmount and position layout when not dragging.
function SortableTodoRow({
	todo,
	editMode,
	indicator,
	onToggle,
	onDelete,
}: {
	todo: Todo;
	editMode: boolean;
	indicator: "above" | "below" | null;
	onToggle: (target?: HTMLElement) => void;
	onDelete: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: todo.id });

	return (
		<motion.div
			ref={setNodeRef}
			layout={!isDragging ? "position" : false}
			initial={{ opacity: 0, y: -16, scale: 0.95 }}
			animate={{ opacity: isDragging ? 0.3 : 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				scale: 0.8,
				height: 0,
				overflow: "hidden",
				transition: { duration: 0.2 },
			}}
			whileTap={{ scale: 0.98 }}
			transition={{
				layout: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
				duration: 0.2,
			}}
			style={{
				transform: CSS.Transform.toString(transform),
				transition: transition || "transform 250ms cubic-bezier(0.2, 0, 0, 1)",
				position: "relative",
			}}
		>
			{indicator && (
				<span
					aria-hidden
					className={cn(
						"absolute inset-x-0 h-[2px] rounded-full",
						indicator === "above" ? "-top-[6px]" : "-bottom-[6px]",
					)}
					style={{
						background: ACCENT,
						boxShadow: "0 0 6px rgba(99, 102, 241, 0.6)",
					}}
				/>
			)}
			<TodoRowContent
				todo={todo}
				editMode={editMode}
				grip={<GripHandle label={todo.text} {...attributes} {...listeners} />}
				onToggle={onToggle}
				onDelete={onDelete}
			/>
		</motion.div>
	);
}

// Synced via tRPC/Turso (packages/api/src/routers/todo.ts), scoped to the
// signed-in account, so it's the same list across devices/sessions —
// still deliberately not a Routine: plain text, no schedule, no
// computeRoutineStatus involvement (see packages/db/src/schema/todo.ts).
export function TodoSidebar() {
	const [editMode, setEditMode] = useState(false);
	const [newText, setNewText] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const listQueryOptions = trpc.todo.list.queryOptions();
	const todosQuery = useQuery(listQueryOptions);
	const todos = todosQuery.data ?? [];
	const sortedTodos = [...todos].sort((a, b) =>
		a.done === b.done ? 0 : a.done ? 1 : -1,
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function invalidate() {
		queryClient.invalidateQueries(trpc.todo.pathFilter());
	}

	const addMutation = useMutation(
		trpc.todo.add.mutationOptions({ onSuccess: invalidate }),
	);

	// Toggling and reordering are the most frequent interactions, so both
	// get an optimistic update instead of waiting on the Turso round-trip;
	// add/delete stay invalidate-on-success since they're infrequent and
	// the skeleton/list reflow is cheap either way.
	const toggleMutation = useMutation(
		trpc.todo.toggle.mutationOptions({
			onMutate: async ({ todoId }) => {
				await queryClient.cancelQueries(listQueryOptions);
				const previous = queryClient.getQueryData(listQueryOptions.queryKey);
				queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
					old?.map((todo) =>
						todo.id === todoId ? { ...todo, done: !todo.done } : todo,
					),
				);
				return { previous };
			},
			onError: (_error, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(listQueryOptions.queryKey, context.previous);
				}
			},
			onSettled: invalidate,
		}),
	);

	const reorderMutation = useMutation(
		trpc.todo.reorder.mutationOptions({
			onMutate: async ({ todoIds }) => {
				await queryClient.cancelQueries(listQueryOptions);
				const previous = queryClient.getQueryData(listQueryOptions.queryKey);
				if (previous) {
					const byId = new Map(previous.map((todo) => [todo.id, todo]));
					const reordered = todoIds
						.map((id) => byId.get(id))
						.filter((todo): todo is Todo => todo !== undefined);
					queryClient.setQueryData(listQueryOptions.queryKey, reordered);
				}
				return { previous };
			},
			onError: (_error, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(listQueryOptions.queryKey, context.previous);
				}
			},
			onSettled: invalidate,
		}),
	);

	const deleteMutation = useMutation(
		trpc.todo.delete.mutationOptions({ onSuccess: invalidate }),
	);

	function addTodo() {
		const text = newText.trim();
		if (!text) return;
		addMutation.mutate({ text });
		setNewText("");
	}

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	function handleDragOver(event: DragOverEvent) {
		setOverId(event.over ? String(event.over.id) : null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveId(null);
		setOverId(null);

		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = sortedTodos.findIndex((todo) => todo.id === active.id);
		const newIndex = sortedTodos.findIndex((todo) => todo.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(sortedTodos, oldIndex, newIndex);
		reorderMutation.mutate({ todoIds: reordered.map((todo) => todo.id) });
	}

	function handleDragCancel() {
		setActiveId(null);
		setOverId(null);
	}

	// The drop line goes below the hovered row when dragging downward and
	// above it when dragging upward — matching where arrayMove will actually
	// insert the item on drop.
	function indicatorFor(todoId: string): "above" | "below" | null {
		if (!activeId || !overId || overId === activeId || todoId !== overId) {
			return null;
		}
		const activeIndex = sortedTodos.findIndex((todo) => todo.id === activeId);
		const overIndex = sortedTodos.findIndex((todo) => todo.id === overId);
		return overIndex > activeIndex ? "below" : "above";
	}

	const activeTodo = sortedTodos.find((todo) => todo.id === activeId) ?? null;

	return (
		<div className="sticky top-[76px] flex max-h-[calc(100vh-96px)] w-[280px] shrink-0 flex-col gap-3.5 overflow-y-auto rounded-xl border border-[#282A30]/70 bg-gradient-to-br from-[#1C1D21] to-[#1F2126]/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.05)]">
			<div className="flex items-center justify-between">
				<div className="font-extrabold text-[#EDEDED] text-[18px] tracking-[-0.015em]">
					Today's To-Do
				</div>
				<div className="flex items-center gap-2">
					{editMode && sortedTodos.some((t) => t.done) && (
						<button
							type="button"
							onClick={() => {
								for (const t of sortedTodos.filter((item) => item.done)) {
									deleteMutation.mutate({ todoId: t.id });
								}
							}}
							className="cursor-pointer font-semibold text-[#818CF8] text-[11px] hover:underline active:scale-95"
						>
							Clear Done
						</button>
					)}
					<button
						type="button"
						onClick={() => setEditMode((v) => !v)}
						className="cursor-pointer bg-transparent p-0.5 font-semibold text-[#9496A1] text-[11.5px] transition-all duration-150 hover:scale-105 hover:text-[#EDEDED] active:scale-95"
					>
						{editMode ? "Done" : "Edit List"}
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-2.5">
				{!todosQuery.isLoading && sortedTodos.length === 0 && (
					<div className="text-[#9496A1] text-[12.5px]">
						Nothing on your scratchpad.
					</div>
				)}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragOver={handleDragOver}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<SortableContext
						items={sortedTodos.map((todo) => todo.id)}
						strategy={verticalListSortingStrategy}
					>
						<AnimatePresence mode="popLayout" initial={false}>
							{!todosQuery.isLoading &&
								sortedTodos.map((todo) => (
									<SortableTodoRow
										key={todo.id}
										todo={todo}
										editMode={editMode}
										indicator={indicatorFor(todo.id)}
										onToggle={(target) => {
											if (!todo.done && target) {
												triggerCyberExplosion(target);
											}
											toggleMutation.mutate({ todoId: todo.id });
										}}
										onDelete={() => deleteMutation.mutate({ todoId: todo.id })}
									/>
								))}
						</AnimatePresence>
					</SortableContext>
					{/* Portaled to <body>: the sidebar is overflow-y-auto, which
					    would clip an in-place overlay the moment the drag leaves
					    the panel. The overlay copy is the "picked up" item —
					    fully opaque, slightly scaled and shadowed — while the
					    original stays in the list as the 30%-opacity ghost. */}
					{typeof document !== "undefined" &&
						createPortal(
							<DragOverlay>
								{activeTodo && (
									<div className="w-[240px] scale-[1.03] rounded-lg border border-[#282A30] bg-[#1C1D21] px-2 py-1.5 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.6)] transition-transform duration-150">
										<TodoRowContent
											todo={activeTodo}
											editMode={editMode}
											grip={<GripHandle label={activeTodo.text} />}
										/>
									</div>
								)}
							</DragOverlay>,
							document.body,
						)}
				</DndContext>
			</div>

			<div className="flex gap-1.5 border-[#22242A] border-t pt-1">
				<input
					type="text"
					value={newText}
					onChange={(e) => setNewText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") addTodo();
					}}
					placeholder="Add a task…"
					className="min-w-0 flex-1 rounded-lg border border-[#32353E] bg-[#18191E] px-2.5 py-1.5 text-[#EDEDED] text-[12.5px] outline-none transition-all duration-150 focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20"
				/>
				<button
					type="button"
					onClick={addTodo}
					className="cursor-pointer rounded-lg border border-[#6366F1] bg-[#6366F1] px-2.5 py-1.5 font-semibold text-[13px] text-white transition-all duration-150 hover:scale-105 hover:bg-[#4F46E5] active:scale-95"
				>
					+
				</button>
			</div>
		</div>
	);
}
