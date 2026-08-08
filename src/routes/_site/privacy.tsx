import { createFileRoute, Link } from "@tanstack/react-router";

import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/company";

export const Route = createFileRoute("/_site/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [{ title: "Privacy Policy | Soroman" }],
	}),
});

const LAST_UPDATED = "5 August 2026";

const SECTIONS = [
	{
		title: "Who we are",
		body: [
			`${COMPANY_NAME} ("Soroman", "we", "us") operates the Soroman website and related services that let you browse depot fuel prices, place orders, pay by bank transfer, and track fulfilment across Nigeria.`,
			`Questions about this policy can be sent to ${SUPPORT_EMAIL}.`,
		],
	},
	{
		title: "Information we collect",
		body: [
			"Account and verification: your phone number, and one-time codes we send to confirm it. We do not use passwords.",
			"Order details: product, quantity, depot, pickup or delivery preferences, truck plates where provided, delivery address, preferred loading time, and any company or licensing details you submit (for example DPR / NUPRC licence information on certain order types).",
			"Payment matching: bank transfer references and amounts as they relate to your invoice, so we can confirm payment. We do not collect or store card numbers through the service.",
			"Communications: messages you send to the desk (WhatsApp, phone, or email), and SMS delivery status for order updates.",
			"Technical data: basic device and browser information, IP address, and usage logs needed to keep the service secure and working.",
		],
	},
	{
		title: "How we use your information",
		body: [
			"To create and verify your account, generate invoices, match payments, and fulfil pickup or delivery.",
			"To send SMS and other status updates about your orders, and to contact you about pricing, payment instructions, or problems with an order.",
			"To answer support requests and improve the reliability and clarity of the service.",
			"To detect fraud, abuse, or incomplete or false order information, and to meet legal or regulatory obligations.",
		],
	},
	{
		title: "Legal bases and sharing",
		body: [
			"We process your information to perform the contract you enter when you order, to pursue our legitimate interests in running a secure fuel-supply service, and where required by law.",
			"We share information with payment partners and banks only as needed to match transfers to invoices; with logistics and depot partners as needed to load or deliver your order; and with SMS and communications providers who send codes and status messages on our behalf.",
			"We do not sell your personal information. We may disclose information if required by law, regulation, or a valid legal process, or to protect rights, safety, or property.",
		],
	},
	{
		title: "Retention",
		body: [
			"We keep order, payment, and account records for as long as needed to fulfil orders, handle disputes, meet accounting and regulatory requirements, and operate the service. One-time verification codes are short-lived and expire within minutes.",
			"If you ask us to delete account data where we are not required to keep it, we will do so within a reasonable time after verifying your request.",
		],
	},
	{
		title: "Security",
		body: [
			"We use industry-standard measures to protect personal information in transit and at rest. No method of transmission or storage is completely secure; please keep your phone secure, as it is how you access your account.",
		],
	},
	{
		title: "Your choices",
		body: [
			"You can request access to, correction of, or deletion of personal information we hold about you, subject to legal retention requirements, by contacting the desk at the email above.",
			"Transactional SMS about your orders is part of fulfilment. If you stop using the service and want marketing or non-essential messages stopped, tell the desk — order-critical messages may still be sent while an order is open.",
		],
	},
	{
		title: "Children",
		body: [
			"Soroman is a business fuel-supply service. It is not directed at children, and we do not knowingly collect personal information from anyone under 18.",
		],
	},
	{
		title: "Changes",
		body: [
			"We may update this policy from time to time. The “Last updated” date at the top of this page will change when we do. Continued use of the service after an update means you accept the revised policy.",
		],
	},
] as const;

function PrivacyPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Legal
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Privacy policy.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				How {COMPANY_NAME} collects, uses, and protects your information when
				you use Soroman. Last updated {LAST_UPDATED}.
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
						to="/terms"
						className="text-accent underline-offset-4 hover:underline"
					>
						terms &amp; conditions
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
