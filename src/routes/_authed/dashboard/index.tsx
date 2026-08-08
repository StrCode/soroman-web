import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import DashboardHero from "@/components/dashboard/hero";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import ReorderChips from "@/components/dashboard/reorder-chips";
import Sparkline from "@/components/dashboard/sparkline";
import WalletCard from "@/components/dashboard/wallet-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	api,
	type DashboardOverview,
	type OrderRecord,
	type OrderStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { type LpgOrderRequest, listMyLpgOrders } from "@/lib/cooking-gas/api";
import { listMyDangoteOrders } from "@/lib/dangote-delivery/api";
import {
	type DangoteOrderRequestSummary,
	formatDangoteQuantity,
	STATUS_LABELS,
} from "@/lib/dangote-delivery/types";
import type { AppColumnDef } from "@/lib/table";
import { formatNaira, useCatalog } from "@/lib/use-catalog";
import { useSettings } from "@/lib/use-settings";
import { cn } from "@/lib/utils";
import {
	CG_STATUS_LABELS,
	cgStatusTone,
} from "@/routes/_authed/dashboard/cooking-gas";
import { statusTone } from "@/routes/_authed/dashboard/dangote-delivery";
import {
	ORDER_STATUS_LABEL,
	orderStatusTone,
} from "@/routes/_authed/dashboard/orders";

export const Route = createFileRoute("/_authed/dashboard/")({
	component: OverviewPage,
});

/**
 * The overview extends the landing page's editorial language — hairline row
 * dividers, wide-tracked uppercase micro-labels, large tabular numerals — so
 * signing in never feels like entering a different product. It leads with one
 * action-first hero (see components/dashboard/hero) and demotes everything
 * else beneath it; panels rise in with the market-snapshot stagger.
 */

// How advanced an in-motion order is, for picking which one the hero features.
const MOTION_RANK: Partial<Record<OrderStatus, number>> = {
	loading: 3,
	released: 2,
	paid: 1,
};

const describeLines = (order: OrderRecord) =>
	order.lines
		.map((l) => `${l.quantity.toLocaleString()} L ${l.abbreviation}`)
		.join(" · ");

const PAST_ORDERS_LIMIT = 5;

const pastOrderColumns: AppColumnDef<OrderRecord>[] = [
	{
		accessorKey: "id",
		header: "Reference",
		cell: ({ row }) => (
			<span className="font-medium tabular-nums">{row.original.id}</span>
		),
	},
	{
		id: "product",
		header: "Product",
		cell: ({ row }) => (
			<span className="block max-w-40 truncate">
				{describeLines(row.original)}
			</span>
		),
	},
	{
		accessorKey: "total",
		header: "Total",
		meta: { className: "text-right" },
		cell: ({ row }) => (
			<span className="tabular-nums">{formatNaira(row.original.total)}</span>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => (
			<span
				className={cn(
					"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
					orderStatusTone(row.original.status),
				)}
			>
				{ORDER_STATUS_LABEL[row.original.status]}
			</span>
		),
	},
	{
		id: "open",
		header: () => <span className="sr-only">Open</span>,
		meta: { className: "w-10 text-right" },
		cell: () => (
			<ChevronRight className="ease-luxe inline size-4 text-muted-foreground transition-transform duration-250 group-hover:translate-x-0.5 group-hover:text-foreground" />
		),
	},
];

function OverviewPage() {
	const auth = useAuth();
	const customer = auth.status === "authed" ? auth.customer : null;
	const profileReady = Boolean(customer?.name || customer?.company_name);

	const { data: overview, isLoading } = useQuery({
		queryKey: ["dashboard"],
		queryFn: api.dashboard.overview,
		// Keep polling while an invoice is unpaid, so the hero flips itself from
		// "awaiting payment" to "in motion" the moment the transfer confirms.
		refetchInterval: (query) => {
			const data = query.state.data as DashboardOverview | undefined;
			return data?.active.some((o) => o.status === "awaiting_payment")
				? 10_000
				: false;
		},
	});

	const { data: dangoteOrdersResult } = useQuery({
		queryKey: ["dangote-delivery-orders", "attention-home"],
		queryFn: () =>
			listMyDangoteOrders({
				page: 1,
				limit: 10,
				status: "Approved",
				paymentStatus: "Unpaid",
			}),
		refetchInterval: 10000,
	});
	const dangoteOrders = dangoteOrdersResult?.requests;

	const { data: cookingGasOrdersResult } = useQuery({
		queryKey: ["cooking-gas-orders", "attention-home"],
		queryFn: () =>
			listMyLpgOrders({
				page: 1,
				limit: 10,
				status: "Approved",
				paymentStatus: "Unpaid",
			}),
		refetchInterval: 10000,
	});
	const cookingGasOrders = cookingGasOrdersResult?.requests;

	// The dedicated funding account (404s until Paystack assigns one).
	const accountQuery = useQuery({
		queryKey: ["virtualAccount"],
		queryFn: api.me.virtualAccount,
		enabled: profileReady,
		retry: false,
		staleTime: 5 * 60_000,
	});

	const { products } = useCatalog();
	const todayPrice = useMemo(() => {
		const prices = products.filter((p) => p.available).map((p) => p.price);
		return prices.length ? Math.min(...prices) : null;
	}, [products]);

	const active = overview?.active ?? [];
	const primaryOrder = useMemo(() => {
		const unpaid = active.find((o) => o.status === "awaiting_payment");
		if (unpaid) return unpaid;
		return (
			[...active]
				.filter((o) => o.status !== "awaiting_payment")
				.sort(
					(a, b) =>
						(MOTION_RANK[b.status] ?? 0) - (MOTION_RANK[a.status] ?? 0) ||
						Date.parse(b.placed_at) - Date.parse(a.placed_at),
				)[0] ?? null
		);
	}, [active]);

	// Quotes waiting on the customer's money — the one Dangote state that
	// needs them to act — surfaced above the fold.
	const dangoteAttention = useMemo(
		() =>
			[...(dangoteOrders ?? [])]
				.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
				.slice(0, 3),
		[dangoteOrders],
	);

	const cookingGasAttention = useMemo(
		() =>
			[...(cookingGasOrders ?? [])]
				.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
				.slice(0, 3),
		[cookingGasOrders],
	);

	const firstName =
		(customer?.name || customer?.company_name || "").split(/\s+/)[0] || null;
	const hour = new Date().getHours();
	const daypart =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
	const today = new Date().toLocaleDateString("en-NG", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header
				className="snapshot-rise flex flex-wrap items-end justify-between gap-6"
				style={{ animationDelay: "0ms" }}
			>
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground")}>{today}</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight text-balance md:text-4xl">
						{daypart}
						{firstName && (
							<>
								,{" "}
								<em className="font-semibold text-accent not-italic">
									{firstName}
								</em>
							</>
						)}
						.
					</h1>
				</div>
				<Button size="lg" nativeButton={false} render={<Link to="/order" />}>
					New order
				</Button>
			</header>

			{/* The star: one adaptive card answering "what do I do now?" */}
			<div className="snapshot-rise mt-10" style={{ animationDelay: "80ms" }}>
				{isLoading ? (
					<Skeleton className="h-44 w-full rounded-xl" />
				) : (
					<DashboardHero
						order={primaryOrder}
						account={accountQuery.data ?? null}
					/>
				)}
			</div>

			{dangoteAttention.length > 0 && (
				<div className="snapshot-rise mt-6" style={{ animationDelay: "110ms" }}>
					<DangoteAttentionPanel orders={dangoteAttention} />
				</div>
			)}

			{cookingGasAttention.length > 0 && (
				<div className="snapshot-rise mt-6" style={{ animationDelay: "120ms" }}>
					<CookingGasAttentionPanel orders={cookingGasAttention} />
				</div>
			)}

			{overview && overview.past.length > 0 && (
				<div className="snapshot-rise mt-6" style={{ animationDelay: "140ms" }}>
					<ReorderChips orders={overview.past.slice(0, 3)} />
				</div>
			)}

			<div className="mt-6 grid gap-6 lg:grid-cols-12">
				<div
					className="snapshot-rise lg:col-span-5"
					style={{ animationDelay: "180ms" }}
				>
					{isLoading || !overview ? (
						<Skeleton className="h-60 w-full rounded-xl" />
					) : (
						<WalletCard
							balance={overview.wallet.balance}
							todayPrice={todayPrice}
							account={accountQuery.data ?? null}
							accountPending={profileReady && accountQuery.isLoading}
						/>
					)}
				</div>
				<div
					className="snapshot-rise lg:col-span-7"
					style={{ animationDelay: "240ms" }}
				>
					<MonthPanel overview={overview ?? null} />
				</div>
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-12">
				<div
					className="snapshot-rise lg:col-span-5"
					style={{ animationDelay: "300ms" }}
				>
					<PricesPanel />
				</div>
				<div
					className="snapshot-rise lg:col-span-7"
					style={{ animationDelay: "360ms" }}
				>
					<PastOrdersPanel orders={overview?.past ?? null} />
				</div>
			</div>
		</div>
	);
}

function DangoteAttentionPanel({
	orders,
}: {
	orders: DangoteOrderRequestSummary[];
}) {
	return (
		<section className={PANEL} aria-label="Dangote orders ready to pay">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Dangote orders</span>
				<Link
					to="/dashboard/dangote-delivery"
					className="group text-xs text-accent"
				>
					All orders
					<span className="ease-luxe ml-1 inline-block transition-transform duration-220 group-hover:translate-x-0.5">
						→
					</span>
				</Link>
			</div>
			<div>
				{orders.map((request) => (
					<Link
						key={request.id}
						to="/dashboard/dangote-delivery/$orderId"
						params={{ orderId: String(request.id) }}
						className="ease-luxe flex items-center justify-between gap-5 border-b border-foreground/15 px-6 py-4 transition-colors duration-250 last:border-b-0 hover:bg-muted/40 active:bg-muted/60"
					>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-sm font-medium">{request.product}</p>
								<span
									className={cn(
										"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
										statusTone(request.status),
									)}
								>
									{STATUS_LABELS[request.status] ?? request.status}
								</span>
							</div>
							<p className="mt-1 text-xs text-muted-foreground tabular-nums">
								{formatDangoteQuantity(request.quantity, request.quantityUnit)}
								{request.totalAmount != null &&
									` · ${formatNaira(Number(request.totalAmount))}`}
								{" · "}
								{request.requestNumber}
							</p>
						</div>
						<span className="shrink-0 text-xs text-accent">Pay quote →</span>
					</Link>
				))}
			</div>
		</section>
	);
}

function CookingGasAttentionPanel({ orders }: { orders: LpgOrderRequest[] }) {
	return (
		<section className={PANEL} aria-label="Cooking gas quotes ready to pay">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Cooking gas</span>
				<Link to="/dashboard/cooking-gas" className="group text-xs text-accent">
					All orders
					<span className="ease-luxe ml-1 inline-block transition-transform duration-220 group-hover:translate-x-0.5">
						→
					</span>
				</Link>
			</div>
			<div>
				{orders.map((request) => (
					<Link
						key={request.id}
						to="/dashboard/cooking-gas/$orderId"
						params={{ orderId: String(request.id) }}
						className="ease-luxe flex items-center justify-between gap-5 border-b border-foreground/15 px-6 py-4 transition-colors duration-250 last:border-b-0 hover:bg-muted/40 active:bg-muted/60"
					>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-sm font-medium tabular-nums">
									{request.cylinderQuantity} × {request.cylinderSizeKg}kg
								</p>
								<span
									className={cn(
										"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
										cgStatusTone(request.status),
									)}
								>
									{CG_STATUS_LABELS[request.status] ?? request.status}
								</span>
							</div>
							<p className="mt-1 text-xs text-muted-foreground tabular-nums">
								{request.stationName ?? "Cooking gas"}
								{request.totalAmount != null &&
									` · ${formatNaira(Number(request.totalAmount))}`}
								{" · "}
								{request.requestNumber}
							</p>
						</div>
						<span className="shrink-0 text-xs text-accent">View quote →</span>
					</Link>
				))}
			</div>
		</section>
	);
}

function MonthPanel({ overview }: { overview: DashboardOverview | null }) {
	return (
		<section
			className={cn(PANEL, "flex h-full flex-col")}
			aria-label="This month"
		>
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>This month</span>
				<span className="text-xs text-muted-foreground tabular-nums">
					{new Date().toLocaleDateString("en-NG", {
						month: "long",
						year: "numeric",
					})}
				</span>
			</div>

			{overview ? (
				<>
					<dl className="grid divide-y divide-foreground/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
						<MonthFigure
							label="Orders"
							value={String(overview.month.orders)}
							hint={
								overview.active.length
									? `${overview.active.length} in motion`
									: "this month"
							}
						/>
						<MonthFigure
							label="Litres"
							value={overview.month.litres.toLocaleString()}
							unit="L"
							hint="ordered"
						/>
						<MonthFigure
							label="Spent"
							value={formatNaira(overview.month.spent)}
							hint={
								overview.month.litres > 0 && overview.month.spent > 0
									? `avg ${formatNaira(Math.round(overview.month.spent / overview.month.litres))}/L`
									: "paid so far"
							}
						/>
					</dl>
					<div className="mt-auto px-6 pt-4 pb-5">
						<Sparkline trend={overview.trend} className="h-12 w-full" />
					</div>
				</>
			) : (
				<div className="grid gap-px p-6 sm:grid-cols-3">
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i}>
							<Skeleton className="h-3 w-20" />
							<Skeleton className="mt-3 h-8 w-28" />
						</div>
					))}
				</div>
			)}
		</section>
	);
}

function MonthFigure({
	label,
	value,
	unit,
	hint,
}: {
	label: string;
	value: string;
	unit?: string;
	hint: string;
}) {
	return (
		<div className="px-6 py-5">
			<dt className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
				{label}
			</dt>
			<dd className="mt-2 text-2xl leading-none font-semibold tracking-tight tabular-nums md:text-3xl">
				{value}
				{unit && (
					<span className="ml-1 text-sm font-normal text-muted-foreground">
						{unit}
					</span>
				)}
			</dd>
			<dd className="mt-2 text-xs text-muted-foreground">{hint}</dd>
		</div>
	);
}

function PricesPanel() {
	const { depots, products, isLoading } = useCatalog();
	const { settings } = useSettings();

	const productTabs = useMemo(() => {
		const byAbbr = new Map<string, { abbr: string; name: string }>();
		for (const p of products) {
			if (!byAbbr.has(p.abbreviation)) {
				byAbbr.set(p.abbreviation, { abbr: p.abbreviation, name: p.name });
			}
		}
		const order = ["PMS", "AGO", "DPK", "ATK"];
		const rank = (abbr: string) => {
			const i = order.indexOf(abbr);
			return i === -1 ? order.length : i;
		};
		return [...byAbbr.values()].sort(
			(a, b) => rank(a.abbr) - rank(b.abbr) || a.abbr.localeCompare(b.abbr),
		);
	}, [products]);

	const [productAbbr, setProductAbbr] = useState<string | null>(null);
	const selectedAbbr = productAbbr ?? productTabs[0]?.abbr ?? null;

	const openDepots = useMemo(
		() =>
			[...depots]
				.filter((d) => d.is_open)
				.sort((a, b) => a.name.localeCompare(b.name)),
		[depots],
	);

	const quoteFor = useMemo(() => {
		const map = new Map<string, (typeof products)[number]>();
		for (const p of products) map.set(`${p.depot_id}:${p.abbreviation}`, p);
		return map;
	}, [products]);

	const bestPrice = useMemo(() => {
		if (!selectedAbbr) return null;
		let best: number | null = null;
		for (const depot of openDepots) {
			const q = quoteFor.get(`${depot.id}:${selectedAbbr}`);
			if (!q?.available) continue;
			if (best === null || q.price < best) best = q.price;
		}
		return best;
	}, [openDepots, quoteFor, selectedAbbr]);

	const selectedName = productTabs.find((t) => t.abbr === selectedAbbr)?.name;

	return (
		<section
			className={cn(PANEL, "flex h-full flex-col")}
			aria-label="Depot prices"
		>
			<div className="border-b border-foreground/15 px-6 py-4">
				<div className="flex items-baseline justify-between gap-3">
					<span className={MICRO}>Depot prices</span>
					{selectedName && (
						<span className="truncate text-xs text-muted-foreground">
							{selectedName}
						</span>
					)}
				</div>
				{!isLoading && productTabs.length > 0 && (
					<div
						className="mt-3 flex flex-wrap gap-1.5"
						role="tablist"
						aria-label="Product"
					>
						{productTabs.map((tab) => {
							const active = tab.abbr === selectedAbbr;
							return (
								<button
									key={tab.abbr}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => setProductAbbr(tab.abbr)}
									className={cn(
										"ease-luxe cursor-pointer rounded-full border px-2.5 py-1 text-[0.65rem] font-medium tracking-widest uppercase transition-colors duration-220",
										active
											? "border-accent/40 bg-accent/15 text-accent"
											: "border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
									)}
								>
									{tab.abbr}
								</button>
							);
						})}
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="space-y-5 px-6 py-5">
					{Array.from({ length: 3 }, (_, i) => (
						<Skeleton key={i} className="h-9 w-full" />
					))}
				</div>
			) : !selectedAbbr || openDepots.length === 0 ? (
				<div className="flex-1 px-6 py-10 text-center">
					<p className="text-sm text-muted-foreground">
						No open depot prices right now.
					</p>
				</div>
			) : (
				<div className="max-h-64 flex-1 overflow-y-auto">
					{openDepots.map((depot) => {
						const quote = quoteFor.get(`${depot.id}:${selectedAbbr}`);
						const isDefault = depot.id === settings.default_depot_id;
						const isBest =
							quote?.available === true &&
							bestPrice != null &&
							quote.price === bestPrice;

						return (
							<div
								key={depot.id}
								className={cn(
									"flex items-center justify-between gap-4 border-b border-foreground/15 px-6 py-3.5 last:border-b-0",
									isDefault && "bg-muted/30",
								)}
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{depot.name}
										{isDefault && (
											<span className="ml-1.5 text-[0.65rem] font-normal tracking-widest text-muted-foreground uppercase">
												Default
											</span>
										)}
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{depot.state} State
									</p>
								</div>
								{quote?.available ? (
									<p
										className={cn(
											"text-base leading-none font-semibold tracking-tight tabular-nums",
											isBest && "text-accent",
										)}
									>
										{formatNaira(quote.price)}
										<span className="ml-0.5 text-xs font-normal text-muted-foreground">
											/L
										</span>
									</p>
								) : (
									<span className="rounded-full border border-foreground/15 px-2.5 py-0.5 text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
										Awaiting
									</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className="bg-muted/60 px-6 py-3">
				<Link to="/dashboard/prices" className="group text-xs text-accent">
					Compare all depots
					<span className="ease-luxe ml-1 inline-block transition-transform duration-220 group-hover:translate-x-0.5">
						→
					</span>
				</Link>
			</div>
		</section>
	);
}

function PastOrdersPanel({ orders }: { orders: OrderRecord[] | null }) {
	const navigate = useNavigate();
	const rows = useMemo(() => {
		if (!orders) return [];
		return [...orders]
			.sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at))
			.slice(0, PAST_ORDERS_LIMIT);
	}, [orders]);

	return (
		<section className="flex h-full flex-col" aria-label="Past orders">
			<div className="mb-3 flex items-baseline justify-between gap-3">
				<span className={MICRO}>Past orders</span>
				<Link to="/dashboard/orders" className="group text-xs text-accent">
					View all
					<span className="ease-luxe ml-1 inline-block transition-transform duration-220 group-hover:translate-x-0.5">
						→
					</span>
				</Link>
			</div>

			<DataTable
				columns={pastOrderColumns}
				data={rows}
				isLoading={orders === null}
				striped
				emptyTitle="No past orders yet."
				emptyDescription="Your completed orders will show up here."
				emptyAction={
					<Button size="sm" nativeButton={false} render={<Link to="/order" />}>
						Place an order
					</Button>
				}
				onRowClick={(order) =>
					void navigate({
						to: "/dashboard/orders/$orderId",
						params: { orderId: order.id },
					})
				}
				className="flex-1"
				tableClassName="min-w-0"
			/>
		</section>
	);
}
