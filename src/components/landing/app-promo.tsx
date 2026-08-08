import { Check } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import { formatNaira, useCatalog } from "@/lib/use-catalog";

/**
 * Mobile app section: a bordered muted panel closing the page, copy and
 * store links on the left, a phone bleeding off the panel edge on the right.
 * The phone shows a real mini preview of the product (live best prices from
 * the catalog, same data as the hero and the board), not an invented
 * screenshot.
 */

// TODO: swap for the real store listings once they're published.
const APP_STORE_URL = "https://apps.apple.com/ng/app/soroman/id0000000000";
const PLAY_STORE_URL =
	"https://play.google.com/store/apps/details?id=ng.soroman.app";

const FEATURES = [
	"Compare live prices across all Soroman depots",
	"Receive your invoice instantly after placing an order",
	"Track your order from payment to completion",
	"Reorder previous purchases in just a few clicks",
];

const PRODUCT_ORDER = ["PMS", "AGO", "DPK", "ATK"];

type BestQuote = { abbr: string; price: number; unit: string; depot: string };

export default function AppPromo() {
	const { depots, products, isLoading } = useCatalog();

	const rows = useMemo<BestQuote[]>(() => {
		const openDepots = new Map(
			depots.filter((d) => d.is_open).map((d) => [d.id, d.name]),
		);
		const best = new Map<string, BestQuote>();
		for (const p of products) {
			if (!p.available || !openDepots.has(p.depot_id)) continue;
			const current = best.get(p.abbreviation);
			if (current === undefined || p.price < current.price) {
				best.set(p.abbreviation, {
					abbr: p.abbreviation,
					price: p.price,
					unit: p.unit,
					depot: openDepots.get(p.depot_id) ?? "",
				});
			}
		}
		const rank = (abbr: string) => {
			const i = PRODUCT_ORDER.indexOf(abbr);
			return i === -1 ? PRODUCT_ORDER.length : i;
		};
		return [...best.values()]
			.sort(
				(a, b) => rank(a.abbr) - rank(b.abbr) || a.abbr.localeCompare(b.abbr),
			)
			.slice(0, 4);
	}, [depots, products]);

	return (
		<section>
			<div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-20">
				<div className="overflow-hidden rounded-xl border border-foreground/15 bg-muted/40">
					<div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
						<div className="px-6 pt-10 sm:px-10 sm:pt-12 lg:col-span-7 lg:py-14">
							<h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
								Order Anywhere with the Soroman App
							</h2>
							<p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
								Order fuel, fund your wallet, track deliveries and receive live
								updates from your phone.
							</p>

							<ul className="mt-8 max-w-md space-y-3">
								{FEATURES.map((feature) => (
									<li key={feature} className="flex items-start gap-3 text-sm">
										<Check
											className="mt-0.5 size-4 shrink-0 text-accent"
											strokeWidth={2}
											aria-hidden
										/>
										{feature}
									</li>
								))}
							</ul>

							<div className="mt-10 flex flex-wrap gap-3">
								<StoreBadge
									href={APP_STORE_URL}
									label="Download Soroman on the App Store"
									glyph={<AppleGlyph />}
									eyebrow="Download on the"
									store="App Store"
								/>
								<StoreBadge
									href={PLAY_STORE_URL}
									label="Get Soroman on Google Play"
									glyph={<PlayGlyph />}
									eyebrow="Get it on"
									store="Google Play"
								/>
							</div>
						</div>

						<div
							aria-hidden
							className="flex items-end justify-center px-6 lg:col-span-5 lg:px-0"
						>
							<div className="mt-12 w-[280px] translate-y-6 rounded-[2.75rem] border border-foreground/15 bg-card p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.12)] lg:mt-14">
								<div className="relative overflow-hidden rounded-[2.25rem] border border-foreground/10 bg-background text-foreground">
									<div className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground/90" />
									<div className="px-5 pt-12 pb-6">
										<div className="flex items-center justify-between">
											<img
												src="/logo-full.png"
												alt=""
												className="h-4 w-auto dark:hue-rotate-180 dark:invert"
											/>
											<span className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
												<span className="size-1.5 rounded-full bg-accent" />
												Live
											</span>
										</div>

										<p className="mt-5 text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
											Today's Lowest Price
										</p>
										<ul className="mt-1 divide-y divide-foreground/10">
											{isLoading
												? Array.from({ length: 4 }, (_, i) => (
														<li key={i} className="py-3">
															<Skeleton className="h-4 w-full" />
														</li>
													))
												: rows.map((row) => (
														<li
															key={row.abbr}
															className="flex items-baseline justify-between gap-3 py-2.5"
														>
															<span className="min-w-0">
																<span className="text-sm font-semibold">
																	{row.abbr}
																</span>
																<span className="mt-0.5 block truncate text-[0.65rem] text-muted-foreground">
																	{row.depot}
																</span>
															</span>
															<span className="text-sm font-semibold whitespace-nowrap tabular-nums">
																{formatNaira(row.price)}
																<span className="ml-0.5 text-[0.65rem] font-normal text-muted-foreground">
																	/{row.unit}
																</span>
															</span>
														</li>
													))}
										</ul>

										<div className="mt-4 rounded-xl border border-foreground/10 bg-muted/50 px-3.5 py-2.5">
											<p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
												Recent Order Status
											</p>
											<p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
												<span className="size-1.5 shrink-0 rounded-full bg-accent" />
												AB-123A · Status: Loading
											</p>
										</div>

										<span className="mt-4 flex h-9 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
											Start an order
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function StoreBadge({
	href,
	label,
	glyph,
	eyebrow,
	store,
}: {
	href: string;
	label: string;
	glyph: React.ReactNode;
	eyebrow: string;
	store: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			className="inline-flex items-center gap-2.5 rounded-full bg-foreground px-5 py-2.5 text-background transition-[opacity,transform] duration-250 ease-luxe hover:opacity-90 active:scale-[0.97]"
		>
			{glyph}
			<span className="text-left leading-tight">
				<span className="block text-[0.6rem] opacity-70">{eyebrow}</span>
				<span className="block text-sm font-semibold">{store}</span>
			</span>
		</a>
	);
}

/* Brand glyphs from Simple Icons (simpleicons.org), inlined so they follow
   the badge's text color in both themes. */

function AppleGlyph() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
			<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
		</svg>
	);
}

function PlayGlyph() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
			<path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
		</svg>
	);
}
