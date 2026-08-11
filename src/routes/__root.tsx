import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NotFoundPage } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "../index.css";

export interface RouterAppContext {
	queryClient: QueryClient;
}

// Page chrome lives in the pathless layouts, each surface owning its frame:
// _site (full header + footer), _slim (checkout + auth), and the dashboard's
// own sidebar shell under _authed/dashboard. The root is providers only.
//
// Unknown paths (and any `notFound()` that bubbles here) render the marketing
// 404 — see https://tanstack.com/router/v1/docs/guide/not-found-errors
export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundPage,
	head: () => ({
		meta: [
			{
				title: "Soroman Energy | Order fuel at today's depot prices",
			},
			{
				name: "description",
				content:
					"Live PMS and AGO depot prices across Nigeria. Order fuel, pay by bank transfer and track every truck to the gate.",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon.png",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<Outlet />
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools buttonPosition="bottom-right" />
		</>
	);
}
