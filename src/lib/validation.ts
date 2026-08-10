import { z } from "zod";

import { normalizePhone } from "@/lib/phone";

/**
 * Shared zod field schemas for the app's TanStack forms. Every message here is
 * written for the customer and appears directly under its field — keep them
 * short, specific, and free of jargon.
 */

// No example number in the message — the field's placeholder already shows
// one in the selected country's own format.
export const phoneSchema = z
	.string()
	.min(1, "Enter your phone number.")
	.refine((v) => normalizePhone(v) !== null, "Enter a valid phone number.");

export const emailSchema = z
	.string()
	.trim()
	.min(1, "Enter your email address.")
	.pipe(z.email("Enter a valid email address, e.g. name@company.com."));

/** Empty is fine; anything typed must be a real address. */
export const optionalEmailSchema = z
	.string()
	.trim()
	.refine(
		(v) => v === "" || z.email().safeParse(v).success,
		"Enter a valid email address, or leave it empty.",
	);

/**
 * Sign-in takes either identifier in one box. An "@" is the only thing that
 * tells them apart — a phone number can never contain one.
 */
export const identifierSchema = z
	.string()
	.trim()
	.min(1, "Enter your email address or phone number.")
	.refine(
		(v) =>
			v.includes("@")
				? z.email().safeParse(v).success
				: normalizePhone(v) !== null,
		"Enter a valid email address or phone number.",
	);

export const pinSchema = z
	.string()
	.regex(/^\d{6}$/, "Your PIN is exactly 6 digits.");

export const requiredTrimmed = (message: string) =>
	z.string().trim().min(1, message);
