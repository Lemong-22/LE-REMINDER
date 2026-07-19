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

// The full ordered list of ids after a drag — simpler than a single
// {todoId, newPosition} pair, since that's exactly what dnd-kit's
// onDragEnd/arrayMove already produces client-side.
export const reorderTodosInputSchema = z.object({
	todoIds: z.array(z.string().min(1)).min(1),
});
