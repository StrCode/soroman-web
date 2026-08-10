import { useEffect, useState } from "react";
import { DevCodeHint } from "@/components/auth/dev-code-hint";
import OtpInput from "@/components/auth/otp-input";
import {
	accountFieldsSchema,
	type DetailsFormApi,
} from "@/components/dangote-delivery/details-step";
import { FieldError, showFieldError } from "@/components/field-error";
import { BoxedInput } from "@/components/order/boxed";
import PhoneField from "@/components/phone-field";
import { Label } from "@/components/ui/label";
import {
	ApiError,
	api,
	type Customer,
	formatPhoneForDisplay,
	normalizePhone,
} from "@/lib/api";
import { authStore } from "@/lib/auth";
import { deviceName } from "@/lib/device";

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

export type AccountPhase = "fields" | "code";

type AccountStepProps = {
	form: DetailsFormApi;
	busy: boolean;
	error?: string | null;
	onError: (message: string | null) => void;
	onBusy: (busy: boolean) => void;
	phase: AccountPhase;
	onPhaseChange: (phase: AccountPhase) => void;
	/** Called after a successful OTP verify (and email save). */
	onVerified: (customer: Customer) => void;
	/**
	 * Parent assigns the Continue handler for the current phase into these
	 * slots so the footer CTA can drive send / verify without duplicating logic.
	 */
	continueHandlerRef: {
		current: (() => Promise<void>) | null;
	};
};

/**
 * Account step — name, phone, email, then phone OTP. Form-shaped so it reads
 * as part of the order, not a sudden sign-in wall. Email is required on the
 * profile (receipts/updates); phone is how the account is created / signed in.
 */
export default function AccountStep({
	form,
	busy,
	error,
	onError,
	onBusy,
	phase,
	onPhaseChange,
	onVerified,
	continueHandlerRef,
}: AccountStepProps) {
	const [code, setCode] = useState("");
	const [resendIn, setResendIn] = useState(0);
	const [remember, setRemember] = useState(true);
	const [devCode, setDevCode] = useState<string | null>(null);
	const [sentPhone, setSentPhone] = useState<string | null>(null);

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const sendCode = async () => {
		const parsed = accountFieldsSchema.safeParse({
			contactPerson: form.state.values.contactPerson,
			contactPhone: form.state.values.contactPhone,
			email: form.state.values.email,
		});
		if (!parsed.success) {
			onError(
				parsed.error.issues[0]?.message ??
					"Add your name, phone number, and email to continue.",
			);
			return;
		}

		const phone = normalizePhone(parsed.data.contactPhone)!;
		onBusy(true);
		onError(null);
		try {
			const { devCode: hint } = await api.auth.register({
				phone,
				name: parsed.data.contactPerson.trim(),
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

			const email = form.state.values.email.trim();
			const name = form.state.values.contactPerson.trim();
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
			onVerified(customer);
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
					<p className={FIELD_LABEL}>Verification</p>
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
			<div className="grid gap-5">
				<form.Field name="contactPerson">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="da-name" className={FIELD_LABEL}>
								Your name
							</Label>
							<BoxedInput
								id="da-name"
								autoComplete="name"
								placeholder="Ada Obi"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="da-name-error"
								autoFocus
							/>
							<FieldError meta={field.state.meta} id="da-name-error" />
						</div>
					)}
				</form.Field>

				<form.Field name="contactPhone">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="da-phone" className={FIELD_LABEL}>
								Phone number
							</Label>
							<PhoneField
								id="da-phone"
								autoComplete="tel"
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="da-phone-error"
								inputComponent={BoxedInput}
							/>
							<FieldError meta={field.state.meta} id="da-phone-error" />
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
							<Label htmlFor="da-email" className={FIELD_LABEL}>
								Email
							</Label>
							<BoxedInput
								id="da-email"
								type="email"
								inputMode="email"
								autoComplete="email"
								placeholder="ada@company.com"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="da-email-error"
							/>
							<FieldError meta={field.state.meta} id="da-email-error" />
							<p className="text-xs text-muted-foreground">
								Used for receipts and updates — and to sign in with your PIN.
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
