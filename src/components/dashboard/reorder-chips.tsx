import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

import type { OrderRecord } from "@/lib/api";
import { seedDraftFromOrder } from "@/lib/order-draft";

const describe = (o: OrderRecord) =>
	o.lines
		.map((l) => `${l.quantity.toLocaleString()} L ${l.abbreviation}`)
		.join(" · ");

/**
 * One-tap reorder for repeat buyers, who order the same product at the same
 * depot again and again. Each chip seeds the order draft (depot + quantity)
 * before navigating, so /order opens pre-filled and priced at today's rate —
 * the same promise the past-orders list makes, pulled up to the top where a
 * returning customer reaches for it first.
 */
export default function ReorderChips({ orders }: { orders: OrderRecord[] }) {
	if (orders.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2.5">
			<span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
				Reorder
			</span>
			{orders.map((order) => (
				<Link
					key={order.id}
					to="/order/depot"
					onClick={() => seedDraftFromOrder(order)}
					className="group ease-luxe inline-flex items-center gap-2 rounded-full border border-foreground/15 py-1.5 pr-3.5 pl-3 text-sm transition-colors duration-250 hover:border-accent/50 hover:bg-accent/5 active:bg-accent/10"
				>
					<RotateCcw className="size-3.5 text-muted-foreground transition-colors group-hover:text-accent" />
					<span className="tabular-nums">{describe(order)}</span>
					<span className="text-muted-foreground">· {order.depot_name}</span>
				</Link>
			))}
		</div>
	);
}
