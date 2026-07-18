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
			// Same account is routinely open on more than one device at once
			// (phone + the always-on tablet display), so a plain
			// invalidate-on-mutation model leaves other open tabs stale until
			// they're refocused. Poll every 5s instead — cheap for a handful
			// of small JSON payloads, and TanStack Query already pauses the
			// interval when the tab is backgrounded
			// (refetchIntervalInBackground defaults to false), so it costs
			// nothing on a phone sitting in a pocket.
			staleTime: 5_000,
			refetchOnWindowFocus: true,
			refetchInterval: 5_000,
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
