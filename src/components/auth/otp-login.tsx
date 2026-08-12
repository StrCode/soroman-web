import { useForm } from "@tanstack/react-form";
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
import { phoneSchema, requiredTrimmed } from "@/lib/validation";

const phoneStepSchema = z.object({ phone: phoneSchema });
const nameStepSchema = z.object({
	name: requiredTrimmed("Your name is required."),
	companyName: z.string(),
});

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

type Step = "phone" | "code" | "name";

type OtpLoginProps = {
	onSuccess: (customer: Customer) => void;
	/**
	 * Pre-fills the phone step. When the checkout flow already collected a
	 * phone number, pass it here so the customer goes straight to the code.
	 */
	initialPhone?: string;
	/** Renders the "Use your PIN instead" toggle in the first step's label row. */
	onSwitchMethod?: () => void;
	/**
	 * Overrides the phone step's heading and intro — the login page's "Sign in
	 * with your phone" is wrong when the flow is a gate inside another task
	 * (e.g. "Verify your phone" mid-checkout). Later steps narrate themselves.
	 */
	title?: string;
	description?: string;
	/**
	 * When set, codes are requested via register instead of requestOtp.
	 * requestOtp is login-only — an unknown number silently gets nothing —
	 * while register serves both sides of the door: it creates a Pending
	 * account under this name for a new number and sends a plain login code to
	 * an existing one. Use it wherever the phone may not have an account yet.
	 */
	registerName?: string;
};

export default function OtpLogin({
	onSuccess,
	initialPhone,
	onSwitchMethod,
	title,
	description,
	registerName,
}: OtpLoginProps) {
	const [step, setStep] = useState<Step>("phone");
	const [phone, setPhone] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	// Sync lock — React state alone can't stop autofill + Enter / double-tap
	// from firing two verifies before the first re-render disables the form.
	const verifyInFlight = useRef(false);
	const [resendIn, setResendIn] = useState(0);
	const [remember, setRemember] = useState(true);
	const [devCode, setDevCode] = useState<string | null>(null);

	const phoneForm = useForm({
		defaultValues: { phone: initialPhone ?? "" },
		validators: { onChange: phoneStepSchema },
		onSubmit: async ({ value }) => sendCode(normalizePhone(value.phone)!),
	});

	const nameForm = useForm({
		defaultValues: { name: "", companyName: "" },
		validators: { onChange: nameStepSchema },
		onSubmit: async ({ value }) => {
			if (!customer) return;
			setIsBusy(true);
			setError(null);
			try {
				const updated = await api.me.update({
					name: value.name.trim(),
					...(value.companyName.trim()
						? { company_name: value.companyName.trim() }
						: {}),
				});
				authStore.signedIn(updated);
				toast.success(`Welcome to Soroman, ${updated.name}!`);
				onSuccess(updated);
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Could not save your details. Try again.",
				);
			} finally {
				setIsBusy(false);
			}
		},
	});

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const sendCode = async (targetPhone: string) => {
		setIsBusy(true);
		setError(null);
		try {
			const name = registerName?.trim();
			const { devCode: code } = name
				? await api.auth.register({ phone: targetPhone, name })
				: await api.auth.requestOtp(targetPhone);
			setDevCode(code ?? null);
			setPhone(targetPhone);
			setCode("");
			setResendIn(RESEND_COOLDOWN_SECONDS);
			setStep("code");
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Could not send the code. Check your connection and try again.",
			);
		} finally {
			setIsBusy(false);
		}
	};

	const verifyCode = async (otp: string) => {
		if (!phone || verifyInFlight.current) return;
		verifyInFlight.current = true;
		setIsBusy(true);
		setError(null);
		try {
			const session = await api.auth.verifyOtp(phone, otp, {
				trustDevice: remember,
				deviceName: deviceName(),
			});
			setCustomer(session.customer);
			if (!session.customer.name) {
				// New registration: the only other thing we ever require is a name.
				setStep("name");
			} else {
				authStore.signedIn(session.customer);
				onSuccess(session.customer);
			}
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

	if (step === "phone") {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void phoneForm.handleSubmit();
				}}
				className="grid gap-6"
			>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						{title ?? "Sign in with your phone"}
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{description ??
							"New here? Same door. Your account is created on the spot."}
					</p>
				</div>
				<phoneForm.Field name="phone">
					{(field) => (
						<div className="grid gap-1.5">
							<div className="flex items-baseline justify-between">
								<Label htmlFor="phone">Phone number</Label>
								{onSwitchMethod && (
									<button
										type="button"
										className="text-xs text-accent hover:underline"
										onClick={onSwitchMethod}
									>
										Use your PIN instead
									</button>
								)}
							</div>
							<PhoneField
								id="phone"
								autoComplete="tel"
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="phone-error"
								inputClassName="h-11 text-base"
								autoFocus
							/>
							<FieldError meta={field.state.meta} id="phone-error" />
						</div>
					)}
				</phoneForm.Field>
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
					We'll text you a one-time code — no password needed.
				</p>
			</form>
		);
	}

	if (step === "code") {
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
								setStep("phone");
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
							onClick={() => phone && void sendCode(phone)}
						>
							Resend code
						</button>
					)}
				</p>
			</form>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void nameForm.handleSubmit();
			}}
			className="grid gap-6"
		>
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					One last thing: your name
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					It goes on your invoices and delivery documents.
				</p>
			</div>
			<nameForm.Field name="name">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="name">Your name</Label>
						<Input
							id="name"
							autoComplete="name"
							placeholder="e.g. Musa Ibrahim"
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
			</nameForm.Field>
			<nameForm.Field name="companyName">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="company">Company name</Label>
						<Input
							id="company"
							autoComplete="organization"
							placeholder="e.g. Ibrahim Oil & Gas Ltd"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							className="h-11 text-base"
						/>
					</div>
				)}
			</nameForm.Field>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
			<Button type="submit" size="lg" disabled={isBusy}>
				{isBusy && <Loader2 className="animate-spin" />}
				Create account
			</Button>
		</form>
	);
}
