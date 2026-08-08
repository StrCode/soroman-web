import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRows, CopyAllButton } from "@/components/virtual-account";
import { api, type VirtualAccount } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * The customer's permanent Paystack dedicated account. It's created lazily when
 * they place their first order (order.service.placeOrder), not on sign-up, so
 * the panel walks these states:
 *   profile incomplete → complete your profile
 *   loading            → skeleton, only while the fetch is in flight
 *   ready              → the account, copyable
 *   none               → no order yet: point them at their first order
 *
 * `me.virtualAccount()` throws 404 until that first order assigns the account,
 * so "none" must be distinct from "loading" — otherwise the panel sits on
 * pulsing skeletons forever, implying content that never arrives.
 */
type LoadStatus = "loading" | "ready" | "none";

export function PaymentsPanel() {
	const auth = useAuth();
	const customer = auth.status === "authed" ? auth.customer : null;
	const profileReady = Boolean(customer?.name || customer?.company_name);
	const [account, setAccount] = useState<VirtualAccount | null>(null);
	const [status, setStatus] = useState<LoadStatus>("loading");

	useEffect(() => {
		if (!profileReady) return;
		let cancelled = false;
		setStatus("loading");
		void api.me
			.virtualAccount()
			.then((acct) => {
				if (cancelled) return;
				setAccount(acct);
				setStatus("ready");
			})
			.catch(() => {
				// 404 until the first order assigns it — a "not yet", not a failure.
				if (cancelled) return;
				setAccount(null);
				setStatus("none");
			});
		return () => {
			cancelled = true;
		};
	}, [profileReady]);

	return (
		<section className={PANEL} aria-label="Payments">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Payments</span>
				<span className="text-xs text-muted-foreground">
					Bank transfer, any bank
				</span>
			</div>

			<div className="px-6 py-6">
				{!profileReady ? (
					<p className="text-sm text-muted-foreground">
						Your dedicated account number is named after you. Add your name or
						company in your profile, then place your first order and it'll be
						assigned automatically.
					</p>
				) : status === "loading" ? (
					<div className="space-y-2" aria-live="polite">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : account ? (
					<>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-medium">Your dedicated account</p>
							<CopyAllButton account={account} />
						</div>
						<AccountRows
							account={account}
							className="mt-3 border-foreground/15"
						/>
					</>
				) : (
					<div className="flex flex-col items-center gap-3 py-2 text-center">
						<span className="flex size-10 items-center justify-center rounded-full border border-foreground/15 bg-muted/50 text-muted-foreground">
							<Landmark className="size-5" />
						</span>
						<div className="space-y-1">
							<p className="text-sm font-medium">No account yet</p>
							<p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
								Your dedicated account is created when you place your first
								order — it'll appear here and stay yours for every payment
								after.
							</p>
						</div>
						<Button
							size="sm"
							nativeButton={false}
							render={<Link to="/order" />}
						>
							Place your first order
						</Button>
					</div>
				)}
			</div>

			<div className="bg-muted/60 px-6 py-3">
				<p className="text-xs leading-relaxed text-muted-foreground">
					This account is yours permanently. Save it as a beneficiary in your
					bank app; transfers fund your invoices automatically, no reference
					code needed.
				</p>
			</div>
		</section>
	);
}
