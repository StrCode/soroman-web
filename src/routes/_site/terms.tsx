import { createFileRoute, Link } from "@tanstack/react-router";

import { COMPANY_NAME, LOADING_HOURS, SUPPORT_EMAIL } from "@/lib/company";

export const Route = createFileRoute("/_site/terms")({
	component: TermsPage,
	head: () => ({
		meta: [
			{ title: "Terms & Conditions | Soroman Energy" },
			{
				name: "description",
				content:
					"Terms for browsing depot prices, placing orders, paying by bank transfer, and using Soroman fulfilment.",
			},
		],
	}),
});

const LAST_UPDATED = "5 August 2026";

const SECTIONS = [
	{
		title: "Agreement",
		body: [
			`These terms & conditions govern your use of the Soroman website and related services operated by ${COMPANY_NAME} ("Soroman", "we", "us"). By browsing prices, creating an account, or placing an order, you agree to these terms.`,
			`If you are ordering on behalf of a company, you confirm you are authorised to bind that company.`,
		],
	},
	{
		title: "The service",
		body: [
			"Soroman lets you view depot fuel prices, place orders for pickup or delivery, pay by bank transfer against an invoice, and track fulfilment. Depot availability and loading hours may change; closed depots cannot accept new orders until they reopen.",
			`Our desk answers during loading hours, ${LOADING_HOURS}. Support contact details are on the contact page and at ${SUPPORT_EMAIL}.`,
		],
	},
	{
		title: "Accounts",
		body: [
			"Your phone number is your account. Access is by one-time SMS code. You are responsible for the accuracy of the number you provide and for keeping access to that phone secure. We may refuse or suspend access if we suspect misuse or fraud.",
		],
	},
	{
		title: "Orders, pricing, and payment",
		body: [
			"Browsing and building an order does not create a binding sale until you confirm and pay as instructed on your invoice. Depot prices move through the day; the price on your order is honoured for the validity window shown at checkout (typically four hours from order).",
			"Payment is by bank transfer to the account on your invoice. Payments are matched to your order automatically. Underpayment leaves a balance due; overpayment may be refunded or held as credit at your choice. Unpaid orders may be cancelled after the period stated at checkout (typically 12 hours), with notice where practicable.",
			"Quantities may be split across trucks (for example at 60,000 litres each). You will see the truck count before you confirm where that applies.",
		],
	},
	{
		title: "Pickup and delivery",
		body: [
			"For pickup, you must provide accurate date, time, and truck plate details. For delivery, you must provide an accurate address, date, and time, and ensure the site is accessible for loading.",
			"Fulfilment stages (for example Order Received, Payment Confirmed, Processing, Released, Loading, Completed) and SMS updates are provided for tracking. Timing depends on depot operations, payment clearance, paperwork, and logistics partners.",
		],
	},
	{
		title: "Orders priced after review (including Dangote Delivery)",
		body: [
			"Some flows, including Dangote Delivery, place an order for review only. No sale is made and no payment is taken until Soroman prices the order and you choose to pay and confirm it.",
			"You confirm that company details, contact information, delivery address, product, quantity, and any required licence (for example DPR / NUPRC) are true and complete. False or incomplete information may delay or cancel the order. Where a licence is required, you are responsible for holding a valid one; Soroman may verify documents and decline orders that fail verification.",
			"Any price shown after review is set by Soroman and may expire, change with market conditions, or be withdrawn before you pay. Delivery timing and logistics are confirmed only after payment. Until you pay, you may cancel the order from your dashboard where that option is available.",
		],
	},
	{
		title: "Communication",
		body: [
			"You agree that Soroman may contact you by SMS, phone, or email about your account and orders, including status updates, prices, and payment instructions.",
		],
	},
	{
		title: "Acceptable use",
		body: [
			"You must not misuse the service, attempt unauthorised access, submit fraudulent orders, or use Soroman for any unlawful purpose under Nigerian or other applicable law.",
		],
	},
	{
		title: "Limitation of liability",
		body: [
			"To the fullest extent permitted by law, Soroman is not liable for delays or losses caused by incomplete paperwork, inaccessible delivery sites, force majeure, third-party supply or logistics constraints, bank transfer delays outside our control, or inaccurate information you provide.",
			"Nothing in these terms excludes liability that cannot be excluded under applicable law.",
		],
	},
	{
		title: "Privacy",
		body: [
			"How we handle personal information is described in our privacy policy. By using the service, you also acknowledge that policy.",
		],
	},
	{
		title: "Changes and governing law",
		body: [
			"We may update these terms from time to time. The “Last updated” date at the top of this page will change when we do. Continued use after an update means you accept the revised terms.",
			"These terms are governed by the laws of the Federal Republic of Nigeria. Disputes will be subject to the courts of Nigeria, without prejudice to any mandatory consumer protections that apply.",
		],
	},
] as const;

function TermsPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Legal
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Terms &amp; conditions.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				The rules for using Soroman and placing orders with {COMPANY_NAME}. Last
				updated {LAST_UPDATED}.
			</p>

			<div className="mt-16 max-w-3xl">
				{SECTIONS.map(({ title, body }, index) => (
					<section
						key={title}
						className="border-t border-border py-8 first:border-t-foreground"
					>
						<h2 className="text-xl leading-snug">
							<span className="text-muted-foreground tabular-nums">
								{String(index + 1).padStart(2, "0")}
							</span>{" "}
							{title}
						</h2>
						<div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
							{body.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</section>
				))}
			</div>

			<div className="mt-12 border-t border-foreground pt-8">
				<p className="text-sm text-muted-foreground">
					Also see our{" "}
					<Link
						to="/privacy"
						className="text-accent underline-offset-4 hover:underline"
					>
						privacy policy
					</Link>
					, or{" "}
					<Link
						to="/contact"
						className="text-accent underline-offset-4 hover:underline"
					>
						contact the desk
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
