import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;

export const publicProcedure = t.procedure;

// Phase 0.5: every procedure that touches user data (routines, todos) goes
// through this. ctx.session is re-narrowed to non-null here so downstream
// resolvers don't each need their own guard/cast.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { ...ctx, session: ctx.session } });
});
