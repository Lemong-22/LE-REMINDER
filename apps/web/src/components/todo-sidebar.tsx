"use client";

import type { AppRouter } from "@LE-REMINDER/api/routers/index";
import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
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
import { queryClient, trpc } from "@/utils/trpc";

type Todo = inferRouterOutputs<AppRouter>["todo"]["list"][number];

// One sortable, animated row — dnd-kit owns the transform for drag/drop
// reordering, framer-motion owns opacity/y purely for mount/unmount
// (deliberately no `layout` prop here: framer-motion's own FLIP-based
// position animation would fight with dnd-kit's transform on the same
// node during a drag). The grip handle carries dnd-kit's listeners, not
// the whole row, so dragging can't be triggered by tapping the checkbox,
// the text, or the delete button.
function SortableTodoRow({
	todo,
	editMode,
	onToggle,
	onDelete,
}: {
	todo: Todo;
	editMode: boolean;
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
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={{ duration: 0.2 }}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				position: "relative",
				zIndex: isDragging ? 10 : undefined,
			}}
			className={cn(isDragging && "opacity-60")}
		>
			<div className="flex items-center gap-2">
				<button
					type="button"
					{...attributes}
					{...listeners}
					aria-label={`Reorder ${todo.text}`}
					className="cursor-grab touch-none bg-transparent text-[#d6d3d1] active:cursor-grabbing"
				>
					<GripVertical className="size-3.5" />
				</button>
				<Checkbox
					checked={todo.done}
					onCheckedChange={onToggle}
					className="size-4 rounded data-checked:border-[#292524] data-checked:bg-[#292524]"
				/>
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-all",
						todo.done ? "text-[#a8a29e] line-through" : "text-[#292524]",
					)}
				>
					{todo.text}
				</button>
				{editMode && (
					<button
						type="button"
						onClick={onDelete}
						aria-label={`Remove ${todo.text}`}
						className="cursor-pointer bg-transparent px-0.5 text-[#a8a29e] text-sm"
					>
						×
					</button>
				)}
			</div>
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

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = todos.findIndex((todo) => todo.id === active.id);
		const newIndex = todos.findIndex((todo) => todo.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(todos, oldIndex, newIndex);
		reorderMutation.mutate({ todoIds: reordered.map((todo) => todo.id) });
	}

	return (
		<div className="sticky top-[76px] flex max-h-[calc(100vh-96px)] w-[280px] shrink-0 flex-col gap-3.5 overflow-y-auto rounded-xl border border-[#e7e5e4]/70 bg-gradient-to-br from-white to-[#faf9f6]/80 p-5 shadow-[0_1px_2px_rgba(41,37,36,0.05),inset_0_0_0_1px_rgba(255,255,255,0.6)]">
			<div className="flex items-center justify-between">
				<div className="font-extrabold text-[#292524] text-[18px] tracking-[-0.015em]">
					Today's To-Do
				</div>
				<button
					type="button"
					onClick={() => setEditMode((v) => !v)}
					className="cursor-pointer bg-transparent p-0.5 font-semibold text-[#78716c] text-[11.5px]"
				>
					{editMode ? "Done" : "Edit List"}
				</button>
			</div>

			<div className="flex flex-col gap-2.5">
				{!todosQuery.isLoading && todos.length === 0 && (
					<div className="text-[#57534e] text-[12.5px]">
						Nothing on your scratchpad.
					</div>
				)}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
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
										onToggle={() => toggleMutation.mutate({ todoId: todo.id })}
										onDelete={() => deleteMutation.mutate({ todoId: todo.id })}
									/>
								))}
						</AnimatePresence>
					</SortableContext>
				</DndContext>
			</div>

			<div className="flex gap-1.5 border-[#f0efed] border-t pt-1">
				<input
					type="text"
					value={newText}
					onChange={(e) => setNewText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") addTodo();
					}}
					placeholder="Add a task…"
					className="min-w-0 flex-1 rounded-lg border border-[#d6d3d1] bg-[#fafaf9] px-2.5 py-1.5 text-[#292524] text-[12.5px] outline-none focus:ring-2 focus:ring-[#292524] focus:ring-offset-1"
				/>
				<button
					type="button"
					onClick={addTodo}
					className="cursor-pointer rounded-lg border border-[#292524] bg-[#292524] px-2.5 py-1.5 font-semibold text-[13px] text-white"
				>
					+
				</button>
			</div>
		</div>
	);
}
