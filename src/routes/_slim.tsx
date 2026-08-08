import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";

import SlimHeader from "@/components/slim-header";

// Pathless layout: focused surfaces — checkout and the auth pages. Slim
// chrome, no footer; every extra link would be an exit from the task.
// Auth pages already brand themselves via AuthShell, so the slim header
// stays off there to avoid a double logo.
const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password"]);
/** Full-screen surfaces that supply their own minimal chrome (a back link,
 * a session row) — the slim header on top would double it. */
const NO_HEADER_PATHS = new Set([
	...AUTH_PATHS,
	"/order",
	"/order/dangote-delivery",
	"/order/depot",
	"/order/cooking-gas",
]);

export const Route = createFileRoute("/_slim")({
	component: SlimLayout,
});

function SlimLayout() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const showHeader = !NO_HEADER_PATHS.has(pathname);

	return (
		<div className="flex min-h-svh flex-col">
			{showHeader ? <SlimHeader /> : null}
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
