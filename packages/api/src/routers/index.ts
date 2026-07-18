import { publicProcedure, router } from "../index";
import { routineRouter } from "./routine";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	routine: routineRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
