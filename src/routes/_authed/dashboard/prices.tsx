import { createFileRoute } from "@tanstack/react-router";
import { MICRO } from "@/components/dashboard/panel";
import PriceBoard from "@/components/landing/price-board";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/dashboard/prices")({
	component: PricesPage,
	head: () => ({
		meta: [
			{ title: "Depot prices | Soroman Energy" },
			{
				name: "description",
				content:
					"Live PMS and AGO prices across Soroman depots — open status, today's rate, and last update.",
			},
		],
	}),
});

/**
 * The in-app home for depot prices: same board as the landing page, framed
 * in the dashboard's editorial header so following "Depot prices" from the
 * sidebar never ejects a signed-in buyer to the marketing site.
 */
function PricesPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="snapshot-rise" style={{ animationDelay: "0ms" }}>
				<div className="flex items-center gap-4">
					<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
					<span className={cn(MICRO, "text-muted-foreground")}>
						Depot prices
					</span>
				</div>
				<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
					Today's{" "}
					<em className="font-semibold text-accent not-italic">prices</em>.
				</h1>
			</header>

			<div className="snapshot-rise mt-8" style={{ animationDelay: "90ms" }}>
				<PriceBoard embedded />
			</div>
		</div>
	);
}
