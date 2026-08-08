/**
 * The wizard's client-side draft. Nothing exists server-side until the
 * customer submits (one POST), so the whole form travels here — a refresh
 * resumes exactly where they were. Cleared on submit, or when the customer
 * exits via the top-left back to /order.
 */
const KEY = "soroman.dangote-delivery.draft";

export type DangoteDeliveryWizardStep =
	| "details"
	| "account"
	| "company"
	| "review";

export type DangoteDeliveryDraft = {
	step: DangoteDeliveryWizardStep;
	details: {
		product: string;
		quantity: string;
		deliveryAddress: string;
		deliveryState: string;
		companyName: string;
		contactPerson: string;
		contactPhone: string;
		/** Profile email — required on the account step; not used for login. */
		email?: string;
	};
	/** A license picked from the register; a held FILE can't survive a refresh. */
	licenseId?: number | null;
};

const STEPS: readonly DangoteDeliveryWizardStep[] = [
	"details",
	"account",
	"company",
	"review",
];

export function readDangoteDeliveryDraft(): DangoteDeliveryDraft | null {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<DangoteDeliveryDraft>;
		if (!parsed.details || typeof parsed.details !== "object") return null;
		const step =
			typeof parsed.step === "string" &&
			(STEPS as readonly string[]).includes(parsed.step)
				? (parsed.step as DangoteDeliveryWizardStep)
				: "details";
		return {
			step,
			licenseId: typeof parsed.licenseId === "number" ? parsed.licenseId : null,
			details: {
				product: parsed.details.product ?? "PMS",
				quantity: parsed.details.quantity ?? "",
				deliveryAddress: parsed.details.deliveryAddress ?? "",
				deliveryState: parsed.details.deliveryState ?? "",
				companyName: parsed.details.companyName ?? "",
				contactPerson: parsed.details.contactPerson ?? "",
				contactPhone: parsed.details.contactPhone ?? "",
				email: parsed.details.email ?? "",
			},
		};
	} catch {
		return null;
	}
}

export function writeDangoteDeliveryDraft(draft: DangoteDeliveryDraft) {
	sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearDangoteDeliveryDraft() {
	sessionStorage.removeItem(KEY);
}
