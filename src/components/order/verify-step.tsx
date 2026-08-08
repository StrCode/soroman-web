import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";
import { DevCodeHint } from "@/components/auth/dev-code-hint";
import OtpInput from "@/components/auth/otp-input";
import { FieldError, showFieldError } from "@/components/field-error";
import { BoxedInput } from "@/components/order/boxed";
import PhoneField from "@/components/phone-field";
import { Label } from "@/components/ui/label";
import {
	ApiError,
	api,
	formatPhoneForDisplay,
	normalizePhone,
} from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth";
import { deviceName } from "@/lib/device";
import { emailSchema, phoneSchema, requiredTrimmed } from "@/lib/validation";

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

const accountSchema = z.object({
	name: requiredTrimmed("Your name is required."),
	phone: phoneSchema,
	email: emailSchema,
});

export type DepotAccountPhase = "fields" | "code";

type VerifyStepProps = {
	phase: DepotAccountPhase;
	onPhaseChange: (phase: DepotAccountPhase) => void;
	busy: boolean;
	onBusy: (busy: boolean) => void;
	error: string | null;
	onError: (message: string | null) => void;
	/** Advances to review after a successful OTP (or when already signed in). */
	onVerified: () => void;
	continueHandlerRef: { current: (() => Promise<void>) | null };
};

/**
 * Account gate after Loading — name, phone, required email, then OTP.
 * Signed-in buyers are advanced by the parent (this step is skipped). Email
 * is profile-only; phone creates / signs in. Placement happens on Review.
 */
export default function VerifyStep({
	phase,
	onPhaseChange,
	busy,
	onBusy,
	error,
	onError,
	onVerified,
	continueHandlerRef,
}: VerifyStepProps) {
	const auth = useAuth();
	const [code, setCode] = useState("");
	const [resendIn, setResendIn] = useState(0);
	const [remember, setRemember] = useState(true);
	const [devCode, setDevCode] = useState<string | null>(null);
	const [sentPhone, setSentPhone] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			name: auth.status === "authed" ? auth.customer.name || "" : "",
			phone: auth.status === "authed" ? auth.customer.phone || "" : "",
			email: auth.status === "authed" ? auth.customer.email?.trim() || "" : "",
		},
		validators: { onChange: accountSchema },
	});

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	// Mid-wizard sign-in (e.g. another tab) — advance to review.
	useEffect(() => {
		if (auth.status === "authed") onVerified();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.status]);

	const sendCode = async () => {
		const parsed = accountSchema.safeParse(form.state.values);
		if (!parsed.success) {
			onError(
				parsed.error.issues[0]?.message ??
					"Add your name, phone number, and email to continue.",
			);
			return;
		}
		const phone = normalizePhone(parsed.data.phone)!;
		onBusy(true);
		onError(null);
		try {
			const { devCode: hint } = await api.auth.register({
				phone,
				name: parsed.data.name.trim(),
			});
			setDevCode(hint ?? null);
			setSentPhone(phone);
			setCode("");
			setResendIn(RESEND_COOLDOWN_SECONDS);
			onPhaseChange("code");
		} catch (err) {
			onError(
				err instanceof ApiError
					? err.message
					: "Could not send the code. Check your connection and try again.",
			);
		} finally {
			onBusy(false);
		}
	};

	const verifyCode = async (otp: string = code) => {
		if (!sentPhone || otp.length < OTP_LENGTH) {
			onError("Enter the 6-digit code we texted you.");
			return;
		}
		onBusy(true);
		onError(null);
		try {
			const session = await api.auth.verifyOtp(sentPhone, otp, {
				trustDevice: remember,
				deviceName: deviceName(),
			});
			let customer = session.customer;
			authStore.signedIn(customer);

			const name = form.state.values.name.trim();
			const email = form.state.values.email.trim();
			const patch: { name?: string; email?: string } = {};
			if (name && name !== customer.name) patch.name = name;
			if (email && email !== (customer.email ?? "")) patch.email = email;
			if (Object.keys(patch).length > 0) {
				try {
					customer = await api.me.update(patch);
					authStore.signedIn(customer);
				} catch {
					// Signed in; profile polish can wait.
				}
			}
			onVerified();
		} catch (err) {
			setCode("");
			onError(
				err instanceof ApiError
					? err.message
					: "That code didn't work. Try again.",
			);
		} finally {
			onBusy(false);
		}
	};

	continueHandlerRef.current =
		phase === "code" ? () => verifyCode() : () => sendCode();

	if (phase === "code") {
		return (
			<section className="grid gap-5">
				<div>
					<p className="text-sm font-medium tracking-tight">
						Confirm it&apos;s you
					</p>
					<p className="mt-2 text-sm text-muted-foreground">
						Sent to{" "}
						<span className="font-medium text-foreground">
							{sentPhone ? formatPhoneForDisplay(sentPhone) : "your phone"}
						</span>{" "}
						·{" "}
						<button
							type="button"
							className="cursor-pointer underline underline-offset-4 hover:text-foreground"
							disabled={busy}
							onClick={() => {
								onPhaseChange("fields");
								onError(null);
								setCode("");
							}}
						>
							Change
						</button>
					</p>
				</div>
				<OtpInput
					value={code}
					onChange={(next) => {
						setCode(next);
						onError(null);
						if (next.length === OTP_LENGTH) void verifyCode(next);
					}}
					length={OTP_LENGTH}
					disabled={busy}
					label="6-digit verification code"
				/>
				<DevCodeHint code={devCode} />
				<label className="flex items-center gap-2.5 text-sm text-muted-foreground">
					<input
						type="checkbox"
						checked={remember}
						onChange={(e) => setRemember(e.target.checked)}
						className="size-4 accent-accent"
					/>
					Remember this device — use a PIN next time, no code
				</label>
				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
				<p className="text-xs text-muted-foreground">
					The code expires in 10 minutes.{" "}
					{resendIn > 0 ? (
						<>You can resend in {resendIn}s.</>
					) : (
						<button
							type="button"
							className="cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
							disabled={busy}
							onClick={() => void sendCode()}
						>
							Resend code
						</button>
					)}
				</p>
			</section>
		);
	}

	return (
		<section>
			<p className="mb-5 text-sm text-muted-foreground">
				Save this order to your account so you can pay and track it. No
				password.
			</p>
			<div className="grid gap-5">
				<form.Field name="name">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="depot-account-name" className={FIELD_LABEL}>
								Your name
							</Label>
							<BoxedInput
								id="depot-account-name"
								autoComplete="name"
								placeholder="Ada Obi"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="depot-account-name-error"
								autoFocus
							/>
							<FieldError
								meta={field.state.meta}
								id="depot-account-name-error"
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="phone">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="depot-account-phone" className={FIELD_LABEL}>
								Phone number
							</Label>
							<PhoneField
								id="depot-account-phone"
								autoComplete="tel"
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="depot-account-phone-error"
								inputComponent={BoxedInput}
							/>
							<FieldError
								meta={field.state.meta}
								id="depot-account-phone-error"
							/>
							<p className="text-xs text-muted-foreground">
								We&apos;ll text a one-time code — your account is created if
								you&apos;re new.
							</p>
						</div>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="depot-account-email" className={FIELD_LABEL}>
								Email
							</Label>
							<BoxedInput
								id="depot-account-email"
								type="email"
								inputMode="email"
								autoComplete="email"
								placeholder="ada@company.com"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="depot-account-email-error"
							/>
							<FieldError
								meta={field.state.meta}
								id="depot-account-email-error"
							/>
							<p className="text-xs text-muted-foreground">
								Saved to your profile for receipts and updates — not used to
								sign in.
							</p>
						</div>
					)}
				</form.Field>

				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
			</div>
		</section>
	);
}
