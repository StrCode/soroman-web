import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { DevCodeHint } from "@/components/auth/dev-code-hint";
import OtpInput from "@/components/auth/otp-input";
import { FieldError, showFieldError } from "@/components/field-error";
import PhoneField from "@/components/phone-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
	emailSchema,
	phoneSchema,
	pinSchema,
	requiredTrimmed,
} from "@/lib/validation";

const detailsSchema = z
	.object({
		name: requiredTrimmed("Your name is required."),
		companyName: z.string(),
		phone: phoneSchema,
		email: emailSchema,
		pin: pinSchema,
		confirm: z.string(),
	})
	.refine((d) => d.pin === d.confirm, {
		message: "The PINs don't match.",
		path: ["confirm"],
	});

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

type Step = "details" | "code";

type PhoneRegisterProps = {
	onSuccess: (customer: Customer) => void;
};

/**
 * Registration in two screens: everything the account needs up front — name,
 * phone, email, and the PIN they'll sign in with — then one code to the phone
 * to prove the number.
 *
 * The PIN is collected on the first screen but can only be *saved* after the
 * code clears, since POST /pin needs a session. Email rides along on
 * /register, which stores it as the second sign-in identifier.
 *
 * The response to /register is deliberately generic (it never confirms
 * whether a number exists), so the UI always advances to the code step.
 */
export default function PhoneRegister({ onSuccess }: PhoneRegisterProps) {
	const [step, setStep] = useState<Step>("details");
	const [phone, setPhone] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	// Sync lock — React state alone can't stop autofill + Enter / double-tap
	// from firing two verifies before the first re-render disables the form.
	const verifyInFlight = useRef(false);
	const [resendIn, setResendIn] = useState(0);
	const [devCode, setDevCode] = useState<string | null>(null);

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const detailsForm = useForm({
		defaultValues: {
			name: "",
			companyName: "",
			phone: "",
			email: "",
			pin: "",
			confirm: "",
		},
		validators: { onChange: detailsSchema },
		onSubmit: async ({ value }) => {
			const e164 = normalizePhone(value.phone)!;
			setIsBusy(true);
			setError(null);
			try {
				const { devCode: dc } = await api.auth.register({
					phone: e164,
					name: value.name.trim(),
					email: value.email.trim().toLowerCase(),
					...(value.companyName.trim()
						? { companyName: value.companyName.trim() }
						: {}),
				});
				setDevCode(dc ?? null);
				setPhone(e164);
				setCode("");
				setResendIn(RESEND_COOLDOWN_SECONDS);
				setStep("code");
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Could not start registration. Check your connection and try again.",
				);
			} finally {
				setIsBusy(false);
			}
		},
	});

	const verifyCode = async (otp: string) => {
		if (!phone || verifyInFlight.current) return;
		verifyInFlight.current = true;
		setIsBusy(true);
		setError(null);
		try {
			// Trust this device on the way in, so the PIN chosen on the first screen
			// can stand in for the OTP from here on.
			const session = await api.auth.verifyOtp(phone, otp, {
				trustDevice: true,
				deviceName: deviceName(),
			});
			authStore.signedIn(session.customer);

			// The PIN could only be collected, not saved, until now — POST /pin
			// needs the session this verification just created. If it fails the
			// account is still perfectly good, so say so rather than stranding
			// someone on a code screen they've already cleared.
			try {
				await api.me.setPin(detailsForm.state.values.pin);
				toast.success(`Welcome to Soroman, ${session.customer.name}!`);
			} catch {
				toast.success(
					"You're in — but we couldn't save your PIN. Set one in Account.",
				);
			}
			setCode("");
			onSuccess(session.customer);
		} catch (err) {
			setCode("");
			setError(
				err instanceof ApiError
					? err.message
					: "That code didn't work. Try again.",
			);
		} finally {
			verifyInFlight.current = false;
			setIsBusy(false);
		}
	};

	const handleCodeChange = (next: string) => {
		setCode(next);
		setError(null);
		if (next.length === OTP_LENGTH) void verifyCode(next);
	};

	const resend = async () => {
		if (!phone) return;
		setIsBusy(true);
		setError(null);
		try {
			// Re-registering the same number is safe — the backend answers the
			// same generic body and issues a fresh code.
			await api.auth.register({
				phone,
				name: detailsForm.state.values.name.trim(),
				email: detailsForm.state.values.email.trim().toLowerCase(),
			});
			setResendIn(RESEND_COOLDOWN_SECONDS);
		} catch {
			setError("Could not resend the code. Try again shortly.");
		} finally {
			setIsBusy(false);
		}
	};

	const pinField = (name: "pin" | "confirm", id: string, label: string) => (
		<detailsForm.Field name={name}>
			{(field) => (
				<div className="grid gap-1.5">
					<Label htmlFor={id}>{label}</Label>
					<Input
						id={id}
						type="password"
						inputMode="numeric"
						autoComplete="new-password"
						maxLength={6}
						placeholder="••••••"
						value={field.state.value}
						onChange={(e) =>
							field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 6))
						}
						onBlur={field.handleBlur}
						aria-invalid={showFieldError(field.state.meta) || undefined}
						aria-describedby={`${id}-error`}
						className="h-11 text-base tracking-[0.4em]"
					/>
					<FieldError meta={field.state.meta} id={`${id}-error`} />
				</div>
			)}
		</detailsForm.Field>
	);

	if (step === "details") {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void detailsForm.handleSubmit();
				}}
				className="grid gap-6"
			>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Create your account
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						Pick a PIN to sign in with, then one code to your phone and you're
						in — no password needed.
					</p>
				</div>
				<detailsForm.Field name="name">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="name">Your name</Label>
							<Input
								id="name"
								autoComplete="name"
								placeholder="Ada Obi"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="name-error"
								className="h-11 text-base"
								autoFocus
							/>
							<FieldError meta={field.state.meta} id="name-error" />
						</div>
					)}
				</detailsForm.Field>
				<detailsForm.Field name="companyName">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="company">
								Company{" "}
								<span className="text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id="company"
								autoComplete="organization"
								placeholder="Obi Fuels Ltd"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								className="h-11 text-base"
							/>
						</div>
					)}
				</detailsForm.Field>
				<detailsForm.Field name="phone">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="phone">Phone number</Label>
							<PhoneField
								id="phone"
								autoComplete="tel"
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="reg-phone-error"
								inputClassName="h-11 text-base"
							/>
							<FieldError meta={field.state.meta} id="reg-phone-error" />
						</div>
					)}
				</detailsForm.Field>
				<detailsForm.Field name="email">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="reg-email">Email</Label>
							<Input
								id="reg-email"
								type="email"
								inputMode="email"
								autoComplete="email"
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								placeholder="ada@company.com"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="reg-email-error"
								className="h-11 text-base"
							/>
							<FieldError meta={field.state.meta} id="reg-email-error" />
						</div>
					)}
				</detailsForm.Field>
				<div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
					{pinField("pin", "reg-pin", "PIN")}
					{pinField("confirm", "reg-confirm-pin", "Confirm PIN")}
				</div>
				<p className="-mt-2 text-xs text-muted-foreground">
					You'll sign in with your email or phone number and this 6-digit PIN.
				</p>
				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" size="lg" disabled={isBusy}>
					{isBusy && <Loader2 className="animate-spin" />}
					Send code
				</Button>
				<p className="text-xs text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/login"
						className="underline underline-offset-4 hover:text-foreground"
					>
						Sign in
					</Link>
				</p>
			</form>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void verifyCode(code);
			}}
			className="grid gap-6"
		>
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Enter the code
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Sent to{" "}
					<span className="font-medium text-foreground">
						{phone ? formatPhoneForDisplay(phone) : "your phone"}
					</span>{" "}
					·{" "}
					<button
						type="button"
						className="underline underline-offset-4 hover:text-foreground"
						onClick={() => {
							setStep("details");
							setError(null);
						}}
					>
						Change
					</button>
				</p>
			</div>
			<OtpInput
				value={code}
				onChange={handleCodeChange}
				length={OTP_LENGTH}
				disabled={isBusy}
				label="6-digit verification code"
			/>
			<DevCodeHint code={devCode} />
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
			<Button
				type="submit"
				size="lg"
				disabled={isBusy || code.length < OTP_LENGTH}
			>
				{isBusy && <Loader2 className="animate-spin" />}
				Verify
			</Button>
			<p className="text-xs text-muted-foreground">
				The code expires in 10 minutes.{" "}
				{resendIn > 0 ? (
					<>You can resend in {resendIn}s.</>
				) : (
					<button
						type="button"
						className="underline underline-offset-4 hover:text-foreground disabled:opacity-50"
						disabled={isBusy}
						onClick={() => void resend()}
					>
						Resend code
					</button>
				)}
			</p>
		</form>
	);
}
