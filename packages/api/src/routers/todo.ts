import { db } from "@LE-REMINDER/db";
import { todos } from "@LE-REMINDER/db/schema/todo";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import {
	addTodoInputSchema,
	deleteTodoInputSchema,
	toggleTodoInputSchema,
} from "./todo-schemas";

// Deliberately bypasses the domain/application layers the routine router
// goes through — Today's To-Do is plain text, not a Routine (see
// packages/db/src/schema/todo.ts's comment), so there's no use case to
// wrap here. userId scoping exists only to make the list "the same across
// sessions for this account," not because this repo is multi-tenant.
export const todoRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		db.query.todos.findMany({
			where: eq(todos.userId, ctx.session.user.id),
			orderBy: (t, { asc }) => [asc(t.createdAt)],
		}),
	),

	add: protectedProcedure
		.input(addTodoInputSchema)
		.mutation(async ({ ctx, input }) => {
			const [created] = await db
				.insert(todos)
				.values({
					id: crypto.randomUUID(),
					userId: ctx.session.user.id,
					text: input.text,
					done: false,
					createdAt: new Date(),
				})
				.returning();
			return created;
		}),

	toggle: protectedProcedure
		.input(toggleTodoInputSchema)
		.mutation(async ({ ctx, input }) => {
			const existing = await db.query.todos.findFirst({
				where: and(
					eq(todos.id, input.todoId),
					eq(todos.userId, ctx.session.user.id),
				),
			});
			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			const [updated] = await db
				.update(todos)
				.set({ done: !existing.done })
				.where(eq(todos.id, input.todoId))
				.returning();
			return updated;
		}),

	delete: protectedProcedure
		.input(deleteTodoInputSchema)
		.mutation(({ ctx, input }) =>
			db
				.delete(todos)
				.where(
					and(
						eq(todos.id, input.todoId),
						eq(todos.userId, ctx.session.user.id),
					),
				),
		),
});
