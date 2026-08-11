import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRows, CopyAllButton } from "@/components/virtual-account";
import { env } from "@/env";
import {
	api,
	formatPriceValidUntil,
	type PaymentCredit,
	type PlacedOrder,
	type VirtualAccount,
} from "@/lib/api";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

export default function InvoiceStep({
	order,
	onReprice,
}: {
	order: PlacedOrder;
	/** Places the order again at current prices once the held price runs out. */
	onReprice: () => void;
}) {
	const [account, setAccount] = useState<VirtualAccount | null>(null);
	const [credits, setCredits] = useState<PaymentCredit[]>([]);
	const [now, setNow] = useState(() => Date.now());
	const [simulating, setSimulating] = useState(false);
	const [simError, setSimError] = useState<string | null>(null);
	const [walletBalance, setWalletBalance] = useState<number | null>(null);
	const [payingFromWallet, setPayingFromWallet] = useState(false);
	const [walletPaid, setWalletPaid] = useState(false);
	const [walletError, setWalletError] = useState<string | null>(null);

	const paid = credits.reduce((sum, c) => sum + c.amount, 0);
	const remaining = Math.max(0, order.total - paid);
	const fullyPaid = remaining === 0 && credits.length > 0;
	const deadlineMs = order.lock_expires_at
		? new Date(order.lock_expires_at).getTime()
		: null;
	const msLeft =
		deadlineMs == null ? Number.POSITIVE_INFINITY : Math.max(0, deadlineMs - now);
	const expired = deadlineMs != null && msLeft === 0 && !fullyPaid;
	// Instant payment is offered only while today's price still holds and the wallet
	// actually covers the whole bill; otherwise the customer transfers instead.
	const canPayFromWallet =
		!fullyPaid &&
		!expired &&
		walletBalance !== null &&
		walletBalance >= order.total;

	useEffect(() => {
		if (fullyPaid) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [fullyPaid]);

	useEffect(() => {
		let cancelled = false;
		void api.payments.dedicatedAccount().then((acct) => {
			if (!cancelled) setAccount(acct);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	// Wallet balance, to offer instant payment when it covers the total.
	useEffect(() => {
		let cancelled = false;
		void api.dashboard
			.overview()
			.then((d) => {
				if (!cancelled) setWalletBalance(d.wallet.balance);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	// Mock webhook stream — starts once the account exists, like the real one.
	// Stops once paid from wallet so it can't double-count the same order.
	useEffect(() => {
		if (!account || walletPaid) return;
		return api.payments.watchCredits(order.total, (credit) =>
			setCredits((prev) =>
				prev.some((c) => c.id === credit.id) ? prev : [...prev, credit],
			),
		);
	}, [account, order.total, walletPaid]);

	// Testers only. Fires the backend's test-mode simulate-payment; the credits
	// watcher above then flips the invoice to paid on its next poll, so there's
	// nothing to wire here beyond triggering it. Stays "confirming" until paid.
	const simulate = async () => {
		setSimulating(true);
		setSimError(null);
		try {
			await api.payments.simulate();
		} catch (e) {
			setSimError(
				e instanceof Error ? e.message : "Could not simulate payment.",
			);
			setSimulating(false);
		}
	};

	// Pay the whole bill from wallet balance. On success we record one wallet
	// credit for the total, which flips the invoice to paid and stops the
	// transfer watcher. A shortfall or a lapsed order surfaces as an inline error.
	const payFromWallet = async () => {
		setPayingFromWallet(true);
		setWalletError(null);
		try {
			await api.payments.payFromWallet();
			setWalletPaid(true);
			setCredits([
				{ id: "wallet", from: "Paid from wallet balance", amount: order.total },
			]);
		} catch (e) {
			setWalletError(
				e instanceof Error ? e.message : "Could not pay from wallet.",
			);
			setPayingFromWallet(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl">
			<div className="overflow-hidden rounded-xl border">
				<div className="flex items-center justify-between border-b px-5 py-3.5">
					<span className="text-[0.65rem] tracking-[0.25em] uppercase">
						Invoice {order.id}
					</span>
					<PriceBadge
						validUntil={order.lock_expires_at}
						expired={expired}
						paid={fullyPaid}
					/>
				</div>

				{expired && (
					<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/60 px-5 py-3">
						<p className="text-xs text-muted-foreground">
							This order&apos;s price is no longer valid. Reorder to continue at
							today&apos;s price.
						</p>
						<Button size="sm" onClick={onReprice}>
							Order at today's price
						</Button>
					</div>
				)}

				<div className="border-b px-5 py-4">
					{order.lines.map((l) => (
						<div
							key={l.product_id}
							className="flex justify-between gap-4 py-1 text-sm tabular-nums"
						>
							<span className="text-muted-foreground">
								{l.quantity.toLocaleString()}{" "}
								{l.unit === "litre" ? "L" : l.unit} {l.name} ·{" "}
								{order.depot_name}
							</span>
							<span>{formatNaira(l.unit_price * l.quantity)}</span>
						</div>
					))}
					<div className="mt-2 flex items-baseline justify-between border-t pt-3">
						<span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							Total due
						</span>
						<span className="text-xl font-semibold tracking-tight tabular-nums">
							{formatNaira(order.total)}
						</span>
					</div>
				</div>

				{canPayFromWallet && (
					<div className="border-b bg-accent/5 px-5 py-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-[0.65rem] tracking-[0.22em] text-accent uppercase">
									Pay instantly from wallet
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Balance {formatNaira(walletBalance ?? 0)} — enough to cover
									this order.
								</p>
							</div>
							<Button
								size="sm"
								onClick={payFromWallet}
								disabled={payingFromWallet}
							>
								{payingFromWallet
									? "Paying…"
									: `Pay ${formatNaira(order.total)} from wallet`}
							</Button>
						</div>
						{walletError && (
							<p className="mt-2 text-[0.65rem] text-destructive">
								{walletError}
							</p>
						)}
						<p className="mt-2 text-[0.6rem] leading-relaxed text-muted-foreground/60">
							Or transfer to your dedicated account below instead.
						</p>
					</div>
				)}

				<div className="border-b px-5 py-4">
					<div className="flex items-center justify-between gap-4">
						<p className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
							Transfer to your Soroman account
						</p>
						{account && <CopyAllButton account={account} />}
					</div>
					{account ? (
						<AccountRows account={account} className="mt-3 border-accent/40" />
					) : (
						<div className="mt-3 space-y-2" aria-live="polite">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<p className="text-[0.65rem] text-muted-foreground/70">
								Creating your dedicated account number…
							</p>
						</div>
					)}
					<p className="mt-2.5 text-[0.65rem] leading-relaxed text-muted-foreground/70">
						This account is yours permanently. Transfer from any bank, from as
						many accounts as you need. No reference code, every transfer matches
						automatically.
					</p>
				</div>

				<div className="px-5 py-4">
					<div className="flex justify-between text-[0.65rem] tracking-[0.12em] uppercase tabular-nums">
						<span className="text-accent">{formatNaira(paid)} received</span>
						<span
							className={cn(
								fullyPaid ? "text-accent" : "text-muted-foreground",
							)}
						>
							{fullyPaid ? "Fully paid" : `${formatNaira(remaining)} remaining`}
						</span>
					</div>
					<div className="mt-2 h-1 bg-muted">
						<div
							className="h-full bg-accent transition-[width] duration-500 ease-luxe"
							style={{ width: `${Math.min(100, (paid / order.total) * 100)}%` }}
						/>
					</div>
					<ul aria-live="polite">
						{credits.map((c) => (
							<li
								key={c.id}
								className="snapshot-rise mt-2.5 flex justify-between border-t pt-2.5 text-xs tabular-nums"
							>
								<span className="text-muted-foreground">{c.from}</span>
								<span className="text-accent">+{formatNaira(c.amount)}</span>
							</li>
						))}
					</ul>
					{!fullyPaid && (
						<p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground/70">
							{credits.length === 0 && account
								? "Waiting for your first transfer. "
								: ""}
							Transferred but not showing? It usually lands within minutes, and
							we'll SMS you the moment it does.
							<span className="text-muted-foreground/50">
								{" "}
								(Demo: transfers are simulated and land automatically.)
							</span>
						</p>
					)}

					{env.VITE_ENABLE_DEV_PAYMENT && !fullyPaid && (
						<div className="mt-4 border-t border-dashed pt-3">
							<Button
								size="sm"
								variant="outline"
								onClick={simulate}
								disabled={simulating || !account}
							>
								{simulating ? "Confirming payment…" : "Simulate payment (test)"}
							</Button>
							<p className="mt-1.5 text-[0.6rem] leading-relaxed text-muted-foreground/60">
								Testers only — credits your wallet and confirms this order.
								Disabled on production servers.
							</p>
							{simError && (
								<p className="mt-1 text-[0.65rem] text-destructive">
									{simError}
								</p>
							)}
						</div>
					)}
				</div>

				{fullyPaid && (
					<div className="snapshot-rise border-t border-accent/40 bg-accent/5 px-5 py-4">
						<p className="text-sm font-semibold text-accent">
							Payment complete — order {order.id} confirmed
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Your trucks are being scheduled. Every status change reaches you
							by SMS.{" "}
							{/* Tracking and the rest of the exits live in the
							NextSteps panel directly below, so this stays a confirmation. */}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function PriceBadge({
	validUntil,
	expired,
	paid,
}: {
	validUntil?: string;
	expired: boolean;
	paid: boolean;
}) {
	if (paid) {
		return (
			<span className="text-[0.65rem] tracking-[0.15em] text-accent uppercase">
				Paid
			</span>
		);
	}

	const until = formatPriceValidUntil(validUntil);
	if (!until && !expired) {
		return (
			<span className="text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
				Awaiting payment
			</span>
		);
	}
	return (
		<span className="text-[0.65rem] tracking-[0.15em] text-amber-700 uppercase tabular-nums dark:text-amber-500">
			{expired || !until ? "Price expired" : `Price valid till ${until}`}
		</span>
	);
}
