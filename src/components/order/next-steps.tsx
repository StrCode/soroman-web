import { Link } from "@tanstack/react-router";
import {
	MapPin,
	MessageCircle,
	PackagePlus,
	Phone,
	ReceiptText,
} from "lucide-react";
import { StoreBadges } from "@/components/store-badges";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
	LOADING_HOURS,
	SUPPORT_EMAIL,
	SUPPORT_PHONE,
	telHref,
	WHATSAPP_URL,
} from "@/lib/company";

/**
 * The closing panel of the depot wizard, under the invoice. Payment is the
 * last step, so without this the buyer's only exit is the browser's back
 * button — this gives the order somewhere to go next (track it, open it, start
 * another) and puts the desk one tap away while a transfer is still landing.
 *
 * It shows from the moment the order exists, not only once paid: "where is my
 * money" is exactly when someone reaches for support.
 */
export default function NextSteps({ orderId }: { orderId: string }) {
	const auth = useAuth();

	return (
		<div className="mx-auto mt-6 max-w-2xl">
			<div className="overflow-hidden rounded-xl border">
				<div className="border-b px-5 py-4">
					<p className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
						What's next
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Button
							size="sm"
							nativeButton={false}
							render={
								<Link to="/t/$ref" params={{ ref: orderId }}>
									<MapPin data-icon="inline-start" />
									Track this order
								</Link>
							}
						/>
						{/* The dashboard is behind the auth guard — a buyer who placed this
						    order as a guest would only bounce to the login screen. */}
						{auth.status === "authed" && (
							<Button
								size="sm"
								variant="outline"
								nativeButton={false}
								render={
									<Link to="/dashboard/orders/$orderId" params={{ orderId }}>
										<ReceiptText data-icon="inline-start" />
										View order details
									</Link>
								}
							/>
						)}
						<Button
							size="sm"
							variant="outline"
							nativeButton={false}
							render={
								<Link to="/order">
									<PackagePlus data-icon="inline-start" />
									Place another order
								</Link>
							}
						/>
					</div>
				</div>

				<div className="border-b px-5 py-4">
					<p className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
						Need help?
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="secondary"
							nativeButton={false}
							render={
								<a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
									<MessageCircle data-icon="inline-start" />
									WhatsApp desk
								</a>
							}
						/>
						<Button
							size="sm"
							variant="outline"
							nativeButton={false}
							render={
								<a href={telHref(SUPPORT_PHONE)}>
									<Phone data-icon="inline-start" />
									{SUPPORT_PHONE}
								</a>
							}
						/>
						<Button
							size="sm"
							variant="ghost"
							nativeButton={false}
							render={<Link to="/contact">More ways to reach us</Link>}
						/>
					</div>
					<p className="mt-2.5 text-[0.65rem] leading-relaxed text-muted-foreground/70">
						The desk answers {LOADING_HOURS}. Mention invoice {orderId} and we'll
						pull it up — or email {SUPPORT_EMAIL}.
					</p>
				</div>

				<div className="px-5 py-4">
					<p className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
						Get the app
					</p>
					<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
						Follow this order, fund your wallet and reorder in a couple of taps.
					</p>
					<div className="mt-3 flex flex-wrap gap-3">
						<StoreBadges />
					</div>
				</div>
			</div>
		</div>
	);
}
