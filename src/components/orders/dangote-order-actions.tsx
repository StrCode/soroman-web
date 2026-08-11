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
import { type VirtualAccount } from "@/lib/api";
import {
	cancelMyDangoteOrder,
	getMyDangoteOrder,
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
 * Quote / pay modal: show the staff-entered bank account for transfer.
 * Payment is confirmed manually by staff after the transfer clears.
 */
export function DangoteQuoteDialog({
	request,
	open,
	onOpenChange,
}: QuoteDialogProps) {
	const navigate = useNavigate();
	const total =
		request.totalAmount != null ? Number(request.totalAmount) : null;

	const { data: detail, isLoading: detailLoading } = useQuery({
		queryKey: ["dangote-delivery-order", String(request.id)],
		queryFn: () => getMyDangoteOrder(request.id),
		enabled: open,
	});

	const displayAccount: VirtualAccount | null = (() => {
		const number =
			request.virtualAccountNumber || detail?.virtualAccountNumber || "";
		if (!number) return null;
		return {
			bank: request.virtualAccountBank || detail?.virtualAccountBank || "",
			account_number: number,
			account_name: detail?.virtualAccountName || "",
		};
	})();

	const openDetail = () => {
		onOpenChange(false);
		void navigate({
			to: "/dashboard/dangote-delivery/$orderId",
			params: { orderId: String(request.id) },
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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

					{detailLoading && !displayAccount ? (
						<Skeleton className="h-28 rounded-lg" />
					) : displayAccount ? (
						<div>
							<p className="mb-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
								Transfer to this account
							</p>
							<AccountRows
								account={displayAccount}
								className="border-foreground/15"
							/>
							<div className="mt-2 flex justify-end">
								<CopyAllButton account={displayAccount} />
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Transfer the exact total. Once received, Soroman will confirm
								payment on this order.
							</p>
						</div>
					) : (
						<p className="text-xs text-muted-foreground">
							Transfer details aren&apos;t available yet. Open the order or
							try again in a moment.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						className="cursor-pointer"
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
								View payment details
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
