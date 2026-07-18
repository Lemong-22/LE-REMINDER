"use client";

import { Toaster } from "@LE-REMINDER/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { IdleDimmer } from "@/components/ui/idle-dimmer";
import { queryClient } from "@/utils/trpc";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			forcedTheme="light"
			disableTransitionOnChange
		>
			<QueryClientProvider client={queryClient}>
				<IdleDimmer>{children}</IdleDimmer>
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
