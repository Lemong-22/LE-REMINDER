"use client";

import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { AnimatedItem } from "@/components/ui/animated-list";
import { queryClient, trpc } from "@/utils/trpc";

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

	function invalidate() {
		queryClient.invalidateQueries(trpc.todo.pathFilter());
	}

	const addMutation = useMutation(
		trpc.todo.add.mutationOptions({ onSuccess: invalidate }),
	);

	// Toggling is the most frequent interaction, so it gets an optimistic
	// flip instead of waiting on the Turso round-trip; add/delete stay
	// invalidate-on-success since they're infrequent and the skeleton/list
	// reflow is cheap either way.
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

	const deleteMutation = useMutation(
		trpc.todo.delete.mutationOptions({ onSuccess: invalidate }),
	);

	function addTodo() {
		const text = newText.trim();
		if (!text) return;
		addMutation.mutate({ text });
		setNewText("");
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
				<AnimatePresence>
					{!todosQuery.isLoading &&
						todos.map((todo, index) => (
							<AnimatedItem key={todo.id} index={index}>
								<div className="flex items-center gap-2.5">
									<Checkbox
										checked={todo.done}
										onCheckedChange={() =>
											toggleMutation.mutate({ todoId: todo.id })
										}
										className="size-4 rounded data-checked:border-[#292524] data-checked:bg-[#292524]"
									/>
									<button
										type="button"
										onClick={() => toggleMutation.mutate({ todoId: todo.id })}
										className={cn(
											"flex-1 cursor-pointer bg-transparent text-left text-[13.5px] transition-all",
											todo.done
												? "text-[#a8a29e] line-through"
												: "text-[#292524]",
										)}
									>
										{todo.text}
									</button>
									{editMode && (
										<button
											type="button"
											onClick={() => deleteMutation.mutate({ todoId: todo.id })}
											aria-label={`Remove ${todo.text}`}
											className="cursor-pointer bg-transparent px-0.5 text-[#a8a29e] text-sm"
										>
											×
										</button>
									)}
								</div>
							</AnimatedItem>
						))}
				</AnimatePresence>
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
