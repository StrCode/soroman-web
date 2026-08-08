import type { AnyFieldMeta } from "@tanstack/react-form";

/**
 * Whether a field's error should be visible. Errors exist from the first
 * keystroke (the zod schema runs on every change), but showing them before the
 * customer has even reached the field is nagging — so they surface only once
 * the field was touched. Submitting marks every field touched, so a straight
 * click on Continue lights up everything that's missing at once.
 */
export function showFieldError(meta: AnyFieldMeta): boolean {
	return meta.isTouched && !meta.isValid;
}

/**
 * The first error message for a field. Zod issues arrive as objects with a
 * `message`; function validators (if any are ever added) return plain strings.
 */
export function fieldErrorMessage(meta: AnyFieldMeta): string | null {
	const first = meta.errors[0];
	if (!first) return null;
	return typeof first === "string"
		? first
		: ((first as { message?: string }).message ?? null);
}

/** The error line under a field — renders nothing while the field is clean. */
export function FieldError({ meta, id }: { meta: AnyFieldMeta; id?: string }) {
	if (!showFieldError(meta)) return null;
	const message = fieldErrorMessage(meta);
	if (!message) return null;
	return (
		<p id={id} role="alert" className="text-xs text-destructive">
			{message}
		</p>
	);
}
