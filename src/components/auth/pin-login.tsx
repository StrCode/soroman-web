import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, type Customer } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { identifierSchema, pinSchema } from "@/lib/validation";

const pinLoginSchema = z.object({
	identifier: identifierSchema,
	pin: pinSchema,
});

/**
 * PIN sign-in — the only credential the portal has. Either identifier on the
 * account works, so the box takes an email or a phone number and lets the API
 * client sort out which one it got.
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
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { identifier: "", pin: "" },
		validators: { onChange: pinLoginSchema },
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
				form.setFieldValue("pin", "");
				setError(
					err instanceof ApiError
						? err.message
						: "That didn't work — try a one-time code instead.",
				);
			}
		},
	});

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
			<form.Field name="identifier">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="pin-identifier">Email or phone number</Label>
						<Input
							id="pin-identifier"
							type="text"
							inputMode="email"
							autoComplete="username"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							placeholder="ada@company.com or 0802 123 4567"
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
						<FieldError meta={field.state.meta} id="pin-identifier-error" />
					</div>
				)}
			</form.Field>
			<form.Field name="pin">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="pin">PIN</Label>
						<Input
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
							aria-invalid={showFieldError(field.state.meta) || undefined}
							aria-describedby="pin-error"
							className="h-11 text-base tracking-[0.4em]"
						/>
						<FieldError meta={field.state.meta} id="pin-error" />
					</div>
				)}
			</form.Field>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
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
