import { useRef } from "react";
import { BoxedInput, BoxedSelect } from "@/components/order/boxed";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import {
	type Depot,
	type LoadingDetails,
	type OrderLine,
	TRUCK_CAPACITY_LITRES,
	type TruckEntry,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function LoadingStep({
	depot,
	states,
	loading,
	lines,
	trucks,
	onChange,
	onTrucksChange,
	onChangeDepot,
}: {
	depot: Depot | null;
	states: string[];
	loading: LoadingDetails;
	lines: OrderLine[];
	trucks: Record<number, TruckEntry[]>;
	onChange: (loading: LoadingDetails) => void;
	onTrucksChange: (trucks: Record<number, TruckEntry[]>) => void;
	onChangeDepot: () => void;
}) {
	const pickupRef = useRef<HTMLButtonElement>(null);
	const deliveryRef = useRef<HTMLButtonElement>(null);

	// role="radio" promises arrow-key behavior; the group delivers it here.
	const onGroupKeyDown = (e: React.KeyboardEvent) => {
		if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
			return;
		}
		e.preventDefault();
		if (loading.type === "pickup") {
			onChange({ type: "delivery", state: "", address: "" });
			deliveryRef.current?.focus();
		} else {
			onChange({ type: "pickup" });
			pickupRef.current?.focus();
		}
	};

	return (
		<div>
			<div
				className="grid grid-cols-1 gap-3 sm:grid-cols-2"
				role="radiogroup"
				aria-label="Loading type"
				onKeyDown={onGroupKeyDown}
			>
				<TypeCard
					ref={pickupRef}
					title="Pickup"
					body="Load with your own truck"
					selected={loading.type === "pickup"}
					onSelect={() => onChange({ type: "pickup" })}
				/>
				<TypeCard
					ref={deliveryRef}
					title="Delivery"
					body="Load with Soroman truck"
					selected={loading.type === "delivery"}
					onSelect={() =>
						onChange(
							loading.type === "delivery"
								? loading
								: { type: "delivery", state: "", address: "" },
						)
					}
				/>
			</div>

			{loading.type === "pickup" ? (
				<div className="mt-5 space-y-5">
					<div>
						<p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							Pickup depot
						</p>
						<div className="mt-1.5 flex items-center justify-between rounded-lg border px-3.5 py-3">
							<span className="text-sm">
								{depot ? `${depot.name} · ${depot.state}` : "No depot selected"}
							</span>
							<button
								type="button"
								onClick={onChangeDepot}
								className="text-[0.65rem] tracking-[0.15em] text-accent uppercase hover:underline"
							>
								Change
							</button>
						</div>
					</div>

					<div className="space-y-4">
						<p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							Truck details — optional
						</p>
						{lines.map((line) => (
							<TruckSplit
								key={line.product_id}
								line={line}
								entries={trucks[line.product_id] ?? []}
								onChange={(entries) =>
									onTrucksChange({ ...trucks, [line.product_id]: entries })
								}
							/>
						))}
					</div>
				</div>
			) : (
				<div className="mt-5 space-y-4">
					<Field>
						<FieldLabel
							htmlFor="delivery-state"
							className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase"
						>
							Delivery state
						</FieldLabel>
						<BoxedSelect
							id="delivery-state"
							value={loading.state}
							onChange={(e) => onChange({ ...loading, state: e.target.value })}
							className={cn(
								loading.state === "" && "[&>select]:text-muted-foreground/50",
							)}
						>
							<NativeSelectOption value="" disabled>
								Choose a state
							</NativeSelectOption>
							{states.map((s) => (
								<NativeSelectOption key={s} value={s}>
									{s}
								</NativeSelectOption>
							))}
						</BoxedSelect>
					</Field>
					<Field>
						<FieldLabel
							htmlFor="delivery-address"
							className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase"
						>
							Delivery address
						</FieldLabel>
						<BoxedInput
							id="delivery-address"
							value={loading.address}
							onChange={(e) =>
								onChange({ ...loading, address: e.target.value })
							}
							placeholder="Street address for the truck"
						/>
					</Field>
				</div>
			)}
		</div>
	);
}

function TypeCard({
	title,
	body,
	selected,
	onSelect,
	ref,
}: {
	title: string;
	body: string;
	selected: boolean;
	onSelect: () => void;
	ref?: React.Ref<HTMLButtonElement>;
}) {
	return (
		<button
			ref={ref}
			type="button"
			role="radio"
			aria-checked={selected}
			tabIndex={selected ? 0 : -1}
			onClick={onSelect}
			className={cn(
				"rounded-lg border p-4 text-left transition-colors duration-300 ease-luxe",
				selected
					? "border-accent/50 bg-accent/5"
					: "hover:border-foreground/40",
			)}
		>
			<span className="flex items-center justify-between">
				<span className="text-sm font-semibold">{title}</span>
				{selected && (
					<span className="text-[0.65rem] tracking-[0.15em] text-accent uppercase">
						Selected
					</span>
				)}
			</span>
			<span className="mt-1 block text-xs text-muted-foreground">{body}</span>
		</button>
	);
}

/**
 * The pickup truck split for one product line — the web form of the WhatsApp
 * bot's per-truck prompts. The buyer brings their own trucks, and the whole
 * declaration is optional: plates and the split can both be collected at the
 * depot gate. A split the buyer DOES start must still add up — the litres per
 * truck total the line's quantity, and no truck exceeds one tanker.
 */
function TruckSplit({
	line,
	entries,
	onChange,
}: {
	line: OrderLine;
	entries: TruckEntry[];
	onChange: (entries: TruckEntry[]) => void;
}) {
	const unit = line.unit === "litre" ? "L" : line.unit;
	const assigned = entries.reduce((sum, t) => sum + t.quantity, 0);
	const remaining = line.quantity - assigned;
	const needsSplit = line.quantity > TRUCK_CAPACITY_LITRES;
	const overCap = entries.some((t) => t.quantity > TRUCK_CAPACITY_LITRES);

	const update = (i: number, patch: Partial<TruckEntry>) =>
		onChange(entries.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
	const add = () =>
		onChange([
			...entries,
			{
				plate: "",
				quantity: Math.max(0, Math.min(remaining, TRUCK_CAPACITY_LITRES)),
			},
		]);
	const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

	const status = overCap
		? {
				text: `Each truck can carry at most ${TRUCK_CAPACITY_LITRES.toLocaleString()} L`,
				tone: "bad" as const,
			}
		: entries.length === 0
			? needsSplit
				? {
						text: `Over one tanker — around ${Math.ceil(line.quantity / TRUCK_CAPACITY_LITRES)} trucks. Declare them now, or leave it to the depot gate.`,
						tone: "muted" as const,
					}
				: {
						text: "One truck assumed. Add trucks only if you're splitting the load.",
						tone: "muted" as const,
					}
			: remaining > 0
				? {
						text: `${remaining.toLocaleString()} ${unit} still to assign`,
						tone: "warn" as const,
					}
				: remaining < 0
					? {
							text: `${Math.abs(remaining).toLocaleString()} ${unit} over — reduce a truck`,
							tone: "bad" as const,
						}
					: {
							text: `All ${line.quantity.toLocaleString()} ${unit} assigned`,
							tone: "good" as const,
						};

	return (
		<div className="rounded-lg border p-4">
			<div className="flex items-baseline justify-between">
				<span className="text-sm font-medium">{line.name}</span>
				<span className="text-xs text-muted-foreground tabular-nums">
					{line.quantity.toLocaleString()} {unit}
				</span>
			</div>

			{entries.length > 0 && (
				<div className="mt-3 space-y-2">
					{entries.map((t, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: trucks are an ordered list with no stable id
						<div key={i} className="flex items-center gap-2">
							<BoxedInput
								aria-label={`Truck ${i + 1} plate`}
								value={t.plate}
								onChange={(e) =>
									update(i, { plate: e.target.value.toUpperCase() })
								}
								placeholder="Plate (optional)"
								className="flex-1"
							/>
							<BoxedInput
								aria-label={`Truck ${i + 1} litres`}
								type="number"
								inputMode="numeric"
								min={0}
								value={t.quantity ? String(t.quantity) : ""}
								onChange={(e) =>
									update(i, {
										quantity: Math.max(
											0,
											Math.floor(Number(e.target.value) || 0),
										),
									})
								}
								placeholder={unit}
								className="w-28 tabular-nums"
							/>
							<button
								type="button"
								onClick={() => remove(i)}
								aria-label={`Remove truck ${i + 1}`}
								className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}

			<div className="mt-3 flex items-center justify-between gap-3">
				<span
					className={cn(
						"text-[0.7rem]",
						status.tone === "bad" && "text-destructive",
						status.tone === "warn" && "text-amber-700 dark:text-amber-500",
						status.tone === "good" && "text-accent",
						status.tone === "muted" && "text-muted-foreground",
					)}
				>
					{status.text}
				</span>
				{remaining > 0 && (
					<button
						type="button"
						onClick={add}
						className="shrink-0 text-[0.65rem] tracking-[0.15em] text-accent uppercase hover:underline"
					>
						+ Add truck
					</button>
				)}
			</div>
		</div>
	);
}
