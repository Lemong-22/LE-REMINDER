import { db } from "@LE-REMINDER/db";
import { todos } from "@LE-REMINDER/db/schema/todo";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import {
	addTodoInputSchema,
	deleteTodoInputSchema,
	reorderTodosInputSchema,
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
			orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
		}),
	),

	add: protectedProcedure
		.input(addTodoInputSchema)
		.mutation(async ({ ctx, input }) => {
			// New items go to the end of the user's current order, not
			// position 0 — max+1 rather than a row count so a gap left by a
			// prior delete can't cause two todos to collide on the same
			// position.
			const [maxRow] = await db
				.select({ maxPosition: sql<number | null>`max(${todos.position})` })
				.from(todos)
				.where(eq(todos.userId, ctx.session.user.id));

			const [created] = await db
				.insert(todos)
				.values({
					id: crypto.randomUUID(),
					userId: ctx.session.user.id,
					text: input.text,
					done: false,
					position: (maxRow?.maxPosition ?? -1) + 1,
					createdAt: new Date(),
				})
				.returning();
			return created;
		}),

	// Bulk rewrite of position from the full post-drag order dnd-kit's
	// arrayMove already produces client-side — simpler than a single
	// {todoId, newPosition} pair, which would still need every other
	// affected row's position shifted server-side anyway.
	reorder: protectedProcedure
		.input(reorderTodosInputSchema)
		.mutation(async ({ ctx, input }) => {
			await db.transaction(async (tx) => {
				for (const [index, todoId] of input.todoIds.entries()) {
					await tx
						.update(todos)
						.set({ position: index })
						.where(
							and(eq(todos.id, todoId), eq(todos.userId, ctx.session.user.id)),
						);
				}
			});
		}),

	toggle: protectedProcedure
		.input(toggleTodoInputSchema)
		.mutation(async ({ ctx, input }) => {
			// A single atomic flip, scoped by userId in the same WHERE that
			// does the write — not a separate read-then-write, which had
			// left the write itself unscoped (delete already got this
			// right; toggle didn't).
			const [updated] = await db
				.update(todos)
				.set({ done: sql`not ${todos.done}` })
				.where(
					and(
						eq(todos.id, input.todoId),
						eq(todos.userId, ctx.session.user.id),
					),
				)
				.returning();
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
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
