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
import {
	api,
	formatPriceValidUntil,
	type OrderRecord,
	type VirtualAccount,
} from "@/lib/api";
import { ApiError } from "@/lib/http";
import { seedDraftFromOrder } from "@/lib/order-draft";
import { formatNaira } from "@/lib/use-catalog";

type PayDialogProps = {
	order: OrderRecord;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * Pay modal for an unpaid depot order: transfer account always shown, plus
 * wallet pay when the balance covers it — or a clear shortfall when it doesn't.
 */
export function DepotPayDialog({ order, open, onOpenChange }: PayDialogProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: walletBalance, isLoading: walletLoading } = useQuery({
		queryKey: ["wallet-balance"],
		queryFn: () => api.dashboard.overview().then((d) => d.wallet.balance),
		enabled: open,
	});

	// List rows sometimes omit the VA — pull detail when the modal opens so
	// transfer details are always available for an unpaid order.
	const needsAccount = !order.account;
	const { data: detail, isLoading: detailLoading } = useQuery({
		queryKey: ["order", order.id],
		queryFn: () => api.orders.get(order.id),
		enabled: open && needsAccount,
	});

	const account: VirtualAccount | null =
		order.account ?? detail?.account ?? null;

	const canPayFromWallet =
		walletBalance != null && walletBalance >= order.total;
	const shortfall =
		walletBalance != null && walletBalance < order.total
			? order.total - walletBalance
			: null;

	const pay = useMutation({
		mutationFn: () => api.orders.payByRef(order.id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["orders"] });
			void queryClient.invalidateQueries({ queryKey: ["order", order.id] });
			void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
			onOpenChange(false);
		},
	});

	const openDetail = () => {
		onOpenChange(false);
		void navigate({
			to: "/dashboard/orders/$orderId",
			params: { orderId: order.id },
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
					<DialogTitle>Pay {order.id}</DialogTitle>
					<DialogDescription>
						{formatNaira(order.total)} due
						{order.lock_expires_at
							? ` — price valid till ${formatPriceValidUntil(order.lock_expires_at)}.`
							: "."}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 px-5">
					{/* Transfer first — the path that always works. */}
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
							Transfer details aren&apos;t available yet. Open the order or try
							again in a moment.
						</p>
					)}

					{/* Wallet: pay button when covered, shortfall callout when not. */}
					{walletLoading ? (
						<Skeleton className="h-16 rounded-lg" />
					) : canPayFromWallet ? (
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
									: `Pay ${formatNaira(order.total)} from wallet`}
							</Button>
						</div>
					) : walletBalance != null ? (
						<div className="rounded-lg border border-amber-500/35 bg-amber-500/8 px-4 py-3">
							<p className="text-xs font-medium text-amber-900">
								Wallet balance {formatNaira(walletBalance)} — short by{" "}
								{formatNaira(shortfall ?? 0)}.
							</p>
							<p className="mt-1 text-xs text-amber-900/75">
								Transfer the full {formatNaira(order.total)} to the account
								above, or top up your wallet first.
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
 * Per-row actions for the depot orders desk: open detail, pay, cancel, reorder.
 * Stops row-click navigation when the menu or dialogs are used.
 */
export function DepotOrderActions({ order }: { order: OrderRecord }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [payOpen, setPayOpen] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);

	const unpaid = order.status === "awaiting_payment";
	const canCancel = unpaid;
	const canReorder =
		order.status === "loaded" ||
		order.status === "cancelled" ||
		order.status === "expired" ||
		order.status === "awaiting_payment";

	const cancel = useMutation({
		mutationFn: () => api.orders.cancelByRef(order.id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["orders"] });
			void queryClient.invalidateQueries({ queryKey: ["order", order.id] });
			setCancelOpen(false);
		},
	});

	const openDetail = () => {
		void navigate({
			to: "/dashboard/orders/$orderId",
			params: { orderId: order.id },
		});
	};

	const reorder = () => {
		seedDraftFromOrder(order);
		void navigate({ to: "/order/depot" });
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
					<span className="sr-only">Actions for {order.id}</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={openDetail}>Open</DropdownMenuItem>
						{unpaid && (
							<DropdownMenuItem onClick={() => setPayOpen(true)}>
								Pay now
							</DropdownMenuItem>
						)}
						{canReorder && (
							<DropdownMenuItem onClick={reorder}>Reorder</DropdownMenuItem>
						)}
						{canCancel && (
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

			<DepotPayDialog order={order} open={payOpen} onOpenChange={setPayOpen} />

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
						<DialogTitle>Cancel {order.id}?</DialogTitle>
						<DialogDescription>
							Releases the reserved stock and today&apos;s price. This
							can&apos;t be undone — reorder if you change your mind.
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
