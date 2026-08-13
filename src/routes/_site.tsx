import { createFileRoute, Outlet } from "@tanstack/react-router";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { NotFoundContent } from "@/components/not-found";

// Pathless layout: the full marketing frame. Everything a visitor browses —
// landing, FAQ, contact, order tracking — lives under it. Fuzzy not-found
// under this tree keeps the header/footer and only swaps the main content.
export const Route = createFileRoute("/_site")({
	component: SiteLayout,
	notFoundComponent: NotFoundContent,
});

function SiteLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<Header />
			<main className="vt-page flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
