import { publicProcedure, router } from "../index";
import { routineRouter } from "./routine";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	routine: routineRouter,
});
export type AppRouter = typeof appRouter;
