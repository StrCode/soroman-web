import type { LoadingDetails, OrderRecord, TruckEntry } from "./api";

/**
 * A half-built depot order survives a refresh while you're still in the
 * wizard: the draft lives in sessionStorage until the price is locked, or
 * until you leave /order/depot (back to the chooser, dashboard, etc.). Shared
 * here so the dashboard can seed a draft (reorder) before handing off to the
 * order route.
 */
const DRAFT_KEY = "soroman.order.draft";

/** Deferred leave-clear — cancelled if the wizard remounts (Strict Mode / re-entry). */
let pendingClear: ReturnType<typeof setTimeout> | null = null;

export type OrderDraft = {
	depotId: number | null;
	quantities: Record<number, number>;
	loading: LoadingDetails;
	/** Pickup only: the declared truck split per product line (keyed by id). */
	trucks?: Record<number, TruckEntry[]>;
	/** The company this order is for — optional, may differ from the profile. */
	companyName?: string;
	step: "order" | "loading";
};

export function readOrderDraft(): OrderDraft | null {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		return raw ? (JSON.parse(raw) as OrderDraft) : null;
	} catch {
		return null;
	}
}

export function writeOrderDraft(draft: OrderDraft) {
	cancelPendingOrderDraftClear();
	sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearOrderDraft() {
	cancelPendingOrderDraftClear();
	sessionStorage.removeItem(DRAFT_KEY);
}

/**
 * Schedule a clear after the depot wizard unmounts. Deferred so React Strict
 * Mode's fake unmount→remount (and a quick re-entry) can cancel it — a refresh
 * while still on /order/depot keeps the draft.
 */
export function scheduleOrderDraftClearOnLeave() {
	cancelPendingOrderDraftClear();
	pendingClear = setTimeout(() => {
		sessionStorage.removeItem(DRAFT_KEY);
		pendingClear = null;
	}, 0);
}

export function cancelPendingOrderDraftClear() {
	if (pendingClear !== null) {
		clearTimeout(pendingClear);
		pendingClear = null;
	}
}

/**
 * "Reorder" seeds a fresh draft from a past order: same depot, same
 * quantities keyed by product id. The order page prices the lines at
 * today's rates and drops anything the depot no longer quotes.
 */
export function seedDraftFromOrder(order: OrderRecord) {
	writeOrderDraft({
		depotId: order.depot_id,
		quantities: Object.fromEntries(
			order.lines.map((l) => [l.product_id, l.quantity]),
		),
		loading: { type: "pickup" },
		step: "order",
	});
}
