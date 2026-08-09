import { Check, CircleAlert } from "lucide-react";

import type { DangoteOrderRequest } from "@/lib/dangote-delivery/types";

type Stage = { label: string; done: boolean; note?: string };

const formatDate = (iso?: string | null) =>
	iso
		? new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" })
		: undefined;

/**
 * The order's life drawn from its status stamps: submitted → reviewed
 * (order ready) → paid → dispatched → collected. Rejection replaces the
 * tail with a single terminal marker.
 */
export default function StatusTimeline({
	request,
}: {
	request: DangoteOrderRequest;
}) {
	if (request.status === "Rejected" || request.status === "Cancelled") {
		const terminal = request.status === "Cancelled" ? "Cancelled" : "Rejected";
		const note =
			request.status === "Cancelled"
				? (formatDate(request.updatedAt) ?? "You withdrew this order.")
				: (formatDate(request.reviewedAt) ??
					"This order didn't pass review.");
		return (
			<ol className="space-y-4">
				<TimelineRow
					stage={{
						label: "Submitted",
						done: true,
						note: formatDate(request.createdAt),
					}}
				/>
				<li className="flex items-start gap-3">
					<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
						<CircleAlert className="size-3.5" />
					</span>
					<span>
						<span className="block text-sm font-medium text-destructive">
							{terminal}
						</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">
							{note}
						</span>
					</span>
				</li>
			</ol>
		);
	}

	const approved = request.status === "Approved";
	const paid = request.paymentStatus === "Paid";
	const dispatched =
		request.collectionStatus === "Dispatched" ||
		request.collectionStatus === "Collected";
	const collected = request.collectionStatus === "Collected";

	const stages: Stage[] = [
		{ label: "Submitted", done: true, note: formatDate(request.createdAt) },
		{
			label: approved ? "Order ready" : "Under review",
			done: approved,
			note: approved
				? formatDate(request.reviewedAt)
				: "The Dangote team is reviewing and pricing your order.",
		},
		{
			label: "Payment",
			done: paid,
			note: paid
				? "Payment received"
				: approved
					? "Pay the order amount to confirm."
					: undefined,
		},
		{
			label: "Dispatched",
			done: dispatched,
			note: request.expectedArrivalDate
				? `Expected ${request.expectedArrivalDate}`
				: undefined,
		},
		{ label: "Delivered", done: collected },
	];

	return (
		<ol className="space-y-4">
			{stages.map((stage) => (
				<TimelineRow key={stage.label} stage={stage} />
			))}
		</ol>
	);
}

function TimelineRow({ stage }: { stage: Stage }) {
	return (
		<li className="flex items-start gap-3">
			<span
				className={
					stage.done
						? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
						: "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-foreground/20"
				}
			>
				{stage.done && <Check className="size-3" />}
			</span>
			<span>
				<span
					className={
						stage.done
							? "block text-sm font-medium"
							: "block text-sm text-muted-foreground"
					}
				>
					{stage.label}
				</span>
				{stage.note && (
					<span className="mt-0.5 block text-xs text-muted-foreground">
						{stage.note}
					</span>
				)}
			</span>
		</li>
	);
}
