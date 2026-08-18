/**
 * Client for the LPG (Cooking Gas) portal API — the real endpoints on the
 * backend (routes/portal/lpgCatalog.route.js + lpgOrder.route.js). Transport
 * (cookies, bearer, CSRF, refresh-and-retry) comes from lib/http's request().
 *
 * The real model is a QUOTE REQUEST, not an instant-pay cart: a station quotes
 * a price per Kg, the customer picks one cylinder size + quantity, and staff
 * price delivery and approve it (Pending Review → …). One size per request.
 *
 * All calls no-op when VITE_COOKING_GAS_ENABLED is off — no network request.
 */
import { env } from "@/env";
import { request } from "@/lib/http";

function assertCookingGasEnabled(): void {
	if (!env.VITE_COOKING_GAS_ENABLED) {
		throw new Error("Cooking gas is coming soon.");
	}
}

/** A cylinder size a station currently has in stock. */
export type LpgCylinder = { sizeKg: number; available: number };

/** An open LPG station from the public catalog. */
export type LpgStation = {
	id: number;
	name: string;
	state: string;
	city: string;
	/** Naira per kilogram — a cylinder costs sizeKg × pricePerKg. */
	pricePerKg: number;
	cylinders: LpgCylinder[];
};

export type LpgStatus = "Pending Review" | "Approved" | "Rejected" | string;

/** The order request as create and the detail read return it. */
export type LpgOrderRequest = {
	id: number;
	requestNumber: string;
	stationName: string | null;
	cylinderSizeKg: number;
	cylinderQuantity: number;
	deliveryAddress: string;
	deliveryState: string;
	status: LpgStatus;
	paymentStatus: string;
	pricePerKg: string | null;
	deliveryPrice: string | null;
	totalAmount: string | null;
	createdAt: string;
	/**
	 * The LPG station's bank account to pay into — set once staff approve and
	 * price the request (same admin-configured Bank Accounts feature depot
	 * orders use). Null until then.
	 */
	virtualAccountNumber: string | null;
	virtualAccountBank: string | null;
	virtualAccountName: string | null;
};

const CATALOG = "/api/lpg-catalog";
const ORDERS = "/api/customer/lpg-orders";

/** Public: open LPG stations with price/Kg and in-stock cylinder sizes. */
export async function getLpgCatalog(): Promise<LpgStation[]> {
	assertCookingGasEnabled();
	const { stations } = await request<{ stations: LpgStation[] }>(CATALOG);
	return stations;
}

export type CreateLpgOrderInput = {
	lpgStationId: number;
	cylinderSizeKg: number;
	cylinderQuantity: number;
	deliveryAddress: string;
	deliveryState?: string;
	deliveryLga?: string;
};

/** Submit the signed-in customer's cooking-gas request; lands Pending Review. */
export async function createLpgOrder(
	input: CreateLpgOrderInput,
): Promise<LpgOrderRequest> {
	assertCookingGasEnabled();
	const { request: created } = await request<{ request: LpgOrderRequest }>(
		ORDERS,
		{
			method: "POST",
			csrf: true,
			body: input,
		},
	);
	return created;
}

export type LpgOrdersListParams = {
	page?: number;
	limit?: number;
	status?: "Pending Review" | "Approved" | "Rejected" | "Cancelled" | "all";
	paymentStatus?: "Unpaid" | "Paid";
};

export type LpgOrdersListPagination = {
	total: number;
	page: number;
	limit?: number;
	pages: number;
};

export type LpgOrdersListResult = {
	requests: LpgOrderRequest[];
	pagination: LpgOrdersListPagination;
};

/** The customer's own cooking-gas requests, newest first — server-paginated. */
export async function listMyLpgOrders(
	params: LpgOrdersListParams = {},
): Promise<LpgOrdersListResult> {
	assertCookingGasEnabled();
	const query = new URLSearchParams();
	query.set("page", String(params.page ?? 1));
	query.set("limit", String(params.limit ?? 25));
	if (params.status && params.status !== "all")
		query.set("status", params.status);
	if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);

	return request<LpgOrdersListResult>(`${ORDERS}?${query}`);
}

/** One of the customer's own requests. */
export async function getMyLpgOrder(id: number): Promise<LpgOrderRequest> {
	assertCookingGasEnabled();
	const { request: found } = await request<{ request: LpgOrderRequest }>(
		`${ORDERS}/${id}`,
	);
	return found;
}
