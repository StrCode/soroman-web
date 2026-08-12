import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { NotFoundContent } from "./components/not-found";
import { ApiError } from "./lib/api";
import { authStore } from "./lib/auth";
import { routeTree } from "./routeTree.gen";

// Resolve the session from the refresh cookie before any route guard needs it.
void authStore.ensureBootstrapped();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// The fetch layer already resolves a refresh before surfacing a 401,
			// so a 401 reaching Query is final — retrying it is three more
			// guaranteed failures.
			retry: (failureCount, error) =>
				!(error instanceof ApiError && error.status === 401) &&
				failureCount < 2,
			staleTime: 30_000,
		},
	},
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	// Query owns caching — every preload/load runs the loader and Query dedupes.
	defaultPreloadStaleTime: 0,
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	// Content-only — parent layouts keep their own chrome. Full marketing
	// frame for truly unknown URLs lives on the root notFoundComponent.
	defaultNotFoundComponent: NotFoundContent,
	context: { queryClient },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

// Always mount. Prerender writes real markup into `#app` for crawlers / first
// paint; createRoot replaces it on the client so interactivity still boots.
const root = ReactDOM.createRoot(rootElement);
root.render(
	<QueryClientProvider client={queryClient}>
		<RouterProvider router={router} />
	</QueryClientProvider>,
);
