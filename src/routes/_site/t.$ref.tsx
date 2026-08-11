import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { api, type TrackedOrder, type TrackingStage } from "@/lib/api";
import { WHATSAPP_URL } from "@/lib/company";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_site/t/$ref")({
	component: TrackingPage,
	head: ({ params }) => ({
		meta: [
			{ title: `Track ${params.ref} | Soroman Energy` },
			{
				name: "description",
				content:
					"Live status for your Soroman fuel order — from payment through loading to completion.",
			},
		],
	}),
});

const LABEL = "text-xs tracking-[0.25em] uppercase";
const PANEL =
	"overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-[0_8px_32px_rgba(0,0,0,0.06)]";

/** The six stages every order walks, in order. Matches the wording in the FAQ. */
const STAGES: { key: TrackingStage; label: string }[] = [
	{ key: "received", label: "Order received" },
	{ key: "payment_confirmed", label: "Payment confirmed" },
	{ key: "processing", label: "Processing" },
	{ key: "released", label: "Released" },
	{ key: "loading", label: "Loading" },
	{ key: "completed", label: "Completed" },
];

/**
 * The headline states where the order is in plain words, so someone at the
 * gate reads one sentence instead of decoding a timeline.
 */
const HEADLINE: Record<TrackingStage, (order: TrackedOrder) => string> = {
	received: () => "Order received — awaiting payment.",
	payment_confirmed: () => "Payment confirmed.",
	processing: (order) => `Processing at ${order.depot_name}.`,
	released: () => "Released — waiting for a truck.",
	loading: (order) => `Loading at ${order.depot_name}.`,
	completed: () => "Order completed.",
};

const formatStamp = (iso: string) =>
	new Date(iso).toLocaleString("en-NG", {
		day: "numeric",
		month: "short",
		hour: "numeric",
		minute: "2-digit",
	});

const formatPlaced = (iso: string) =>
	new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long" });

/** Colour a truck's status pill by how far along the load it is. */
const TRUCK_STATUS_CLASS: Record<string, string> = {
	loaded: "border-accent/40 text-accent",
	gated_out: "border-accent/40 text-accent",
	gated_in: "border-amber-600/40 text-amber-600 dark:text-amber-500",
	pending: "border-foreground/20 text-muted-foreground",
};

function TrackingPage() {
	const { ref } = Route.useParams();
	const [order, setOrder] = useState<TrackedOrder | "loading" | "not_found">(
		"loading",
	);

	useEffect(() => {
		let cancelled = false;
		setOrder("loading");
		api.tracking.lookup(ref).then((found) => {
			if (!cancelled) setOrder(found ?? "not_found");
		});
		return () => {
			cancelled = true;
		};
	}, [ref]);

	if (order === "loading") {
		return (
			<div className="py-32">
				<Loader />
			</div>
		);
	}

	if (order === "not_found") {
		return <NotFound refInput={ref} />;
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
			<header className="snapshot-rise" style={{ animationDelay: "0ms" }}>
				<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(LABEL, "text-muted-foreground")}>
							Order tracking
						</span>
					</div>
					<span className={cn(LABEL, "text-muted-foreground tabular-nums")}>
						Ref {order.ref}
					</span>
				</div>
				<h1 className="mt-5 max-w-2xl text-3xl leading-[1.05] tracking-tight text-balance md:text-4xl">
					{HEADLINE[order.stage](order)}
				</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Placed {formatPlaced(order.placed_at)} · {order.depot_name},{" "}
					{order.depot_state}. The number on the order gets an SMS at every
					stage change — this page shows the same feed.
				</p>
			</header>

			<div className="mt-10 grid gap-6 lg:grid-cols-12">
				<section
					className={cn(PANEL, "snapshot-rise lg:col-span-7")}
					style={{ animationDelay: "80ms" }}
					aria-label="Order progress"
				>
					<div className="flex items-center justify-between gap-4 border-b border-foreground/15 px-6 py-4">
						<span className={LABEL}>Progress</span>
						<span className="rounded-full border border-accent/40 px-2.5 py-0.5 text-[0.65rem] tracking-[0.14em] whitespace-nowrap text-accent uppercase">
							{STAGES.find((s) => s.key === order.stage)?.label}
						</span>
					</div>
					<Timeline order={order} />
				</section>

				<div className="flex flex-col gap-6 lg:col-span-5">
					<section
						className={cn(PANEL, "snapshot-rise")}
						style={{ animationDelay: "160ms" }}
						aria-label="Order details"
					>
						<div className="flex items-center justify-between gap-4 border-b border-foreground/15 px-6 py-4">
							<span className={LABEL}>Order details</span>
						</div>
						<dl className="divide-y divide-foreground/15">
							{order.lines.map((line) => (
								<div
									key={line.abbreviation}
									className="flex items-baseline justify-between gap-4 px-6 py-3.5"
								>
									<dt className="text-sm">
										{line.name}{" "}
										<span className="text-muted-foreground">
											({line.abbreviation})
										</span>
									</dt>
									<dd className="text-sm font-medium tabular-nums">
										{line.quantity.toLocaleString()}{" "}
										{line.unit === "litre" ? "L" : line.unit}
									</dd>
								</div>
							))}
							<DetailRow label="Depot">
								{order.depot_name} · {order.depot_state}
							</DetailRow>
							<DetailRow label="Loading">
								{order.loading.type === "delivery" ? (
									<>
										Delivery · {order.loading.state}
										<span className="block text-xs text-muted-foreground">
											{order.loading.address}
										</span>
									</>
								) : (
									"Pickup at depot"
								)}
							</DetailRow>
							{order.trucks.length > 0 && (
								<div className="px-6 py-3.5">
									<p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
										Trucks ({order.trucks.length})
									</p>
									<ul className="mt-2.5 space-y-2">
										{order.trucks.map((truck) => (
											<li
												key={truck.index}
												className="flex items-center justify-between gap-3"
											>
												<span className="text-sm tabular-nums">
													{truck.plate ?? `Truck ${truck.index}`}
												</span>
												<span
													className={cn(
														"rounded-full border px-2.5 py-0.5 text-[0.65rem] tracking-[0.12em] whitespace-nowrap uppercase",
														TRUCK_STATUS_CLASS[truck.status] ??
															TRUCK_STATUS_CLASS.pending,
													)}
												>
													{truck.statusLabel}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}
						</dl>
						{/*
						 * Anyone holding the reference can open this page, so it carries
						 * volumes and movement only — never prices or the buyer's name.
						 */}
						<p className="border-t border-foreground/15 bg-muted/60 px-6 py-3 text-xs text-muted-foreground">
							Volumes only — prices and invoices are visible after{" "}
							<Link to="/login" className="text-accent">
								signing in
							</Link>
							.
						</p>
					</section>

					<aside
						className="snapshot-rise flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-foreground/15 px-6 py-4"
						style={{ animationDelay: "240ms" }}
					>
						<div>
							<p className="text-sm font-medium">Something look off?</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Our desk can pull up this reference in seconds.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="rounded-full"
							nativeButton={false}
							render={
								<a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
									WhatsApp desk
								</a>
							}
						/>
					</aside>
				</div>
			</div>

			<div className="snapshot-rise" style={{ animationDelay: "320ms" }}>
				<AnotherRefForm />
			</div>
		</div>
	);
}

function Timeline({ order }: { order: TrackedOrder }) {
	const currentIndex = STAGES.findIndex((s) => s.key === order.stage);

	return (
		<ol className="px-6 py-6">
			{STAGES.map((stage, i) => {
				const stamp = order.reached[stage.key];
				const isCurrent = i === currentIndex;
				// A finished order has no "next" step, so its final stage reads as done.
				const isDone =
					i < currentIndex || (isCurrent && stage.key === "completed");
				const isLast = i === STAGES.length - 1;

				return (
					<li key={stage.key} className="flex gap-4">
						<div className="flex w-4 flex-col items-center">
							<span
								aria-hidden
								className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
							>
								{isDone ? (
									<span className="flex size-4 items-center justify-center rounded-full bg-accent">
										<Check className="size-2.5 text-white" strokeWidth={3.5} />
									</span>
								) : isCurrent ? (
									<span className="live-dot size-2.5 rounded-full bg-accent" />
								) : (
									<span className="size-2 rounded-full border border-foreground/30" />
								)}
							</span>
							{!isLast && (
								<span
									aria-hidden
									className={cn(
										"mt-1 mb-1 w-px flex-1",
										i < currentIndex ? "bg-accent" : "bg-foreground/15",
									)}
								/>
							)}
						</div>

						<div className={cn("min-w-0 flex-1", !isLast && "pb-7")}>
							<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
								<p
									className={cn(
										"text-sm",
										isCurrent
											? "font-semibold"
											: isDone
												? "font-medium"
												: "text-muted-foreground/60",
									)}
									aria-current={isCurrent ? "step" : undefined}
								>
									{stage.label}
								</p>
								{stamp && (
									<time
										dateTime={stamp}
										className="text-xs text-muted-foreground tabular-nums"
									>
										{formatStamp(stamp)}
									</time>
								)}
							</div>
							{isCurrent && (
								<p className="mt-1 text-sm text-muted-foreground">
									{order.note}
								</p>
							)}
						</div>
					</li>
				);
			})}
		</ol>
	);
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between gap-4 px-6 py-3.5">
			<dt className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
				{label}
			</dt>
			<dd className="text-right text-sm">{children}</dd>
		</div>
	);
}

/** Lets a driver check a second reference back-to-back without leaving. */
function AnotherRefForm() {
	const navigate = useNavigate();
	const [value, setValue] = useState("");

	return (
		<form
			className="mt-12 flex flex-col gap-4 border-t border-foreground/15 pt-8 md:flex-row md:items-center md:justify-between"
			onSubmit={(e) => {
				e.preventDefault();
				const next = value.trim();
				if (next) navigate({ to: "/t/$ref", params: { ref: next } });
			}}
		>
			<div>
				<p className="text-sm font-medium">Checking a different order?</p>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Enter the reference from the invoice or SMS.
				</p>
			</div>
			<div className="w-full max-w-sm">
				<Label htmlFor="another-ref" className="sr-only">
					Order reference
				</Label>
				<InputGroup className="h-11 rounded-full bg-background pr-1.5">
					<InputGroupInput
						id="another-ref"
						placeholder="e.g. ORD-8F3A2B1C"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						className="pl-4 font-medium uppercase tabular-nums placeholder:font-normal placeholder:normal-case"
						autoComplete="off"
					/>
					<InputGroupAddon align="inline-end" className="pr-0">
						<InputGroupButton
							type="submit"
							variant="default"
							size="sm"
							className="rounded-full px-4"
							disabled={!value.trim()}
						>
							Track
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</div>
		</form>
	);
}

function NotFound({ refInput }: { refInput: string }) {
	return (
		<div className="flex items-start justify-center px-4 py-24">
			<div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
				<SearchX
					className="mx-auto size-6 text-muted-foreground"
					strokeWidth={1.5}
					aria-hidden
				/>
				<h1 className="mt-4 text-lg font-semibold tracking-tight">
					No order found for "{refInput.toUpperCase()}"
				</h1>
				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					Check the reference on your invoice or SMS and try again. If it still
					doesn't appear, our desk can look it up on{" "}
					<a
						href={WHATSAPP_URL}
						target="_blank"
						rel="noreferrer"
						className="text-accent"
					>
						WhatsApp
					</a>
					.
				</p>
				<Button
					variant="outline"
					className="mt-6"
					nativeButton={false}
					render={
						<Link to="/" hash="track">
							Try another reference
						</Link>
					}
				/>
			</div>
		</div>
	);
}
