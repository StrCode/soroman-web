import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy path — the chooser now lives at /order. Keep this so old bookmarks
 * and "New order" links still land on the front door.
 */
export const Route = createFileRoute("/_slim/order_/new")({
	beforeLoad: () => {
		throw redirect({ to: "/order" });
	},
});
