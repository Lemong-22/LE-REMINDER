import type { AppRouter } from "@LE-REMINDER/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";
import superjson from "superjson";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
	defaultOptions: {
		queries: {
			// Tuned for an always-on tablet display, not a typical multi-tab
			// browsing session: data is fresh for 5 minutes (matches the idle
			// dimmer's timeout) so routine/todo mutations already invalidate
			// the cache explicitly on success, refocusing the tab re-syncs
			// once, and nothing polls in the background.
			staleTime: 300_000,
			refetchOnWindowFocus: true,
			refetchInterval: false,
		},
	},
});

const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			transformer: superjson,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
