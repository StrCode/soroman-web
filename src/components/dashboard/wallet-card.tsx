import { Link } from "@tanstack/react-router";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyIconButton } from "@/components/virtual-account";
import type { VirtualAccount } from "@/lib/api";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * Wallet balance — the signal the old dashboard never surfaced. Balance pays
 * an order instantly, so it leads; the coverage line turns an abstract naira
 * figure into litres ("how much fuel is this?"); the dedicated account below
 * is the one-glance way to top it up. When Paystack hasn't assigned an
 * account yet, the top-up row falls back to a quiet placeholder.
 */
export default function WalletCard({
	balance,
	todayPrice,
	account,
	accountPending,
}: {
	balance: number;
	/** Lowest current price across open depots, for the litres estimate. */
	todayPrice: number | null;
	account: VirtualAccount | null;
	accountPending: boolean;
}) {
	const litres =
		todayPrice && todayPrice > 0 ? Math.floor(balance / todayPrice) : null;

	return (
		<section className={cn(PANEL, "flex h-full flex-col")} aria-label="Wallet">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Wallet balance</span>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="ghost"
						nativeButton={false}
						render={<Link to="/dashboard/wallet" />}
					>
						History
					</Button>
					<Button
						size="sm"
						variant="secondary"
						nativeButton={false}
						render={<Link to="/order" />}
					>
						New order
					</Button>
				</div>
			</div>

			<div className="px-6 pt-5 pb-6">
				<Link
					to="/dashboard/wallet"
					className="ease-luxe block rounded-sm outline-hidden transition-opacity duration-250 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
				>
					<p className="text-3xl leading-none font-semibold tracking-tight tabular-nums md:text-4xl">
						{formatNaira(balance)}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						{balance <= 0
							? "Fund your wallet to pay orders instantly."
							: litres !== null
								? `About ${litres.toLocaleString()} L at today's best price.`
								: "Spendable on your next order."}
					</p>
				</Link>
			</div>

			<div className="mt-auto border-t border-foreground/15 bg-muted/40 px-6 py-3.5">
				<div className="flex items-center gap-2">
					<span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
						Fund via transfer
					</span>
				</div>
				{account ? (
					<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
						<span className="inline-flex items-center gap-2 whitespace-nowrap">
							<span className="text-sm font-semibold tracking-wide tabular-nums">
								{account.account_number}
							</span>
							<CopyIconButton
								value={account.account_number}
								label="Copy account number"
							/>
						</span>
						<span className="text-xs text-muted-foreground">
							{account.bank} · {account.account_name}
						</span>
					</div>
				) : accountPending ? (
					<Skeleton className="mt-2 h-4 w-56" />
				) : (
					<div className="mt-2 space-y-1.5">
						<p className="text-xs text-muted-foreground">
							Your dedicated account is created when you place your first order.
						</p>
						<Link
							to="/order"
							className="inline-flex text-xs font-medium text-accent underline-offset-4 hover:underline"
						>
							Place your first order →
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
