import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MICRO } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ApiError,
	api,
	type OrderDetail,
	type OrderTruck,
	TRUCK_CAPACITY_LITRES,
} from "@/lib/api";
import { WHATSAPP_URL } from "@/lib/company";
import { cn } from "@/lib/utils";

const TRUCK_STATUS_CLASS: Record<string, string> = {
	loaded: "border-accent/40 text-accent",
	gated_out: "border-accent/40 text-accent",
	gated_in: "border-amber-600/40 text-amber-600 dark:text-amber-500",
	pending: "border-foreground/20 text-muted-foreground",
};

type DraftTruck = {
	plate: string;
	quantity: string;
	driverName: string;
	driverPhone: string;
};

/** Pickup trucks can be edited while the order is still before loading and every load is pending. */
export function canEditPickupTrucks(order: OrderDetail): boolean {
	if (order.loading?.type !== "pickup") return false;
	if (
		order.status === "loading" ||
		order.status === "loaded" ||
		order.status === "cancelled"
	) {
		return false;
	}
	return (
		order.trucks.length === 0 ||
		order.trucks.every((t) => t.status === "pending")
	);
}

function toDraft(trucks: OrderTruck[], orderQty: number): DraftTruck[] {
	if (trucks.length === 0) {
		return [
			{
				plate: "",
				quantity: String(orderQty),
				driverName: "",
				driverPhone: "",
			},
		];
	}
	return trucks.map((t) => ({
		plate: t.plate ?? "",
		quantity: String(t.quantity),
		driverName: t.driverName ?? "",
		driverPhone: t.driverPhone ?? "",
	}));
}

/**
 * Modal to declare / update plate, driver, and litres per truck. Keeps the
 * detail page read-only — edit is an Actions-rail verb.
 */
export function EditTrucksDialog({
	order,
	open,
	onOpenChange,
}: {
	order: OrderDetail;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const orderQty = order.lines.reduce((s, l) => s + l.quantity, 0);
	const [draft, setDraft] = useState<DraftTruck[]>(() =>
		toDraft(order.trucks, orderQty),
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setDraft(toDraft(order.trucks, orderQty));
		setError(null);
		setBusy(false);
	}, [open, order.trucks, orderQty]);

	const sum = draft.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
	const sumOk = sum === orderQty;
	const capacityOk = draft.every((t) => {
		const q = Number(t.quantity);
		return Number.isFinite(q) && q > 0 && q <= TRUCK_CAPACITY_LITRES;
	});

	const updateRow = (i: number, patch: Partial<DraftTruck>) => {
		setDraft((rows) =>
			rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
		);
		setError(null);
	};

	const removeRow = (i: number) => {
		setDraft((rows) =>
			rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i),
		);
		setError(null);
	};

	const addRow = () => {
		const remaining = Math.max(0, orderQty - sum);
		setDraft((rows) => [
			...rows,
			{
				plate: "",
				quantity:
					remaining > 0
						? String(Math.min(remaining, TRUCK_CAPACITY_LITRES))
						: "",
				driverName: "",
				driverPhone: "",
			},
		]);
	};

	const save = async () => {
		if (!sumOk) {
			setError(
				`Truck quantities (${sum.toLocaleString()} L) must sum to the order (${orderQty.toLocaleString()} L).`,
			);
			return;
		}
		if (!capacityOk) {
			setError(
				`Each truck can carry at most ${TRUCK_CAPACITY_LITRES.toLocaleString()} L.`,
			);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const updated = await api.orders.updateTrucks(
				order.id,
				draft.map((t) => ({
					plate: t.plate.trim() || undefined,
					quantity: Number(t.quantity),
					driverName: t.driverName.trim() || undefined,
					driverPhone: t.driverPhone.trim() || undefined,
				})),
			);
			queryClient.setQueryData(["order", order.id], updated);
			toast.success("Truck details saved");
			onOpenChange(false);
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Couldn't save. Try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (busy) return;
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{order.trucks.length === 0 ? "Add trucks" : "Edit trucks"}
					</DialogTitle>
					<DialogDescription>
						Plate and driver can be filled at the gate. Quantities must sum to{" "}
						{orderQty.toLocaleString()} L.
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto px-5">
					{draft.map((row, i) => (
						<div
							key={i}
							className="grid gap-3 rounded-lg border border-foreground/10 bg-muted/20 p-4 sm:grid-cols-2"
						>
							<div className="flex items-center justify-between gap-2 sm:col-span-2">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Truck {i + 1}
								</p>
								{draft.length > 1 && (
									<button
										type="button"
										className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-destructive hover:underline"
										onClick={() => removeRow(i)}
									>
										<Trash2 className="size-3" />
										Remove
									</button>
								)}
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor={`modal-truck-plate-${i}`}>
									Plate (optional)
								</Label>
								<Input
									id={`modal-truck-plate-${i}`}
									value={row.plate}
									onChange={(e) =>
										updateRow(i, { plate: e.target.value.toUpperCase() })
									}
									placeholder="ABC-123-XY"
									autoComplete="off"
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor={`modal-truck-qty-${i}`}>Litres</Label>
								<Input
									id={`modal-truck-qty-${i}`}
									inputMode="numeric"
									value={row.quantity}
									onChange={(e) =>
										updateRow(i, {
											quantity: e.target.value.replace(/\D/g, ""),
										})
									}
									placeholder="30000"
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor={`modal-truck-driver-${i}`}>Driver name</Label>
								<Input
									id={`modal-truck-driver-${i}`}
									value={row.driverName}
									onChange={(e) => updateRow(i, { driverName: e.target.value })}
									placeholder="Optional"
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor={`modal-truck-phone-${i}`}>Driver phone</Label>
								<Input
									id={`modal-truck-phone-${i}`}
									value={row.driverPhone}
									onChange={(e) =>
										updateRow(i, { driverPhone: e.target.value })
									}
									placeholder="Optional"
									inputMode="tel"
								/>
							</div>
						</div>
					))}

					<button
						type="button"
						className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-accent hover:underline"
						onClick={addRow}
					>
						<Plus className="size-3.5" />
						Add another truck
					</button>

					<p
						className={cn(
							"text-xs tabular-nums",
							sumOk ? "text-muted-foreground" : "text-destructive",
						)}
					>
						{sum.toLocaleString()} L of {orderQty.toLocaleString()} L assigned
					</p>

					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						className="cursor-pointer"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						className="cursor-pointer"
						disabled={busy || !sumOk || !capacityOk}
						onClick={() => void save()}
					>
						{busy && <Loader2 className="animate-spin" />}
						Save trucks
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Read-only pickup truck list on the order detail page. Editing opens
 * EditTrucksDialog from the Actions rail.
 */
export function OrderTrucksPanel({
	order,
	onEdit,
}: {
	order: OrderDetail;
	/** Opens the edit modal — only used when trucks are still editable. */
	onEdit?: () => void;
}) {
	if (order.loading?.type !== "pickup") return null;

	const editable = canEditPickupTrucks(order);
	const empty = order.trucks.length === 0;

	return (
		<section className="rounded-xl border border-foreground/15 p-5">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<p className={cn(MICRO, "text-muted-foreground")}>
					{empty ? "Your trucks" : `Trucks (${order.trucks.length})`}
				</p>
				{editable && onEdit ? (
					<button
						type="button"
						className="cursor-pointer text-sm font-medium text-accent hover:underline"
						onClick={onEdit}
					>
						{empty ? "Add trucks" : "Edit"}
					</button>
				) : !editable ? (
					<Button
						variant="outline"
						size="sm"
						className="cursor-pointer"
						nativeButton={false}
						render={
							<a
								href={WHATSAPP_URL}
								target="_blank"
								rel="noreferrer"
								aria-label={`Contact support about trucks on order ${order.id}`}
							>
								Contact support
							</a>
						}
					/>
				) : null}
			</div>

			{!editable && (
				<p className="mt-2 text-xs text-muted-foreground">
					Truck details are locked once loading starts. Message the desk with
					order{" "}
					<span className="font-medium text-foreground tabular-nums">
						{order.id}
					</span>{" "}
					if something needs to change.
				</p>
			)}

			{empty ? (
				<p className="mt-3 text-sm text-muted-foreground">
					{editable
						? "No trucks declared yet. Add plate and driver from Actions, or they'll be captured at the gate."
						: "No trucks declared — the depot will capture them at the gate."}
				</p>
			) : (
				<ul className="mt-4 space-y-2.5">
					{order.trucks.map((truck) => (
						<li
							key={truck.index}
							className="flex items-start justify-between gap-3"
						>
							<div className="min-w-0">
								<p className="text-sm font-medium tabular-nums">
									{truck.plate ?? `Truck ${truck.index}`}
									<span className="ml-2 font-normal text-muted-foreground">
										{truck.quantity.toLocaleString()} L
									</span>
								</p>
								{(truck.driverName || truck.driverPhone) && (
									<p className="mt-0.5 text-xs text-muted-foreground">
										{[truck.driverName, truck.driverPhone]
											.filter(Boolean)
											.join(" · ")}
									</p>
								)}
							</div>
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
			)}
		</section>
	);
}
