import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Phone parsing, mirroring the backend's utils/phone.js: delegated to
 * libphonenumber rather than a Nigeria-only regex, because customers buying
 * fuel in Nigeria do not necessarily hold Nigerian numbers. Canonical form is
 * E.164 (+2348012345678, +447400123456) — exactly what the backend stores, so
 * what a form submits matches the server byte for byte.
 *
 * The default metadata bundle here is the "min" one: validation-sufficient and
 * ~75 KB lighter than the /max bundle the server uses (only getType() needs
 * /max, and the browser never asks for the number's type).
 */

/**
 * Country assumed when a number arrives without a country code. A bare
 * "0803..." is Nigerian; international customers pick their flag (or type
 * +<code>), same convention the backend documents at its API boundary.
 */
export const DEFAULT_PHONE_COUNTRY = "NG";

/**
 * Normalizes input to E.164, or null if the number is not valid anywhere.
 * Accepts "0803...", "+234 803...", "+44 7400..." etc.
 */
export function normalizePhone(input: string): string | null {
	const parsed = parsePhoneNumberFromString(
		input.trim(),
		DEFAULT_PHONE_COUNTRY,
	);
	return parsed?.isValid() ? parsed.number : null;
}

/**
 * Nigerian numbers show in the familiar national form ("0803 123 4567");
 * anything else keeps its country code ("+44 7400 123456") so it can't be
 * mistaken for a local number.
 */
export function formatPhoneForDisplay(e164: string): string {
	const parsed = parsePhoneNumberFromString(e164);
	if (!parsed) return e164;
	return parsed.country === DEFAULT_PHONE_COUNTRY
		? parsed.formatNational()
		: parsed.formatInternational();
}
