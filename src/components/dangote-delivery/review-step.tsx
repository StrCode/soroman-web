import { useState } from "react";
import type { DetailsForm } from "@/components/dangote-delivery/details-step";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/api";
import { COMPANY_NAME } from "@/lib/company";
import {
	type DangoteDeliveryProduct,
	PRODUCT_META,
} from "@/lib/dangote-delivery/types";

/**
 * The last look before submission. Everything here comes from the client-side
 * draft — nothing exists server-side yet — and no price appears anywhere: the
 * quote is issued by the Dangote team after review. Accepting the terms is
 * required before the submit CTA becomes available.
 */
export default function ReviewStep({
	details,
	licenseLabel,
	termsAccepted,
	onTermsAcceptedChange,
}: {
	details: DetailsForm;
	licenseLabel: string;
	termsAccepted: boolean;
	onTermsAcceptedChange: (accepted: boolean) => void;
}) {
	const [termsOpen, setTermsOpen] = useState(false);
	const meta =
		PRODUCT_META[details.product as DangoteDeliveryProduct] ?? PRODUCT_META.PMS;
	const quantity = Number(details.quantity) || 0;
	const phone = normalizePhone(details.contactPhone);

	const rows: { label: string; value: string }[] = [
		{ label: "Product", value: `${meta.label} (${meta.code})` },
		{
			label: "Quantity",
			value: `${quantity.toLocaleString()} ${meta.unitShort}`,
		},
		{ label: "Delivery state", value: details.deliveryState },
		{ label: "Delivery address", value: details.deliveryAddress },
		{ label: "Company", value: details.companyName.trim() || "—" },
		{ label: "DPR / NUPRC license", value: licenseLabel },
		{
			label: "Contact",
			value: `${details.contactPerson}${
				phone ? ` · ${formatPhoneForDisplay(phone)}` : ""
			}${details.email?.trim() ? ` · ${details.email.trim()}` : ""}`,
		},
	];

	return (
		<section>
			<dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
				{rows.map((row) => (
					<div key={row.label}>
						<dt className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							{row.label}
						</dt>
						<dd className="mt-1 text-sm font-medium">{row.value}</dd>
					</div>
				))}
			</dl>
			<p className="mt-6 rounded-lg border border-foreground/10 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
				No payment is taken now. The Dangote team reviews your order, then
				prices your order with delivery — you'll see it on your dashboard and
				pay only if you accept it.
			</p>
			<Field orientation="horizontal" className="mt-5 items-start">
				<Checkbox
					id="dangote-terms"
					checked={termsAccepted}
					onCheckedChange={(checked) => onTermsAcceptedChange(checked === true)}
				/>
				<FieldLabel
					htmlFor="dangote-terms"
					className="font-normal leading-snug"
				>
					I accept the Soroman{" "}
					<button
						type="button"
						className="cursor-pointer font-medium text-accent underline underline-offset-2 hover:text-accent/90"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setTermsOpen(true);
						}}
					>
						terms & conditions
					</button>{" "}
					for this order
				</FieldLabel>
			</Field>

			<Dialog open={termsOpen} onOpenChange={setTermsOpen}>
				<DialogContent className="flex max-h-[min(85vh,40rem)] flex-col gap-0 overflow-hidden sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Soroman terms & conditions</DialogTitle>
						<DialogDescription>
							Please read these terms before placing your order.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-muted-foreground">
						<TermsBody />
					</div>
					<DialogFooter className="gap-2 sm:justify-between">
						<a
							href="/terms"
							target="_blank"
							rel="noreferrer"
							className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
						>
							View full terms
						</a>
						<Button type="button" onClick={() => setTermsOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function TermsBody() {
	return (
		<div className="flex flex-col gap-4">
			<p>
				These terms apply to Dangote Delivery orders submitted through{" "}
				{COMPANY_NAME} (&quot;Soroman&quot;). By accepting, you agree to the
				following for this order.
			</p>
			<div>
				<h3 className="font-medium text-foreground">
					1. Order, not a confirmed sale
				</h3>
				<p className="mt-1.5">
					Submitting this form places an order only. No sale is made and
					no payment is taken until Soroman prices the order and you choose to
					pay and confirm it.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">2. Accurate information</h3>
				<p className="mt-1.5">
					You confirm that the company details, contact information, delivery
					address, product, quantity, and any DPR / NUPRC license you provide
					are true and complete. False or incomplete information may delay or
					cancel the order.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">3. Licensing</h3>
				<p className="mt-1.5">
					Where a license is required, you are responsible for holding a valid
					license for the product and destination stated. Soroman may verify
					documents before pricing an order and may decline an order that fails
					verification.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">4. Pricing and validity</h3>
				<p className="mt-1.5">
					Any price shown after review is set by Soroman. Prices may expire,
					change with market conditions, or be withdrawn before you pay.
					Delivery timing and logistics are confirmed only after payment.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">5. Payment</h3>
				<p className="mt-1.5">
					Payment is due only if you accept the priced order. Until then you may
					cancel the order from your dashboard. Paid orders follow
					Soroman&apos;s standard fulfilment and collection process.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">6. Communication</h3>
				<p className="mt-1.5">
					You agree that Soroman may contact you by SMS, phone, or email about
					this order, including status updates, prices, and payment
					instructions.
				</p>
			</div>
			<div>
				<h3 className="font-medium text-foreground">7. Limitation</h3>
				<p className="mt-1.5">
					Soroman is not liable for delays or losses caused by incomplete
					paperwork, inaccessible delivery sites, force majeure, or third-party
					supply constraints outside its reasonable control.
				</p>
			</div>
			<p className="text-xs">
				For questions about these terms, contact the Soroman desk before you
				submit.
			</p>
		</div>
	);
}
