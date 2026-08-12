import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Phone parsing for Nigeria-only intake. Canonical form is E.164
 * (+2348012345678) — exactly what the backend stores, so what a form
 * submits matches the server byte for byte.
 *
 * The default metadata bundle here is the "min" one: validation-sufficient and
 * ~75 KB lighter than the /max bundle the server uses (only getType() needs
 * /max, and the browser never asks for the number's type).
 */

/** Only Nigerian numbers are accepted for now. */
export const DEFAULT_PHONE_COUNTRY = "NG";

/**
 * Normalizes input to Nigerian E.164, or null if the number is not a valid
 * NG number. Accepts "0803...", "+234 803...", etc. Rejects other countries
 * even when they parse as valid internationally.
 */
export function normalizePhone(input: string): string | null {
	const parsed = parsePhoneNumberFromString(
		input.trim(),
		DEFAULT_PHONE_COUNTRY,
	);
	if (!parsed?.isValid()) return null;
	if (parsed.country !== DEFAULT_PHONE_COUNTRY) return null;
	return parsed.number;
}

/** Nigerian national form ("0803 123 4567"); falls back to the raw string. */
export function formatPhoneForDisplay(e164: string): string {
	const parsed = parsePhoneNumberFromString(e164);
	if (!parsed) return e164;
	return parsed.country === DEFAULT_PHONE_COUNTRY
		? parsed.formatNational()
		: parsed.formatInternational();
}
