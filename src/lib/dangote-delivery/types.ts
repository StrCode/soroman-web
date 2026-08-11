/**
 * The Dangote Delivery contract, mirrored from the backend's
 * dangote_order_requests model (schema/dangoteOrderRequest.js): a customer
 * submits a bulk order request, staff review and price it (Approved sets the
 * quote and payment account), and payment/collection are stamped as they
 * happen. One submission, no server-side draft — the wizard keeps its state
 * client-side until the customer submits.
 */

/** Products offered on the Dangote Delivery order request (static fallback
 * when /api/dangote-catalog has no rows yet). */
export const DANGOTE_DELIVERY_PRODUCTS = ["PMS", "AGO", "LPG"] as const;
export type DangoteDeliveryProduct = (typeof DANGOTE_DELIVERY_PRODUCTS)[number];

export const PRODUCT_META: Record<
	DangoteDeliveryProduct,
	{
		label: string;
		code: DangoteDeliveryProduct;
		/** What the backend stores in `quantity_unit`. */
		unit: "Litres" | "Kg";
		unitShort: string;
	}
> = {
	PMS: { label: "Petrol", code: "PMS", unit: "Litres", unitShort: "L" },
	AGO: { label: "Diesel", code: "AGO", unit: "Litres", unitShort: "L" },
	LPG: { label: "LPG", code: "LPG", unit: "Kg", unitShort: "kg" },
};

/** A product row from the public catalog. */
export type DangoteProduct = {
	id: number;
	name: string;
	sku: string;
	category: string;
	unit: string;
	description: string;
};

export const DANGOTE_STATUSES = [
	"Pending Review",
	"Approved",
	"Rejected",
	"Cancelled",
] as const;
export type DangoteStatus = (typeof DANGOTE_STATUSES)[number];

export type DangotePaymentStatus = "Unpaid" | "Paid";
export type DangoteCollectionStatus = "Pending" | "Dispatched" | "Collected";

/** Customer-facing names — the wire values read like staff desk states. */
export const STATUS_LABELS: Record<string, string> = {
	"Pending Review": "Under review",
	Approved: "Order ready",
	Rejected: "Rejected",
	Cancelled: "Cancelled",
};

/** A row from the customer's own listing. */
export type DangoteOrderRequestSummary = {
	id: number;
	requestNumber: string;
	product: string;
	quantity: number;
	quantityUnit: string;
	deliveryAddress: string;
	deliveryState: string;
	status: DangoteStatus;
	paymentStatus: DangotePaymentStatus;
	collectionStatus: DangoteCollectionStatus;
	pricePerUnit: string | null;
	totalAmount: string | null;
	expectedArrivalDate: string | null;
	/**
	 * Staff-entered bank details shown at approval. Still named
	 * virtualAccount* on the wire for history; also aliased as
	 * bankName / accountName / accountNumber.
	 */
	virtualAccountNumber: string;
	virtualAccountBank: string;
	createdAt: string;
};

/** The full record, as returned by create and the detail read. */
export type DangoteOrderRequest = DangoteOrderRequestSummary & {
	/** The company named on this request (wire: licenseCompanyName). */
	companyName: string;
	/** The attached register license, if any, with its verification state. */
	licenseId: number | null;
	licenseStatus: LicenseStatus | null;
	licenseUrl: string | null;
	deliveryLga: string;
	deliveryPrice: string | null;
	paymentReference: string | null;
	paymentMode: string | null;
	virtualAccountName: string;
	reviewedAt: string | null;
	updatedAt: string;
};

export function formatDangoteQuantity(quantity: number, unit: string): string {
	const short = unit === "Kg" ? "kg" : unit === "Litres" ? "L" : unit;
	return `${quantity.toLocaleString()} ${short}`;
}

// ── License register ───────────────────────────────────────────────────────

export type LicenseStatus = "pending" | "approved" | "rejected";

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
	pending: "Awaiting verification",
	approved: "Verified",
	rejected: "Rejected",
};

/** A license on the customer's own register. */
export type CustomerLicense = {
	id: number;
	companyName: string;
	licenseUrl: string;
	/** ISO date or null; expired licenses shouldn't be reattached. */
	expiryDate: string | null;
	status: LicenseStatus;
	createdAt: string;
};

/** Reusable without another upload: approved and not expired. */
export function licenseUsable(license: CustomerLicense): boolean {
	if (license.status === "rejected") return false;
	if (!license.expiryDate) return true;
	return new Date(license.expiryDate).getTime() > Date.now();
}

/** Upload constraints, enforced client-side before Cloudinary sees the file. */
export const LICENSE_MAX_BYTES = 10 * 1024 * 1024;
export const LICENSE_ACCEPTED_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
] as const;
