import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Copy,
	FileText,
	MessageCircle,
	Wallet,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import StatusTimeline from "@/components/dangote-delivery/status-timeline";
import { MICRO } from "@/components/dashboard/panel";
import {
	DetailBack,
	DetailRail,
	DetailRailCard,
	RailAction,
	railActionClass,
} from "@/components/orders/detail-rail";
import { OrderDetailSkeleton } from "@/components/orders/order-detail-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AccountRows, CopyAllButton } from "@/components/virtual-account";
import { api } from "@/lib/api";
import { WHATSAPP_URL } from "@/lib/company";
import {
	cancelMyDangoteOrder,
	getMyDangoteOrder,
	payMyDangoteOrder,
} from "@/lib/dangote-delivery/api";
import {
	type DangoteOrderRequest,
	formatDangoteQuantity,
	LICENSE_STATUS_LABELS,
	STATUS_LABELS,
} from "@/lib/dangote-delivery/types";
import { ApiError } from "@/lib/http";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

import { statusTone } from "./dangote-delivery";

export const Route = createFileRoute(
	"/_authed/dashboard/dangote-delivery_/$orderId",
)({
	component: DangoteDeliveryOrderDetailPage,
	head: ({ params }) => ({
		meta: [
			{ title: `Dangote order ${params.orderId} | Soroman Energy` },
			{
				name: "description",
				content:
					"Dangote delivery order details — quote, licence status, payment, and progress.",
			},
		],
	}),
});

/**
 * Dangote order detail — next-step (pay / wait) + order facts in the main
 * column; sticky Actions + Progress in the rail.
 */
function DangoteDeliveryOrderDetailPage() {
	const { orderId } = Route.useParams();

	const {
		data: request,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["dangote-delivery-order", orderId],
		queryFn: () => getMyDangoteOrder(Number(orderId)),
		refetchInterval: 10000,
		retry: false,
	});

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<DetailBack
				to="/dashboard/dangote-delivery"
				label="Back to Dangote orders"
			/>

			{isLoading ? (
				<OrderDetailSkeleton />
			) : isError || !request ? (
				<div className="mt-6 rounded-xl border border-dashed border-foreground/15 p-10 text-center">
					<p className="text-sm font-medium">We couldn't find that request.</p>
					<p className="mt-1 text-sm text-muted-foreground">
						It may have been removed, or the link is out of date.
					</p>
					<Button
						className="mt-5"
						nativeButton={false}
						render={<Link to="/dashboard/dangote-delivery" />}
					>
						Back to Dangote orders
					</Button>
				</div>
			) : (
				<RequestDetail request={request} />
			)}
		</div>
	);
}

function RequestDetail({ request }: { request: DangoteOrderRequest }) {
	const queryClient = useQueryClient();
	const [cancelOpen, setCancelOpen] = useState(false);

	const quoted = request.status === "Approved";
	const unpaid = request.paymentStatus === "Unpaid";
	const quoteReady = quoted && unpaid;
	const underReview = request.status === "Pending Review";
	const terminal =
		request.status === "Rejected" || request.status === "Cancelled";
	const canCancel =
		unpaid &&
		(request.status === "Pending Review" || request.status === "Approved");
	const total =
		request.totalAmount != null ? Number(request.totalAmount) : null;

	const { data: walletBalance } = useQuery({
		queryKey: ["wallet-balance"],
		queryFn: () => api.dashboard.overview().then((d) => d.wallet.balance),
		enabled: quoteReady,
	});

	const canPayFromWallet =
		quoteReady &&
		total != null &&
		total > 0 &&
		walletBalance != null &&
		walletBalance >= total;
	const shortfall =
		quoteReady &&
		total != null &&
		walletBalance != null &&
		walletBalance < total
			? total - walletBalance
			: null;

	const account = request.virtualAccountNumber
		? {
				bank: request.virtualAccountBank || "",
				account_number: request.virtualAccountNumber,
				account_name: request.virtualAccountName || "",
			}
		: null;

	const invalidate = () => {
		void queryClient.invalidateQueries({
			queryKey: ["dangote-delivery-order", String(request.id)],
		});
		void queryClient.invalidateQueries({
			queryKey: ["dangote-delivery-orders"],
		});
		void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
	};

	const pay = useMutation({
		mutationFn: () => payMyDangoteOrder(request.id),
		onSuccess: invalidate,
	});

	const cancel = useMutation({
		mutationFn: () => cancelMyDangoteOrder(request.id),
		onSuccess: () => {
			invalidate();
			setCancelOpen(false);
		},
	});

	const copyRef = async () => {
		try {
			await navigator.clipboard.writeText(request.requestNumber);
			toast.success("Reference copied");
		} catch {
			toast.error("Couldn't copy reference");
		}
	};

	const statusLabel = quoteReady
		? "Order ready"
		: (STATUS_LABELS[request.status] ?? request.status);

	const headerMeta = [
		request.companyName || null,
		request.deliveryState || null,
		underReview ? "Submitted for review" : null,
		quoteReady ? "Order ready — pay to confirm" : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<>
			<header
				className="snapshot-rise mt-6 flex flex-wrap items-start justify-between gap-4"
				style={{ animationDelay: "0ms" }}
			>
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground tabular-nums")}>
							{request.requestNumber}
						</span>
					</div>
					<h1 className="mt-4 text-2xl leading-tight tracking-tight md:text-3xl">
						{formatDangoteQuantity(request.quantity, request.quantityUnit)}{" "}
						{request.product}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">{headerMeta}</p>
				</div>
				<span
					className={cn(
						"mt-1 inline-block rounded-full border px-2.5 py-1 text-[0.65rem] font-medium tracking-widest uppercase",
						quoteReady
							? "border-accent/40 bg-accent/15 text-accent"
							: statusTone(request.status),
					)}
				>
					{statusLabel}
				</span>
			</header>

			<div
				className="snapshot-rise mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
				style={{ animationDelay: "90ms" }}
			>
				<div className="min-w-0 space-y-6">
					{underReview && (
						<section className="rounded-xl border border-foreground/15 p-5">
							<p className={cn(MICRO, "text-muted-foreground")}>
								What&apos;s happening
							</p>
							<p className="mt-2.5 text-base font-medium tracking-tight">
								The Dangote team is reviewing and pricing this order.
							</p>
							<p className="mt-2 max-w-xl text-sm text-muted-foreground">
								Nothing to pay yet. When your order is priced, this page will
								show transfer details and wallet pay. Typical turnaround is 1–2
								business days.
							</p>
						</section>
					)}

					{quoteReady && total != null && (
						<section className="overflow-hidden rounded-xl border border-accent/35 bg-card">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/20 bg-accent/8 px-5 py-3.5">
								<span className={cn(MICRO, "text-accent")}>
									Next — pay to confirm
								</span>
								<span className="text-sm font-semibold tabular-nums">
									{formatNaira(total)}
								</span>
							</div>
							<div className="space-y-4 px-5 py-5">
								<dl className="grid gap-x-8 gap-y-3 text-xs sm:grid-cols-3">
									<div>
										<dt className="text-muted-foreground">Price per unit</dt>
										<dd className="mt-0.5 font-medium tabular-nums">
											{request.pricePerUnit != null
												? formatNaira(Number(request.pricePerUnit))
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Delivery</dt>
										<dd className="mt-0.5 font-medium tabular-nums">
											{request.deliveryPrice != null
												? formatNaira(Number(request.deliveryPrice))
												: "Included"}
										</dd>
									</div>
									{request.expectedArrivalDate && (
										<div>
											<dt className="text-muted-foreground">
												Expected arrival
											</dt>
											<dd className="mt-0.5 font-medium tabular-nums">
												{request.expectedArrivalDate}
											</dd>
										</div>
									)}
								</dl>

								{walletBalance != null && !canPayFromWallet && (
									<div className="rounded-lg border border-amber-500/35 bg-amber-500/8 px-4 py-3">
										<p className="text-xs font-medium text-amber-900">
											Wallet balance {formatNaira(walletBalance)} — short by{" "}
											{formatNaira(shortfall ?? 0)}.
										</p>
										<p className="mt-1 text-xs text-amber-900/75">
											Transfer the full {formatNaira(total)} below, or top up
											first.
										</p>
									</div>
								)}

								{account ? (
									<div>
										<div className="flex items-center justify-between gap-3">
											<p className={cn(MICRO, "text-muted-foreground")}>
												Transfer to your Soroman account
											</p>
											<CopyAllButton account={account} />
										</div>
										<AccountRows
											account={account}
											className="mt-3 border-foreground/15"
										/>
										<p className="mt-3 text-xs text-muted-foreground">
											Transfer the exact total — payment confirms automatically.
										</p>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Transfer details aren&apos;t available yet. Try refreshing.
									</p>
								)}
							</div>
						</section>
					)}

					{quoted && !unpaid && (
						<section className="rounded-xl border border-accent/30 bg-accent/8 p-5">
							<p className={cn(MICRO, "text-accent")}>Order paid</p>
							<p className="mt-2 text-sm font-medium tabular-nums">
								{total != null ? formatNaira(total) : "—"} confirmed
							</p>
							{request.expectedArrivalDate && (
								<p className="mt-1 text-sm text-muted-foreground">
									Expected arrival {request.expectedArrivalDate}
								</p>
							)}
						</section>
					)}

					{terminal && (
						<section className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
							<p className={cn(MICRO, "text-destructive")}>
								{STATUS_LABELS[request.status] ?? request.status}
							</p>
							<p className="mt-2 text-sm text-muted-foreground">
								{request.status === "Cancelled"
									? "You withdrew this order. Place a new one anytime."
									: "This order didn't pass review. Contact support if you need help."}
							</p>
						</section>
					)}

					<section className="rounded-xl border border-foreground/15 p-5">
						<p className={cn(MICRO, "text-muted-foreground")}>Request</p>
						<dl className="mt-4 grid gap-x-8 gap-y-3 text-xs sm:grid-cols-3">
							<div>
								<dt className="text-muted-foreground">Product</dt>
								<dd className="mt-0.5 font-medium">{request.product}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Quantity</dt>
								<dd className="mt-0.5 font-medium tabular-nums">
									{formatDangoteQuantity(
										request.quantity,
										request.quantityUnit,
									)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Price</dt>
								<dd className="mt-0.5 font-medium tabular-nums">
									{total != null ? formatNaira(total) : "Awaiting"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Company</dt>
								<dd className="mt-0.5 font-medium">
									{request.companyName || "—"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Delivery</dt>
								<dd className="mt-0.5 font-medium">
									{request.deliveryState || "—"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">License</dt>
								<dd className="mt-0.5 font-medium">
									{request.licenseId
										? LICENSE_STATUS_LABELS[request.licenseStatus ?? "pending"]
										: "None on file"}
								</dd>
							</div>
							<div className="sm:col-span-3">
								<dt className="text-muted-foreground">Address</dt>
								<dd className="mt-0.5 font-medium">
									{request.deliveryAddress}
								</dd>
							</div>
						</dl>
					</section>
				</div>

				<DetailRail>
					<DetailRailCard title="Actions">
						<div className="space-y-1">
							{canPayFromWallet && total != null && (
								<>
									<Button
										className="mb-1 w-full cursor-pointer"
										disabled={pay.isPending}
										onClick={() => pay.mutate()}
									>
										<Wallet data-icon="inline-start" />
										{pay.isPending
											? "Paying…"
											: `Pay ${formatNaira(total)} from wallet`}
									</Button>
									{pay.isError && (
										<p className="mb-2 px-1 text-xs text-destructive">
											{pay.error instanceof ApiError
												? pay.error.message
												: "Could not pay from wallet."}
										</p>
									)}
								</>
							)}
							{quoteReady && !canPayFromWallet && walletBalance != null && (
								<p className="mb-2 px-1 text-xs text-muted-foreground">
									Wallet {formatNaira(walletBalance)} — use the transfer account
									on the left.
								</p>
							)}
							{canCancel && (
								<>
									{(canPayFromWallet || quoteReady) && (
										<div className="my-2 h-px bg-foreground/10" />
									)}
									<RailAction destructive onClick={() => setCancelOpen(true)}>
										<XCircle />
										Cancel order
									</RailAction>
								</>
							)}
							<RailAction onClick={() => void copyRef()}>
								<Copy />
								Copy reference
							</RailAction>
							{request.licenseId && (
								<Link to="/dashboard/licenses" className={railActionClass()}>
									<FileText />
									View licenses
								</Link>
							)}
							<RailAction href={WHATSAPP_URL}>
								<MessageCircle />
								Contact support
							</RailAction>
						</div>
					</DetailRailCard>

					<DetailRailCard title="Progress">
						<StatusTimeline request={request} />
					</DetailRailCard>
				</DetailRail>
			</div>

			<Dialog
				open={cancelOpen}
				onOpenChange={(next) => {
					if (cancel.isPending) return;
					setCancelOpen(next);
					if (!next) cancel.reset();
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Cancel {request.requestNumber}?</DialogTitle>
						<DialogDescription>
							{request.status === "Approved"
								? "Withdraws this order. You can place a new order anytime."
								: "Pulls the order out of review. You can place a new one anytime."}
						</DialogDescription>
					</DialogHeader>
					{cancel.isError && (
						<p className="px-5 text-xs text-destructive">
							{cancel.error instanceof ApiError
								? cancel.error.message
								: "Could not cancel this order."}
						</p>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							className="cursor-pointer"
							disabled={cancel.isPending}
							onClick={() => setCancelOpen(false)}
						>
							Keep order
						</Button>
						<Button
							variant="destructive"
							className="cursor-pointer"
							disabled={cancel.isPending}
							onClick={() => cancel.mutate()}
						>
							{cancel.isPending ? "Cancelling…" : "Cancel order"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
