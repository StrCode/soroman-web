import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { AccountRows, CopyAllButton } from "@/components/virtual-account";
import { api, type VirtualAccount } from "@/lib/api";
import {
	cancelMyDangoteOrder,
	getMyDangoteOrder,
	payMyDangoteOrder,
} from "@/lib/dangote-delivery/api";
import {
	type DangoteOrderRequestSummary,
	formatDangoteQuantity,
} from "@/lib/dangote-delivery/types";
import { ApiError } from "@/lib/http";
import { formatNaira } from "@/lib/use-catalog";

function canCancelRequest(r: DangoteOrderRequestSummary): boolean {
	if (r.paymentStatus === "Paid") return false;
	return r.status === "Pending Review" || r.status === "Approved";
}

function isQuoteReady(r: DangoteOrderRequestSummary): boolean {
	return r.status === "Approved" && r.paymentStatus === "Unpaid";
}

type QuoteDialogProps = {
	request: DangoteOrderRequestSummary;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * Quote / pay modal: transfer account always shown, wallet pay when covered,
 * or a clear shortfall when the balance isn't enough.
 */
export function DangoteQuoteDialog({
	request,
	open,
	onOpenChange,
}: QuoteDialogProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const total =
		request.totalAmount != null ? Number(request.totalAmount) : null;

	const { data: walletBalance, isLoading: walletLoading } = useQuery({
		queryKey: ["wallet-balance"],
		queryFn: () => api.dashboard.overview().then((d) => d.wallet.balance),
		enabled: open,
	});

	const needsAccount = !request.virtualAccountNumber;
	const { data: detail, isLoading: detailLoading } = useQuery({
		queryKey: ["dangote-delivery-order", String(request.id)],
		queryFn: () => getMyDangoteOrder(request.id),
		enabled: open && needsAccount,
	});

	const account: VirtualAccount | null = (() => {
		const number =
			request.virtualAccountNumber || detail?.virtualAccountNumber || "";
		if (!number) return null;
		return {
			bank: request.virtualAccountBank || detail?.virtualAccountBank || "",
			account_number: number,
			account_name: detail?.virtualAccountName || "",
		};
	})();

	const canPayFromWallet =
		total != null &&
		total > 0 &&
		walletBalance != null &&
		walletBalance >= total;
	const shortfall =
		total != null && walletBalance != null && walletBalance < total
			? total - walletBalance
			: null;

	const pay = useMutation({
		mutationFn: () => payMyDangoteOrder(request.id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["dangote-delivery-orders"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["dangote-delivery-order", String(request.id)],
			});
			void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
			onOpenChange(false);
		},
	});

	const openDetail = () => {
		onOpenChange(false);
		void navigate({
			to: "/dashboard/dangote-delivery/$orderId",
			params: { orderId: String(request.id) },
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (pay.isPending) return;
				onOpenChange(next);
				if (!next) pay.reset();
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{request.requestNumber}</DialogTitle>
					<DialogDescription>
						{request.product} ·{" "}
						{formatDangoteQuantity(request.quantity, request.quantityUnit)}
						{total != null ? ` · ${formatNaira(total)}` : ""}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 px-5">
					{total != null && (
						<dl className="grid grid-cols-2 gap-3 text-xs">
							{request.pricePerUnit != null && (
								<div>
									<dt className="text-muted-foreground">Price per unit</dt>
									<dd className="mt-0.5 font-medium tabular-nums">
										{formatNaira(Number(request.pricePerUnit))}
									</dd>
								</div>
							)}
							<div>
								<dt className="text-muted-foreground">Total</dt>
								<dd className="mt-0.5 text-sm font-semibold tabular-nums">
									{formatNaira(total)}
								</dd>
							</div>
						</dl>
					)}

					{detailLoading && needsAccount ? (
						<Skeleton className="h-28 rounded-lg" />
					) : account ? (
						<div>
							<p className="mb-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
								Transfer to your Soroman account
							</p>
							<AccountRows account={account} className="border-foreground/15" />
							<div className="mt-2 flex justify-end">
								<CopyAllButton account={account} />
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Transfer the exact total — payment confirms automatically.
							</p>
						</div>
					) : (
						<p className="text-xs text-muted-foreground">
							Transfer details aren&apos;t available yet. Open the order or
							try again in a moment.
						</p>
					)}

					{walletLoading ? (
						<Skeleton className="h-16 rounded-lg" />
					) : canPayFromWallet && total != null ? (
						<div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Wallet balance {formatNaira(walletBalance ?? 0)} — covers this
								order.
							</p>
							<Button
								className="mt-3 w-full cursor-pointer"
								disabled={pay.isPending}
								onClick={() => pay.mutate()}
							>
								{pay.isPending
									? "Paying…"
									: `Pay ${formatNaira(total)} from wallet`}
							</Button>
						</div>
					) : walletBalance != null && total != null ? (
						<div className="rounded-lg border border-amber-500/35 bg-amber-500/8 px-4 py-3">
							<p className="text-xs font-medium text-amber-900">
								Wallet balance {formatNaira(walletBalance)} — short by{" "}
								{formatNaira(shortfall ?? 0)}.
							</p>
							<p className="mt-1 text-xs text-amber-900/75">
								Transfer the full {formatNaira(total)} to the account above, or
								top up your wallet first.
							</p>
						</div>
					) : null}

					{pay.isError && (
						<p className="text-xs text-destructive">
							{pay.error instanceof ApiError
								? pay.error.message
								: "Could not pay from wallet."}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						className="cursor-pointer"
						disabled={pay.isPending}
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button className="cursor-pointer" onClick={openDetail}>
						Open order
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Per-row actions for the Dangote orders desk. Stops row-click navigation
 * when the menu or dialogs are used.
 */
export function DangoteOrderActions({
	request,
}: {
	request: DangoteOrderRequestSummary;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [quoteOpen, setQuoteOpen] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);

	const quoteReady = isQuoteReady(request);
	const cancellable = canCancelRequest(request);

	const cancel = useMutation({
		mutationFn: () => cancelMyDangoteOrder(request.id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["dangote-delivery-orders"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["dangote-delivery-order", String(request.id)],
			});
			setCancelOpen(false);
		},
	});

	const openDetail = () => {
		void navigate({
			to: "/dashboard/dangote-delivery/$orderId",
			params: { orderId: String(request.id) },
		});
	};

	const stopRow = (e: SyntheticEvent) => {
		e.stopPropagation();
	};

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
		<div onClick={stopRow} onKeyDown={stopRow}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="ghost" size="icon-sm" className="cursor-pointer" />
					}
				>
					<MoreHorizontal className="size-4" />
					<span className="sr-only">Actions for {request.requestNumber}</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={openDetail}>Open</DropdownMenuItem>
						{quoteReady && (
							<DropdownMenuItem onClick={() => setQuoteOpen(true)}>
								View order
							</DropdownMenuItem>
						)}
						{cancellable && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => setCancelOpen(true)}
								>
									Cancel order
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<DangoteQuoteDialog
				request={request}
				open={quoteOpen}
				onOpenChange={setQuoteOpen}
			/>

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
		</div>
	);
}
