import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ location }) => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status !== "authed") {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
	},
	component: Outlet,
});
