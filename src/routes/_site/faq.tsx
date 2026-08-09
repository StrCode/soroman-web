import { createFileRoute, Link } from "@tanstack/react-router";

import { LOADING_HOURS } from "@/lib/company";

export const Route = createFileRoute("/_site/faq")({
	component: FaqPage,
});

/*
 * Answers are shown inline rather than behind an accordion. The audience reads
 * this on a phone over a slow connection, usually while deciding whether to
 * wire a large sum — hiding the answers behind taps adds friction to exactly
 * the content that earns trust, and costs a round of interaction to read.
 */
const SECTIONS = [
	{
		title: "Ordering",
		items: [
			{
				q: "Do I need an account before I can order?",
				a: "No. Browse prices and build your order freely. We only ask you to verify your phone number at the point where your invoice is generated, and that takes one code — there is no password and no form to fill.",
			},
			{
				q: "How long is the price I see honoured?",
				a: "The price you see stays valid for four hours from the time you order — your invoice shows the exact time it runs to. Depot prices move through the day, so after that you simply order again at the current price.",
			},
			{
				q: "What quantity can I order?",
				a: "Order the volume you need and we split it across trucks automatically at 60,000 litres each. You will see the truck count before you confirm.",
			},
			{
				q: "Can I order when a depot shows as closed?",
				a: "No. A closed depot cannot load, so ordering is disabled until it reopens on the next loading day. The prices page shows every depot's status live.",
			},
		],
	},
	{
		title: "Payment",
		items: [
			{
				q: "How do I pay?",
				a: "By bank transfer to the account shown on your invoice. Payments are matched to your order automatically — you do not need to upload a receipt or send proof to anyone.",
			},
			{
				q: "What if I transfer less than the invoice?",
				a: "We show you the balance remaining and your order waits for it. Nothing is lost. Once the full amount lands, your order moves to Payment Confirmed on its own.",
			},
			{
				q: "What if I transfer more than the invoice?",
				a: "You will be notified of the overpayment and given the choice of a refund or leaving it as credit against your next order.",
			},
			{
				q: "What happens if I do not pay?",
				a: "An unpaid order is cancelled automatically after 12 hours, and we warn you before that happens. Cancelling costs you nothing — you can simply order again at the current price.",
			},
		],
	},
	{
		title: "Loading and tracking",
		items: [
			{
				q: "Do you deliver, or do I collect?",
				a: "Both. Choose pickup and give us your date, time and truck plates, or choose delivery and give us the address, date and time.",
			},
			{
				q: "How do I know where my order is?",
				a: "Every order moves through six stages: Order Received, Payment Confirmed, Processing, Released, Loading, Completed. You get an SMS at each change, and you can check any time by entering your reference on the tracking page.",
			},
			{
				q: "Where do I find my order reference?",
				a: "It is on your invoice, and in the SMS we send when your order is created. Every SMS also carries a direct link to that order's tracking page.",
			},
		],
	},
	{
		title: "Your account",
		items: [
			{
				q: "Why do you not use passwords?",
				a: "Your phone number is your account. We text you a one-time code that expires in five minutes, which is harder to lose and harder to steal than a password.",
			},
			{
				q: "The code has not arrived. What now?",
				a: "Codes usually arrive in seconds. You can ask for a new one after a minute, and if it still does not come through, check the number you entered or reach the desk on WhatsApp.",
			},
			{
				q: "Can I reorder something I bought before?",
				a: "Yes. Any past order can be repeated in two taps, re-priced at today's rate so you always know what you are paying.",
			},
		],
	},
] as const;

function FaqPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Frequently asked
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Questions, answered plainly.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				If something here does not cover it, the desk answers on WhatsApp during
				loading hours, {LOADING_HOURS}.
			</p>

			<div className="mt-16 grid gap-16">
				{SECTIONS.map(({ title, items }) => (
					<section key={title} className="grid gap-8 lg:grid-cols-12 lg:gap-16">
						<h2 className="text-2xl lg:col-span-3 md:text-3xl">{title}</h2>
						<dl className="lg:col-span-9">
							{items.map(({ q, a }) => (
								<div
									key={q}
									className="border-t border-border py-6 first:border-t-foreground"
								>
									<dt className="text-xl leading-snug">{q}</dt>
									<dd className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
										{a}
									</dd>
								</div>
							))}
						</dl>
					</section>
				))}
			</div>

			<div className="mt-20 border-t border-foreground pt-8">
				<p className="text-sm text-muted-foreground">
					Still stuck?{" "}
					<Link
						to="/contact"
						className="text-accent underline-offset-4 hover:underline"
					>
						Talk to the desk
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
