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
import { queryClient, trpc } from "@/utils/trpc";

type Todo = inferRouterOutputs<AppRouter>["todo"]["list"][number];

const ACCENT = "#C2410C";

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
	onToggle?: () => void;
	onDelete?: () => void;
}) {
	return (
		<div className="flex items-center gap-2">
			{grip}
			<Checkbox
				checked={todo.done}
				onCheckedChange={onToggle}
				className="size-4 rounded border-[#9A876C] data-checked:border-[#2E2318] data-checked:bg-[#2E2318]"
			/>
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-all",
					todo.done ? "text-[#A8967E] line-through" : "text-[#2E2318]",
				)}
			>
				{todo.text}
			</button>
			{editMode && (
				<button
					type="button"
					onClick={onDelete}
					aria-label={`Remove ${todo.text}`}
					className="cursor-pointer bg-transparent px-0.5 text-[#A8967E] text-sm"
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
			className="cursor-grab touch-none bg-transparent text-[#C7B79C] active:cursor-grabbing"
			{...props}
		>
			<GripVertical className="size-3.5" />
		</button>
	);
}

// One sortable, animated row. dnd-kit's transform/transition make the
// non-dragged rows slide out of the way smoothly; the dragged row itself
// stays in the list as a low-opacity ghost while the fully-opaque
// DragOverlay copy follows the cursor. framer-motion owns opacity/y purely
// for mount/unmount (deliberately no `layout` prop: framer-motion's own
// FLIP-based position animation would fight with dnd-kit's transform on
// the same node during a drag). `indicator` draws an accent line in the
// gap above/below the row currently hovered as the drop target — absolutely
// positioned into the list's 10px gap rather than a conditional border, so
// it never shifts layout by its own height.
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
	onToggle: () => void;
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
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={{ duration: 0.2 }}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
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
					style={{ background: ACCENT }}
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

		const oldIndex = todos.findIndex((todo) => todo.id === active.id);
		const newIndex = todos.findIndex((todo) => todo.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(todos, oldIndex, newIndex);
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
		const activeIndex = todos.findIndex((todo) => todo.id === activeId);
		const overIndex = todos.findIndex((todo) => todo.id === overId);
		return overIndex > activeIndex ? "below" : "above";
	}

	const activeTodo = todos.find((todo) => todo.id === activeId) ?? null;

	return (
		<div className="sticky top-[76px] flex max-h-[calc(100vh-96px)] w-[280px] shrink-0 flex-col gap-3.5 overflow-y-auto rounded-xl border border-[#D6C9B2]/70 bg-gradient-to-br from-[#F7F2E8] to-[#F3EDE1]/80 p-5 shadow-[0_1px_2px_rgba(41,37,36,0.05),inset_0_0_0_1px_rgba(255,255,255,0.6)]">
			<div className="flex items-center justify-between">
				<div className="font-extrabold text-[#2E2318] text-[18px] tracking-[-0.015em]">
					Today's To-Do
				</div>
				<button
					type="button"
					onClick={() => setEditMode((v) => !v)}
					className="cursor-pointer bg-transparent p-0.5 font-semibold text-[#83705A] text-[11.5px]"
				>
					{editMode ? "Done" : "Edit List"}
				</button>
			</div>

			<div className="flex flex-col gap-2.5">
				{!todosQuery.isLoading && todos.length === 0 && (
					<div className="text-[#5F4F3D] text-[12.5px]">
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
						items={todos.map((todo) => todo.id)}
						strategy={verticalListSortingStrategy}
					>
						<AnimatePresence>
							{!todosQuery.isLoading &&
								todos.map((todo) => (
									<SortableTodoRow
										key={todo.id}
										todo={todo}
										editMode={editMode}
										indicator={indicatorFor(todo.id)}
										onToggle={() => toggleMutation.mutate({ todoId: todo.id })}
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
									<div className="w-[240px] scale-[1.03] rounded-lg border border-[#D6C9B2] bg-[#F7F2E8] px-2 py-1.5 shadow-[0_8px_24px_-4px_rgba(41,37,36,0.28)]">
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

			<div className="flex gap-1.5 border-[#E6DCCA] border-t pt-1">
				<input
					type="text"
					value={newText}
					onChange={(e) => setNewText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") addTodo();
					}}
					placeholder="Add a task…"
					className="min-w-0 flex-1 rounded-lg border border-[#C7B79C] bg-[#F1EBDE] px-2.5 py-1.5 text-[#2E2318] text-[12.5px] outline-none focus:ring-2 focus:ring-[#2E2318] focus:ring-offset-1"
				/>
				<button
					type="button"
					onClick={addTodo}
					className="cursor-pointer rounded-lg border border-[#2E2318] bg-[#2E2318] px-2.5 py-1.5 font-semibold text-[13px] text-white"
				>
					+
				</button>
			</div>
		</div>
	);
}
