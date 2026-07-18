import { z } from "zod";

export const addTodoInputSchema = z.object({
	text: z.string().trim().min(1).max(280),
});

export const toggleTodoInputSchema = z.object({
	todoId: z.string().min(1),
});

export const deleteTodoInputSchema = z.object({
	todoId: z.string().min(1),
});
