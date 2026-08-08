/**
 * Client for the Dangote portal API (backend routes/portal/dangoteOrder.route.js
 * and dangoteCatalog.route.js). Transport — cookies, bearer, CSRF, the
 * serialized refresh-and-retry — comes from lib/http's request().
 */
import { ApiError, request } from "@/lib/http";

import type {
	CustomerLicense,
	DangoteOrderRequest,
	DangoteOrderRequestSummary,
	DangoteProduct,
} from "./types";

const CATALOG = "/api/dangote-catalog";
const ORDERS = "/api/customer/dangote-orders";
const LICENSES = "/api/customer/licenses";

export type CreateDangoteOrderInput = {
	product: string;
	quantity: number;
	quantityUnit: "Litres" | "Kg" | "Tons";
	deliveryAddress: string;
	deliveryState: string;
	deliveryLga?: string;
	companyName?: string;
	/** From the customer's own register — the backend enforces ownership. */
	licenseId?: number;
};

/**
 * The detail/create wire row carries the account's company under
 * `companyName` and the request's own under `licenseCompanyName` (a join
 * artifact of the staff desk query). The portal cares about the request's
 * own name, so it lands on `companyName` here.
 */
type WireRequest = Omit<DangoteOrderRequest, "companyName"> & {
	companyName?: string | null;
	licenseCompanyName?: string | null;
};

function toRequest(wire: WireRequest): DangoteOrderRequest {
	const { licenseCompanyName, companyName, ...rest } = wire;
	return { ...rest, companyName: licenseCompanyName ?? companyName ?? "" };
}

/** Public: active Dangote products for the wizard's picker. */
export async function getDangoteCatalog(): Promise<DangoteProduct[]> {
	const { products } = await request<{ products: DangoteProduct[] }>(CATALOG);
	return products;
}

/** Submit the signed-in customer's order request; lands as Pending Review. */
export async function createDangoteOrder(
	input: CreateDangoteOrderInput,
): Promise<DangoteOrderRequest> {
	const { request: created } = await request<{ request: WireRequest }>(ORDERS, {
		method: "POST",
		csrf: true,
		body: input,
	});
	return toRequest(created);
}

export type ListPagination = {
	total: number;
	page: number;
	limit?: number;
	pages: number;
};

export type DangoteOrdersListParams = {
	page?: number;
	limit?: number;
	status?: "Pending Review" | "Approved" | "Rejected" | "Cancelled" | "all";
	paymentStatus?: "Unpaid" | "Paid";
	search?: string;
};

export type DangoteOrdersListResult = {
	requests: DangoteOrderRequestSummary[];
	pagination: ListPagination;
};

/** The customer's own requests, newest first — server-paginated. */
export async function listMyDangoteOrders(
	params: DangoteOrdersListParams = {},
): Promise<DangoteOrdersListResult> {
	const query = new URLSearchParams();
	query.set("page", String(params.page ?? 1));
	query.set("limit", String(params.limit ?? 25));
	if (params.status && params.status !== "all")
		query.set("status", params.status);
	if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
	if (params.search) query.set("search", params.search);

	return request<DangoteOrdersListResult>(`${ORDERS}?${query}`);
}

/** One of the customer's own requests. */
export async function getMyDangoteOrder(
	id: number,
): Promise<DangoteOrderRequest> {
	const { request: found } = await request<{ request: WireRequest }>(
		`${ORDERS}/${id}`,
	);
	return toRequest(found);
}

/** Settle an approved unpaid quote from wallet balance. */
export async function payMyDangoteOrder(
	id: number,
): Promise<DangoteOrderRequest> {
	const { request: paid } = await request<{ request: WireRequest }>(
		`${ORDERS}/${id}/pay`,
		{
			method: "POST",
			csrf: true,
		},
	);
	return toRequest(paid);
}

/**
 * Withdraw an unpaid order request (Pending Review, or Approved + Unpaid).
 * Lands as Cancelled — distinct from a staff rejection.
 */
export async function cancelMyDangoteOrder(
	id: number,
): Promise<DangoteOrderRequest> {
	const { request: cancelled } = await request<{ request: WireRequest }>(
		`${ORDERS}/${id}/cancel`,
		{ method: "POST", csrf: true },
	);
	return toRequest(cancelled);
}

// ── License register ───────────────────────────────────────────────────────

export type LicensesListParams = {
	page?: number;
	limit?: number;
	status?: "pending" | "approved" | "rejected";
};

export type LicensesListResult = {
	licenses: CustomerLicense[];
	pagination: ListPagination;
};

/** The customer's own license register, newest first — server-paginated. */
export async function listMyLicenses(
	params: LicensesListParams = {},
): Promise<LicensesListResult> {
	const query = new URLSearchParams();
	query.set("page", String(params.page ?? 1));
	query.set("limit", String(params.limit ?? 25));
	if (params.status) query.set("status", params.status);

	return request<LicensesListResult>(`${LICENSES}?${query}`);
}

/** Record an uploaded license on the customer's register (lands pending). */
export async function createLicense(input: {
	companyName: string;
	licenseUrl?: string;
	licensePublicId?: string;
	expiryDate?: string;
}): Promise<CustomerLicense> {
	const { license } = await request<{ license: CustomerLicense }>(LICENSES, {
		method: "POST",
		csrf: true,
		body: input,
	});
	return license;
}

/**
 * Push a license document straight to Cloudinary using a signature from the
 * backend — the file never travels through our server, the API secret never
 * reaches the browser.
 */
export async function uploadLicenseFile(
	file: File,
): Promise<{ licenseUrl: string; licensePublicId: string }> {
	const sig = await request<{
		timestamp: number;
		signature: string;
		apiKey: string;
		cloudName: string;
		folder: string;
	}>(`${LICENSES}/upload-signature`);

	const form = new FormData();
	form.append("file", file);
	form.append("api_key", sig.apiKey);
	form.append("timestamp", String(sig.timestamp));
	form.append("signature", sig.signature);
	form.append("folder", sig.folder);

	let res: Response;
	try {
		res = await fetch(
			`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
			{
				method: "POST",
				body: form,
			},
		);
	} catch {
		throw new ApiError(
			0,
			"Could not upload the license file. Check your connection and try again.",
		);
	}
	if (!res.ok) {
		throw new ApiError(
			res.status,
			"Could not upload the license file. Try again.",
		);
	}
	const uploaded = (await res.json()) as {
		secure_url: string;
		public_id: string;
	};
	return {
		licenseUrl: uploaded.secure_url,
		licensePublicId: uploaded.public_id,
	};
}
