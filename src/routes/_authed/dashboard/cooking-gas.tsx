import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MICRO } from "@/components/dashboard/panel";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
	type LpgOrderRequest,
	type LpgOrdersListParams,
	listMyLpgOrders,
} from "@/lib/cooking-gas/api";
import type { AppColumnDef } from "@/lib/table";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authed/dashboard/cooking-gas")({
	component: CookingGasOrdersPage,
});

/** Customer-facing names for the request's wire statuses. */
export const CG_STATUS_LABELS: Record<string, string> = {
	"Pending Review": "Under review",
	Approved: "Quote ready",
	Rejected: "Rejected",
	Cancelled: "Cancelled",
};

/** Chip tone: rejection alerts, an issued quote reads positive. */
export function cgStatusTone(status: string): string {
	if (status === "Rejected" || status === "Cancelled") {
		return "border-destructive/30 bg-destructive/10 text-destructive";
	}
	if (status === "Approved") return "border-accent/40 bg-accent/15 text-accent";
	return "border-foreground/15 bg-muted/50 text-muted-foreground";
}

type FilterKey = "all" | "review" | "ready" | "rejected" | "cancelled";

const FILTERS: {
	key: FilterKey;
	label: string;
	params: Pick<LpgOrdersListParams, "status" | "paymentStatus">;
}[] = [
	{ key: "all", label: "All", params: {} },
	{
		key: "review",
		label: "Under review",
		params: { status: "Pending Review" },
	},
	{
		key: "ready",
		label: "Ready to pay",
		params: { status: "Approved", paymentStatus: "Unpaid" },
	},
	{
		key: "rejected",
		label: "Rejected",
		params: { status: "Rejected" },
	},
	{
		key: "cancelled",
		label: "Cancelled",
		params: { status: "Cancelled" },
	},
];

/** The quote column: a price once approved, "Pending" while under review. */
function quoteText(request: LpgOrderRequest): string {
	if (request.totalAmount != null) {
		const amount = formatNaira(Number(request.totalAmount));
		if (request.status === "Approved" && request.paymentStatus === "Unpaid") {
			return `${amount} · unpaid`;
		}
		return amount;
	}
	if (request.status === "Pending Review") return "Pending";
	return "—";
}

const formatDate = (iso?: string) =>
	iso
		? new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" })
		: "—";

/** Stable column defs — module-level so useReactTable never re-creates them. */
const columns: AppColumnDef<LpgOrderRequest>[] = [
	{
		accessorKey: "requestNumber",
		header: "Reference",
		cell: ({ row }) => (
			<span className="font-medium tabular-nums">
				{row.original.requestNumber}
			</span>
		),
	},
	{
		id: "cylinders",
		header: "Cylinders",
		cell: ({ row }) => (
			<span className="tabular-nums">
				{row.original.cylinderQuantity} × {row.original.cylinderSizeKg}kg
			</span>
		),
	},
	{
		id: "station",
		header: "Station",
		cell: ({ row }) => (
			<span className="block max-w-40 truncate text-muted-foreground">
				{row.original.stationName ?? "—"}
			</span>
		),
	},
	{
		id: "quote",
		header: "Quote",
		meta: { className: "text-right" },
		cell: ({ row }) => (
			<span className="tabular-nums">{quoteText(row.original)}</span>
		),
	},
	{
		id: "status",
		header: "Status",
		cell: ({ row }) => {
			const ready =
				row.original.status === "Approved" &&
				row.original.paymentStatus === "Unpaid";
			return (
				<span
					className={cn(
						"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
						ready
							? "border-accent/40 bg-accent/15 text-accent"
							: cgStatusTone(row.original.status),
					)}
				>
					{ready
						? "Quote ready"
						: (CG_STATUS_LABELS[row.original.status] ?? row.original.status)}
				</span>
			);
		},
	},
	{
		accessorKey: "createdAt",
		header: "Submitted",
		cell: ({ row }) => (
			<span className="text-muted-foreground tabular-nums">
				{formatDate(row.original.createdAt)}
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

/**
 * Cooking-gas desk: purpose line + how-it-works, pipeline counts, attention
 * strip for unpaid approved quotes, filter tabs, then the table. Counts come
 * from lightweight status-filtered list calls; the table is server-paginated.
 */
function CookingGasOrdersPage() {
	const navigate = useNavigate();
	const [filter, setFilter] = useState<FilterKey>("all");
	const [page, setPage] = useState(1);

	const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
	const listParams: LpgOrdersListParams = {
		page,
		limit: PAGE_SIZE,
		...active.params,
	};

	const { data, isLoading } = useQuery({
		queryKey: ["cooking-gas-orders", listParams],
		queryFn: () => listMyLpgOrders(listParams),
		refetchInterval: 10_000,
	});

	const countQueries = useQueries({
		queries: [
			{
				queryKey: ["cooking-gas-orders", "count", "review"],
				queryFn: () =>
					listMyLpgOrders({ page: 1, limit: 1, status: "Pending Review" }),
				refetchInterval: 10_000,
			},
			{
				queryKey: ["cooking-gas-orders", "count", "ready"],
				queryFn: () =>
					listMyLpgOrders({
						page: 1,
						limit: 1,
						status: "Approved",
						paymentStatus: "Unpaid",
					}),
				refetchInterval: 10_000,
			},
			{
				queryKey: ["cooking-gas-orders", "count", "rejected"],
				queryFn: () =>
					listMyLpgOrders({ page: 1, limit: 1, status: "Rejected" }),
				refetchInterval: 10_000,
			},
		],
	});

	const counts = useMemo(
		() => ({
			review: countQueries[0]?.data?.pagination.total ?? 0,
			ready: countQueries[1]?.data?.pagination.total ?? 0,
			rejected: countQueries[2]?.data?.pagination.total ?? 0,
		}),
		[countQueries],
	);

	const { data: attentionData } = useQuery({
		queryKey: ["cooking-gas-orders", "attention"],
		queryFn: () =>
			listMyLpgOrders({
				page: 1,
				limit: 10,
				status: "Approved",
				paymentStatus: "Unpaid",
			}),
		refetchInterval: 10_000,
	});

	const attention = attentionData?.requests ?? [];
	const rows = data?.requests ?? [];
	const pagination = data?.pagination;
	const isEmptyAll =
		filter === "all" && (!pagination || pagination.total === 0);

	const selectFilter = (key: FilterKey) => {
		setFilter(key);
		setPage(1);
	};

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header
				className="snapshot-rise flex flex-wrap items-end justify-between gap-4"
				style={{ animationDelay: "0ms" }}
			>
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground")}>
							Cooking gas
						</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						Cooking{" "}
						<em className="font-semibold text-accent not-italic">gas</em>.
					</h1>
					<p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
						Cylinder refills delivered to your door — request a quote, the
						Soroman team prices delivery, then you pay to confirm.
					</p>
					<p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
						<span>Request</span>
						<span aria-hidden className="opacity-40">
							→
						</span>
						<span>Staff review</span>
						<span aria-hidden className="opacity-40">
							→
						</span>
						<span>Quote ready</span>
						<span aria-hidden className="opacity-40">
							→
						</span>
						<span>Pay to confirm</span>
					</p>
				</div>
				<Button nativeButton={false} render={<Link to="/order/cooking-gas" />}>
					Order cooking gas
				</Button>
			</header>

			<div
				className="snapshot-rise mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
				style={{ animationDelay: "60ms" }}
				role="group"
				aria-label="Pipeline snapshot"
			>
				<PipelineCard
					label="Under review"
					value={counts.review}
					pressed={filter === "review"}
					onClick={() => selectFilter("review")}
				/>
				<PipelineCard
					label="Ready to pay"
					value={counts.ready}
					accent
					pressed={filter === "ready"}
					onClick={() => selectFilter("ready")}
				/>
				<PipelineCard
					label="Rejected"
					value={counts.rejected}
					danger
					pressed={filter === "rejected"}
					onClick={() => selectFilter("rejected")}
				/>
			</div>

			{attention.length > 0 && (
				<section
					className="snapshot-rise mt-5 overflow-hidden rounded-xl border border-accent/30 bg-accent/8"
					style={{ animationDelay: "90ms" }}
					aria-label="Needs your attention"
				>
					<div className="flex items-center justify-between gap-3 border-b border-accent/20 px-4 py-3 sm:px-5">
						<span className="text-[0.7rem] font-semibold tracking-[0.12em] text-accent uppercase">
							Needs your attention
						</span>
						<span className="font-mono text-[0.65rem] tracking-widest text-accent/80 uppercase tabular-nums">
							Quote ready
						</span>
					</div>
					<div>
						{attention.map((request) => (
							<button
								key={request.id}
								type="button"
								onClick={() =>
									navigate({
										to: "/dashboard/cooking-gas/$orderId",
										params: { orderId: String(request.id) },
									})
								}
								className="ease-luxe grid w-full cursor-pointer grid-cols-1 items-center gap-2 border-b border-accent/15 px-4 py-3.5 text-left transition-colors duration-250 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[1fr_auto_auto] sm:gap-4 sm:px-5"
							>
								<div className="min-w-0">
									<p className="text-sm font-semibold tabular-nums">
										{request.requestNumber}
									</p>
									<p className="mt-0.5 text-xs text-accent/80">
										{request.cylinderQuantity} × {request.cylinderSizeKg}kg
										{request.stationName ? ` · ${request.stationName}` : ""}
										{request.deliveryState ? ` · ${request.deliveryState}` : ""}
										{" · quote issued"}
									</p>
								</div>
								<p className="text-sm font-bold tabular-nums">
									{request.totalAmount != null
										? formatNaira(Number(request.totalAmount))
										: "—"}
								</p>
								<span className="text-xs font-semibold text-accent sm:text-right">
									View quote →
								</span>
							</button>
						))}
					</div>
				</section>
			)}

			<div
				className="snapshot-rise mt-8 flex flex-wrap gap-2"
				style={{ animationDelay: "110ms" }}
			>
				{FILTERS.map((f) => (
					<button
						key={f.key}
						type="button"
						aria-pressed={filter === f.key}
						onClick={() => selectFilter(f.key)}
						className={cn(
							"cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
							filter === f.key
								? "border-foreground bg-foreground text-background"
								: "border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
						)}
					>
						{f.label}
					</button>
				))}
			</div>

			<div className="snapshot-rise mt-6" style={{ animationDelay: "130ms" }}>
				<DataTable
					columns={columns}
					data={rows}
					isLoading={isLoading}
					emptyTitle={
						isEmptyAll
							? "No cooking-gas orders yet."
							: `No ${active.label.toLowerCase()} orders.`
					}
					emptyDescription={
						isEmptyAll
							? "Cylinder refills delivered to your door — request a quote, the Soroman team prices delivery, then you pay to confirm."
							: undefined
					}
					emptyAction={
						isEmptyAll ? (
							<Button
								nativeButton={false}
								render={<Link to="/order/cooking-gas" />}
							>
								Order cooking gas
							</Button>
						) : undefined
					}
					onRowClick={(request) =>
						navigate({
							to: "/dashboard/cooking-gas/$orderId",
							params: { orderId: String(request.id) },
						})
					}
					pagination={
						pagination
							? {
									page: pagination.page,
									pages: pagination.pages,
									total: pagination.total,
									label: "orders",
									alwaysShow: true,
									onPageChange: setPage,
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}

function PipelineCard({
	label,
	value,
	accent,
	danger,
	pressed,
	onClick,
}: {
	label: string;
	value: number;
	accent?: boolean;
	danger?: boolean;
	pressed: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={pressed}
			className={cn(
				"ease-luxe cursor-pointer rounded-xl border bg-card p-3.5 text-left transition-colors duration-220 outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-4",
				pressed
					? "border-accent/40 bg-accent/10"
					: "border-foreground/15 hover:border-foreground/30",
			)}
		>
			<span
				className={cn(
					"block text-2xl font-semibold tracking-tight tabular-nums",
					accent && value > 0 && "text-accent",
					danger && value > 0 && "text-destructive",
				)}
			>
				{value}
			</span>
			<span className="mt-1 block text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
				{label}
			</span>
		</button>
	);
}
