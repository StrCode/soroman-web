import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { SUPPORT_PHONE } from "@/lib/company";

/**
 * How payments work now that personal Paystack dedicated accounts are gone
 * (the backend is manual-deposit only): every unpaid order shows the exact
 * depot bank account to transfer into, and wallet deposits are recorded by
 * Soroman staff once a transfer is confirmed. This panel explains that flow
 * instead of promising a permanent personal account that no longer exists.
 */
export function PaymentsPanel() {
	return (
		<section className={PANEL} aria-label="Payments">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Payments</span>
				<span className="text-xs text-muted-foreground">
					Bank transfer, per order
				</span>
			</div>

			<div className="px-6 py-6">
				<div className="flex flex-col items-center gap-3 py-2 text-center">
					<span className="flex size-10 items-center justify-center rounded-full border border-foreground/15 bg-muted/50 text-muted-foreground">
						<Landmark className="size-5" />
					</span>
					<div className="space-y-1">
						<p className="text-sm font-medium">Pay per order</p>
						<p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
							Every unpaid order shows the exact bank account to transfer into —
							you'll find it on the order's payment screen and in your
							dashboard.
						</p>
					</div>
					<Button size="sm" nativeButton={false} render={<Link to="/order" />}>
						Place an order
					</Button>
				</div>
			</div>

			<div className="bg-muted/60 px-6 py-3">
				<p className="text-xs leading-relaxed text-muted-foreground">
					Wallet deposits are recorded by Soroman once your transfer is
					confirmed. To top up ahead of an order, contact Soroman on{" "}
					<a
						href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
						className="font-medium underline-offset-4 hover:underline"
					>
						{SUPPORT_PHONE}
					</a>
					.
				</p>
			</div>
		</section>
	);
}
