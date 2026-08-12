import { useForm } from "@tanstack/react-form";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { z } from "zod";
import { FieldError, showFieldError } from "@/components/field-error";
import PhoneField from "@/components/phone-field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, type Customer } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { emailSchema, phoneSchema, pinSchema } from "@/lib/validation";

function zodFieldError(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);
	return result.success ? undefined : result.error.issues[0]?.message;
}

/**
 * PIN sign-in — the only credential the portal has. Phone is the default
 * identifier (same country-aware field as OTP/register); email is one toggle
 * away for accounts that prefer it. Both resolve to the same customer.
 *
 * The device token (proof this browser passed an OTP once) rides along under
 * the hood; if it's missing or stale the backend refuses, and "Use a one-time
 * code instead" drops back to the OTP flow that mints a fresh one.
 */
export default function PinLogin({
	onSuccess,
	onUseCode,
}: {
	onSuccess: (customer: Customer) => void;
	onUseCode: () => void;
}) {
	const [mode, setMode] = useState<"phone" | "email">("phone");
	const [error, setError] = useState<string | null>(null);
	const pinRef = useRef<HTMLInputElement>(null);

	const form = useForm({
		defaultValues: { identifier: "", pin: "" },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const { customer } = await api.auth.loginWithPin(
					value.identifier,
					value.pin,
				);
				authStore.signedIn(customer);
				onSuccess(customer);
			} catch (err) {
				// Wipe the PIN for a clean retry, but reset field meta too —
				// otherwise a still-touched empty field also screams
				// "exactly 6 digits" under the real auth failure.
				form.resetField("pin");
				setError(
					err instanceof ApiError
						? err.message
						: "That didn't work — try a one-time code instead.",
				);
				queueMicrotask(() => pinRef.current?.focus());
			}
		},
	});

	const switchMode = (next: "phone" | "email") => {
		setMode(next);
		// Value + touched/error meta — otherwise a phone validation message
		// would still show under the empty email box (and vice versa).
		form.resetField("identifier");
		setError(null);
	};

	const identifierSchema = mode === "phone" ? phoneSchema : emailSchema;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="grid gap-6"
		>
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Sign in with your PIN
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					This device is trusted, so your 6-digit PIN gets you in — no code
					needed.
				</p>
			</div>
			<form.Field
				name="identifier"
				validators={{
					onChange: ({ value }) => zodFieldError(identifierSchema, value),
					onSubmit: ({ value }) => zodFieldError(identifierSchema, value),
				}}
			>
				{(field) => (
					<div className="grid gap-1.5">
						<div className="flex items-baseline justify-between">
							<Label htmlFor="pin-identifier">
								{mode === "phone" ? "Phone number" : "Email"}
							</Label>
							<button
								type="button"
								className="text-xs text-accent hover:underline"
								onClick={() =>
									switchMode(mode === "phone" ? "email" : "phone")
								}
							>
								{mode === "phone"
									? "Use email instead"
									: "Use phone instead"}
							</button>
						</div>
						{mode === "phone" ? (
							<PhoneField
								id="pin-identifier"
								autoComplete="tel"
								value={field.state.value}
								onChange={(next) => {
									field.handleChange(next);
									setError(null);
								}}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="pin-identifier-error"
								inputClassName="h-11 text-base"
								autoFocus
							/>
						) : (
							<Input
								id="pin-identifier"
								type="email"
								inputMode="email"
								autoComplete="username"
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								placeholder="ada@company.com"
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(e.target.value);
									setError(null);
								}}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="pin-identifier-error"
								className="h-11 text-base"
								autoFocus
							/>
						)}
						<FieldError meta={field.state.meta} id="pin-identifier-error" />
					</div>
				)}
			</form.Field>
			<form.Field
				name="pin"
				validators={{
					onChange: ({ value }) => zodFieldError(pinSchema, value),
					onSubmit: ({ value }) => zodFieldError(pinSchema, value),
				}}
			>
				{(field) => {
					const invalid = Boolean(error) || showFieldError(field.state.meta);
					return (
						<div className="grid gap-1.5">
							<Label htmlFor="pin">PIN</Label>
							<Input
								ref={pinRef}
								id="pin"
								type="password"
								inputMode="numeric"
								autoComplete="current-password"
								maxLength={6}
								placeholder="••••••"
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(
										e.target.value.replace(/\D/g, "").slice(0, 6),
									);
									setError(null);
								}}
								onBlur={field.handleBlur}
								aria-invalid={invalid || undefined}
								aria-describedby="pin-error"
								className="h-11 text-base tracking-[0.4em]"
							/>
							{error ? (
								<Alert id="pin-error" variant="destructive">
									<AlertCircleIcon />
									<AlertTitle>{error}</AlertTitle>
								</Alert>
							) : (
								<FieldError meta={field.state.meta} id="pin-error" />
							)}
						</div>
					);
				}}
			</form.Field>
			<form.Subscribe selector={(s) => s.isSubmitting}>
				{(isSubmitting) => (
					<Button type="submit" size="lg" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="animate-spin" />}
						Sign in
					</Button>
				)}
			</form.Subscribe>
			<p className="text-xs text-muted-foreground">
				<button
					type="button"
					className="underline underline-offset-4 hover:text-foreground"
					onClick={onUseCode}
				>
					Use a one-time code instead
				</button>
			</p>
		</form>
	);
}
