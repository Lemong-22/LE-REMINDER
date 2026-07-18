"use client";

import { Checkbox } from "@LE-REMINDER/ui/components/checkbox";
import { cn } from "@LE-REMINDER/ui/lib/utils";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedItem } from "@/components/ui/animated-list";

interface Todo {
	id: string;
	text: string;
	done: boolean;
}

const STORAGE_KEY = "le-reminder:todo-sidebar";

const INITIAL_TODOS: Todo[] = [
	{ id: "t1", text: "Daily Vitamins", done: false },
	{ id: "t2", text: "Replace Water Filter", done: false },
	{ id: "t3", text: "Water the Plants", done: false },
];

function loadStoredTodos(): Todo[] {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return INITIAL_TODOS;
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : INITIAL_TODOS;
	} catch {
		return INITIAL_TODOS;
	}
}

// Ephemeral scratchpad — deliberately not a Routine. Has no schedule, no
// status, and stays entirely outside computeRoutineStatus / tRPC. Persisted
// to localStorage only (not the backend), so a refresh doesn't lose it but
// it never touches the database.
export function TodoSidebar() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [mounted, setMounted] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [newText, setNewText] = useState("");

	// Reads localStorage only after mount (never during render/SSR), then
	// gates the list render on `mounted` — server and the pre-mount client
	// render both show nothing here, so there's no hydration mismatch.
	useEffect(() => {
		setTodos(loadStoredTodos());
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	}, [todos, mounted]);

	function toggleTodo(id: string) {
		setTodos((prev) =>
			prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
		);
	}

	function removeTodo(id: string) {
		setTodos((prev) => prev.filter((t) => t.id !== id));
	}

	function addTodo() {
		const text = newText.trim();
		if (!text) return;
		setTodos((prev) => [
			...prev,
			{ id: crypto.randomUUID(), text, done: false },
		]);
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
				{mounted && todos.length === 0 && (
					<div className="text-[#57534e] text-[12.5px]">
						Nothing on your scratchpad.
					</div>
				)}
				<AnimatePresence>
					{mounted &&
						todos.map((todo, index) => (
							<AnimatedItem key={todo.id} index={index}>
								<div className="flex items-center gap-2.5">
									<Checkbox
										checked={todo.done}
										onCheckedChange={() => toggleTodo(todo.id)}
										className="size-4 rounded data-checked:border-[#292524] data-checked:bg-[#292524]"
									/>
									<button
										type="button"
										onClick={() => toggleTodo(todo.id)}
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
											onClick={() => removeTodo(todo.id)}
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
