import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Commission } from "@/lib/api";
import type { AppColumnDef } from "@/lib/table";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/dashboard/commissions")({
	component: CommissionsPage,
});

const PAGE_SIZE = 20;

const formatWhen = (iso: string) =>
	new Date(iso).toLocaleString("en-NG", {
		dateStyle: "medium",
		timeStyle: "short",
	});

const columns: AppColumnDef<Commission>[] = [
	{
		accessorKey: "createdAt",
		header: "Date",
		cell: ({ row }) => (
			<span className="whitespace-nowrap text-muted-foreground tabular-nums">
				{formatWhen(row.original.createdAt)}
			</span>
		),
	},
	{
		accessorKey: "orderNumber",
		header: "Order",
		cell: ({ row }) => (
			<span className="font-medium tabular-nums">
				{row.original.orderNumber}
			</span>
		),
	},
	{
		accessorKey: "depotName",
		header: "Depot",
		cell: ({ row }) => (
			<span className="truncate">{row.original.depotName}</span>
		),
	},
	{
		accessorKey: "productName",
		header: "Product",
		cell: ({ row }) => (
			<span className="truncate">{row.original.productName}</span>
		),
	},
	{
		accessorKey: "quantity",
		header: "Qty (L)",
		meta: { className: "text-right" },
		cell: ({ row }) => (
			<span className="tabular-nums">
				{row.original.quantity.toLocaleString()}
			</span>
		),
	},
	{
		accessorKey: "commissionRate",
		header: "Rate",
		meta: { className: "text-right" },
		cell: ({ row }) => (
			<span className="tabular-nums text-muted-foreground">
				{formatNaira(row.original.commissionRate)}/L
			</span>
		),
	},
	{
		accessorKey: "commissionAmount",
		header: "Amount",
		meta: { className: "text-right" },
		cell: ({ row }) => (
			<span className="font-semibold tabular-nums">
				{formatNaira(row.original.commissionAmount)}
			</span>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const paid = row.original.status === "paid";
			return (
				<span
					className={cn(
						"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
						paid
							? "border-accent/40 bg-accent/15 text-accent"
							: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
					)}
				>
					{paid ? "Paid" : "Pending"}
				</span>
			);
		},
	},
];

function CommissionsPage() {
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">(
		"all",
	);

	const summaryQuery = useQuery({
		queryKey: ["commissions-summary"],
		queryFn: () => api.commissions.summary(),
	});

	const listQuery = useQuery({
		queryKey: ["commissions", page, statusFilter],
		queryFn: () =>
			api.commissions.list({
				page,
				limit: PAGE_SIZE,
				status: statusFilter,
			}),
	});

	const summary = summaryQuery.data;
	const rows = listQuery.data?.commissions ?? [];
	const pagination = listQuery.data?.pagination;

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
							Commissions
						</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						Your{" "}
						<em className="font-semibold text-accent not-italic">
							commissions
						</em>
						.
					</h1>
					<p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
						Earned on every paid order — pending commissions are credited to
						your wallet once confirmed.
					</p>
				</div>
			</header>

			<div
				className="snapshot-rise mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				style={{ animationDelay: "60ms" }}
			>
				<section className={cn(PANEL, "px-6 py-5")} aria-label="Total orders">
					<span className={MICRO}>Orders</span>
					{summaryQuery.isLoading ? (
						<Skeleton className="mt-3 h-9 w-20" />
					) : (
						<p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
							{summary?.totalOrders ?? 0}
						</p>
					)}
				</section>

				<section className={cn(PANEL, "px-6 py-5")} aria-label="Total quantity">
					<span className={MICRO}>Litres</span>
					{summaryQuery.isLoading ? (
						<Skeleton className="mt-3 h-9 w-28" />
					) : (
						<p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
							{(summary?.totalQuantity ?? 0).toLocaleString()}
						</p>
					)}
				</section>

				<section
					className={cn(PANEL, "px-6 py-5")}
					aria-label="Pending commissions"
				>
					<span className={cn(MICRO, "text-amber-600 dark:text-amber-400")}>
						Pending
					</span>
					{summaryQuery.isLoading ? (
						<Skeleton className="mt-3 h-9 w-32" />
					) : (
						<p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
							{formatNaira(summary?.pendingAmount ?? 0)}
						</p>
					)}
				</section>

				<section
					className={cn(PANEL, "px-6 py-5")}
					aria-label="Paid commissions"
				>
					<span className={cn(MICRO, "text-accent")}>Paid</span>
					{summaryQuery.isLoading ? (
						<Skeleton className="mt-3 h-9 w-32" />
					) : (
						<p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-accent">
							{formatNaira(summary?.paidAmount ?? 0)}
						</p>
					)}
				</section>
			</div>

			<div
				className="snapshot-rise mt-8 flex items-center gap-2"
				style={{ animationDelay: "90ms" }}
			>
				{(["all", "pending", "paid"] as const).map((s) => (
					<button
						key={s}
						onClick={() => {
							setStatusFilter(s);
							setPage(1);
						}}
						className={cn(
							"rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase transition-colors",
							statusFilter === s
								? "border-foreground bg-foreground text-background"
								: "border-foreground/15 text-muted-foreground hover:border-foreground/30",
						)}
					>
						{s === "all" ? "All" : s === "pending" ? "Pending" : "Paid"}
					</button>
				))}
			</div>

			<div className="snapshot-rise mt-4" style={{ animationDelay: "110ms" }}>
				<DataTable
					columns={columns}
					data={rows}
					isLoading={listQuery.isLoading}
					emptyTitle="No commissions yet."
					emptyDescription="Commissions are created when your orders are paid — they'll appear here as they're earned."
					pagination={
						pagination
							? {
									page: pagination.page,
									pages: pagination.pages,
									total: pagination.total,
									label: "commissions",
									alwaysShow: pagination.pages > 1,
									onPageChange: setPage,
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}
