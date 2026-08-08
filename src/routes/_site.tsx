import { createFileRoute, Outlet } from "@tanstack/react-router";

import Footer from "@/components/footer";
import Header from "@/components/header";

// Pathless layout: the full marketing frame. Everything a visitor browses —
// landing, FAQ, contact, order tracking — lives under it.
export const Route = createFileRoute("/_site")({
	component: SiteLayout,
});

function SiteLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<Header />
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
