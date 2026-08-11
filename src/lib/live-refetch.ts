import type { OrderStatus } from "@/lib/api";

/** Unpaid invoices — listen for transfer / wallet confirmation. */
export const LIVE_PAYMENT_MS = 10_000;
/** Fulfilment still moving — slower than payment listen. */
export const LIVE_FULFILMENT_MS = 15_000;

/** Gate a poll interval on tab visibility. */
export function visibleRefetch(
	pageVisible: boolean,
	ms: number | false,
): number | false {
	if (!pageVisible || ms === false) return false;
	return ms;
}

/**
 * Depot order detail (`GET …/orders/by-ref/:ref`) — poll while payment or
 * fulfilment can still change; stop once terminal (including expired).
 */
export function depotOrderLiveMs(
	status: OrderStatus | null | undefined,
): number | false {
	if (!status) return false;
	switch (status) {
		case "awaiting_payment":
			return LIVE_PAYMENT_MS;
		case "paid":
		case "released":
		case "loading":
			return LIVE_FULFILMENT_MS;
		case "loaded":
		case "cancelled":
		case "expired":
			return false;
		default:
			return false;
	}
}

type RequestLiveShape = {
	status: string;
	paymentStatus: string;
	collectionStatus?: string;
};

/**
 * Dangote / cooking-gas request detail — poll while staff review, payment, or
 * collection can still change; stop on reject / cancel / collected (or paid
 * when the product has no collection stage, e.g. cooking gas).
 */
export function requestOrderLiveMs(
	request: RequestLiveShape | null | undefined,
): number | false {
	if (!request) return false;
	if (request.status === "Rejected" || request.status === "Cancelled") {
		return false;
	}
	if (request.paymentStatus === "Unpaid" && request.status === "Approved") {
		return LIVE_PAYMENT_MS;
	}
	if (request.status === "Pending Review") return LIVE_FULFILMENT_MS;
	if (request.paymentStatus === "Paid") {
		// Cooking gas has no collection stage — paid is terminal for polling.
		if (request.collectionStatus == null) return false;
		if (request.collectionStatus === "Collected") return false;
		return LIVE_FULFILMENT_MS;
	}
	return false;
}
