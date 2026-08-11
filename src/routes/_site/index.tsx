import { createFileRoute } from "@tanstack/react-router";
import { FileText, MessageCircle, Repeat } from "lucide-react";

import AppPromo from "@/components/landing/app-promo";
import Hero from "@/components/landing/hero";
import PriceBoard from "@/components/landing/price-board";
import TrackOrder from "@/components/landing/track-order";

export const Route = createFileRoute("/_site/")({
	component: HomePage,
	head: () => ({
		meta: [
			{ title: "Soroman Energy | Order fuel at today's depot prices" },
			{
				name: "description",
				content:
					"Live PMS and AGO depot prices across Nigeria. Order fuel, pay by bank transfer and track every truck to the gate.",
			},
		],
	}),
});

function HomePage() {
	return (
		<div>
			<Hero />
			<PriceBoard />
			<TrackOrder />
			<HowItWorks />
			<AppPromo />
		</div>
	);
}

const STEPS = [
	{
		title: "Select a Depot",
		body: "Choose the depot most convenient for you and view today's price.",
	},
	{
		title: "Place Your Order",
		body: "Enter the quantity you need and confirm your order.",
	},
	{
		title: "Make Payment",
		body: "Pay using the account details provided on your invoice.",
	},
	{
		title: "Track Your Order",
		body: "Receive updates as your order progresses until it is ready for pickup or delivered.",
	},
] as const;

const FACTS = [
	{
		icon: FileText,
		title: "Invoice in seconds",
		body: "Your proforma invoice is generated the moment you order.",
	},
	{
		icon: MessageCircle,
		title: "Updates where you are",
		body: "Every status change reaches you by SMS and WhatsApp.",
	},
	{
		icon: Repeat,
		title: "Reorder in two taps",
		body: "Repeat any past order at the current price without retyping.",
	},
] as const;

function HowItWorks() {
	return (
		<section className="border-t border-foreground/15">
			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-12">
				<div className="lg:col-span-5">
					<h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
						How It Works
					</h2>
					<p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
						Ordering fuel is simple and stress-free with Soroman.
					</p>

					{/* Facts sit with the heading on desktop; on mobile they move
              below the steps so the process stays the lead content. */}
					{/* <FactsList className="mt-10 hidden lg:block" /> */}

					{/* Placeholder depot photography (Unsplash); swap for Soroman's own
              depot shot when one exists. Grayscale keeps it in the palette. */}
					<img
						src="https://images.unsplash.com/photo-1528457616777-84ce44cc3699?w=900&h=675&fit=crop&q=80"
						alt="Fuel tanker parked beside storage tanks at a depot"
						width={900}
						height={675}
						loading="lazy"
						className="mt-8 aspect-[4/3] w-full rounded-xl border border-foreground/15 object-cover grayscale dark:brightness-90"
					/>
				</div>

				<ol className="divide-y divide-foreground/15 lg:col-span-7">
					{STEPS.map(({ title, body }, i) => (
						<li
							key={title}
							className="grid grid-cols-[2.75rem_1fr] gap-x-5 py-7 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_1fr] sm:gap-x-6"
						>
							<span
								className="text-3xl leading-none font-semibold tracking-tight text-foreground/20 tabular-nums select-none md:text-4xl"
								aria-hidden
							>
								{String(i + 1).padStart(2, "0")}
							</span>
							<div>
								<h3 className="text-base font-semibold">{title}</h3>
								<p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
									{body}
								</p>
							</div>
						</li>
					))}
				</ol>

				<FactsList className="border-t border-foreground/10 pt-2 lg:hidden" />
			</div>
		</section>
	);
}

function FactsList({ className }: { className?: string }) {
	return (
		<dl className={`divide-y divide-foreground/10 ${className ?? ""}`}>
			{FACTS.map(({ icon: Icon, title, body }) => (
				<div key={title} className="flex items-start gap-3 py-4">
					<Icon
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						strokeWidth={1.5}
						aria-hidden
					/>
					<div>
						<dt className="text-sm font-medium">{title}</dt>
						<dd className="mt-0.5 text-sm text-muted-foreground">{body}</dd>
					</div>
				</div>
			))}
		</dl>
	);
}
