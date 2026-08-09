import {
	type Depot,
	type LoadingDetails,
	type OrderLine,
	PRICE_LOCK_HOURS,
	type TruckEntry,
} from "@/lib/api";
import { formatNaira } from "@/lib/use-catalog";

/**
 * Last look before placing the order. Summary only — the route footer owns
 * the "Place order" CTA (same pattern as Dangote / cooking gas).
 */
export default function ReviewStep({
	depot,
	lines,
	loading,
	trucks,
	companyName,
	total,
}: {
	depot: Depot | null;
	lines: OrderLine[];
	loading: LoadingDetails;
	trucks: Record<number, TruckEntry[]>;
	companyName: string;
	total: number;
}) {
	const line = lines[0];
	const unit = line ? (line.unit === "litre" ? "L" : line.unit) : "";
	const filledTrucks = line
		? (trucks[line.product_id] ?? []).filter((t) => t.quantity > 0)
		: [];

	const loadingValue =
		loading.type === "pickup"
			? filledTrucks.length > 0
				? `Pickup · ${filledTrucks.length} truck${filledTrucks.length === 1 ? "" : "s"}`
				: "Pickup at depot"
			: `Delivery · ${loading.state}`;

	const rows: { label: string; value: string }[] = [
		{
			label: "Depot",
			value: depot ? `${depot.name} · ${depot.state}` : "—",
		},
		{
			label: "Product",
			value: line ? `${line.abbreviation || line.name}` : "—",
		},
		{
			label: "Quantity",
			value: line ? `${line.quantity.toLocaleString()} ${unit}` : "—",
		},
		{
			label: "Unit price",
			value: line ? `${formatNaira(line.unit_price)}/${line.unit}` : "—",
		},
		{ label: "Loading", value: loadingValue },
		...(loading.type === "delivery"
			? [{ label: "Delivery address", value: loading.address.trim() || "—" }]
			: filledTrucks.length > 0
				? [
						{
							label: "Trucks",
							value: filledTrucks
								.map(
									(t) =>
										`${t.quantity.toLocaleString()} ${unit}${
											t.plate ? ` · ${t.plate}` : ""
										}`,
								)
								.join("; "),
						},
					]
				: []),
		{ label: "Company", value: companyName.trim() || "—" },
		{ label: "Order total", value: formatNaira(total) },
	];

	return (
		<section>
			<dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
				{rows.map((row) => (
					<div key={row.label}>
						<dt className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							{row.label}
						</dt>
						<dd className="mt-1 text-sm font-medium wrap-break-word">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
			<p className="mt-6 rounded-lg border border-foreground/10 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
				Your price stays valid for {PRICE_LOCK_HOURS} hours from the time you
				order. Pay on the next step or from your dashboard — after that, you
				reorder at the current price.
			</p>
		</section>
	);
}
