import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import OtpInput from "@/components/auth/otp-input";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, type Customer, formatPhoneForDisplay } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { deviceName } from "@/lib/device";
import { cn } from "@/lib/utils";
import { emailSchema } from "@/lib/validation";

const credentialsSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Enter your password."),
});

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Email + password sign-in for an existing account.
 *
 * There is no "create an account with email" — accounts are phone-first
 * (see /register), and email+password is added later from account settings.
 * So this is purely a login: correct credentials on a recognised device sign
 * straight in; on a new device the backend asks for the OTP it just texted to
 * the phone on file (the step-up), and trusting the device means the next
 * password login here skips it. "Forgot?" routes to phone sign-in — there is
 * no email reset link to click.
 */
type Step = "credentials" | "otp";

type EmailLoginProps = {
	onSuccess: (customer: Customer) => void;
	/** Renders the "Use phone instead" toggle in the first step's label row. */
	onSwitchMethod?: () => void;
};

/**
 * Rough-and-honest strength score, 0–4. Length does most of the work —
 * variety nudges, composition rules don't gate.
 */
export function passwordStrength(password: string): {
	score: number;
	label: string;
} {
	if (password.length === 0) return { score: 0, label: "" };
	if (password.length < MIN_PASSWORD_LENGTH) {
		return {
			score: 1,
			label: `Too short — at least ${MIN_PASSWORD_LENGTH} characters.`,
		};
	}
	let score = 2;
	if (password.length >= 12) score += 1;
	if (
		/[A-Z]/.test(password) &&
		/[0-9!@#$%^&*(){}[\]\-_+=.,;:'"`~\\/|<>?]/.test(password)
	) {
		score += 1;
	}
	const label =
		score >= 4
			? `Strong — ${password.length} characters.`
			: score === 3
				? `Good — ${password.length} characters.`
				: "Okay — longer is stronger.";
	return { score, label };
}

export function StrengthMeter({ password }: { password: string }) {
	const { score, label } = passwordStrength(password);
	if (!label) return null;
	return (
		<div aria-live="polite">
			<div className="flex gap-1" aria-hidden>
				{Array.from({ length: 4 }, (_, i) => (
					<span
						key={i}
						className={cn(
							"h-0.5 flex-1 rounded-full",
							i < score
								? score <= 1
									? "bg-destructive"
									: "bg-primary"
								: "bg-border",
						)}
					/>
				))}
			</div>
			<p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

export function PasswordInput({
	id,
	value,
	onChange,
	onBlur,
	autoComplete,
	autoFocus,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedby,
}: {
	id: string;
	value: string;
	onChange: (next: string) => void;
	onBlur?: () => void;
	autoComplete: "current-password" | "new-password";
	autoFocus?: boolean;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}) {
	const [visible, setVisible] = useState(false);
	return (
		<div className="relative">
			<Input
				id={id}
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				aria-invalid={ariaInvalid || undefined}
				aria-describedby={ariaDescribedby}
				className="h-11 pr-11 text-base"
				autoFocus={autoFocus}
			/>
			<button
				type="button"
				className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
				onClick={() => setVisible((v) => !v)}
				aria-label={visible ? "Hide password" : "Show password"}
			>
				{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
			</button>
		</div>
	);
}

export default function EmailLogin({
	onSuccess,
	onSwitchMethod,
}: EmailLoginProps) {
	const [step, setStep] = useState<Step>("credentials");
	const [phone, setPhone] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [resendIn, setResendIn] = useState(0);

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const credentialsForm = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onChange: credentialsSchema },
		onSubmit: async ({ value }) => {
			setIsBusy(true);
			setError(null);
			try {
				const result = await api.auth.continueWithEmail(
					value.email.trim(),
					value.password,
				);
				if (result.status === "signed_in") {
					authStore.signedIn(result.customer);
					onSuccess(result.customer);
				} else {
					// New device: the backend has already texted an OTP to the phone on
					// file. Prove it once and this browser is remembered.
					setPhone(result.phone);
					setCode("");
					setResendIn(RESEND_COOLDOWN_SECONDS);
					setStep("otp");
				}
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Could not sign you in. Try again.",
				);
			} finally {
				setIsBusy(false);
			}
		},
	});

	const verifyStepUp = async (otp: string) => {
		if (!phone || isBusy) return;
		setIsBusy(true);
		setError(null);
		try {
			const { customer } = await api.auth.verifyEmailStepUp(phone, otp, {
				trustDevice: true,
				deviceName: deviceName(),
			});
			authStore.signedIn(customer);
			toast.success("This device is now trusted — no code needed next time.");
			onSuccess(customer);
		} catch (err) {
			setCode("");
			setError(
				err instanceof ApiError
					? err.message
					: "That code didn't work. Try again.",
			);
		} finally {
			setIsBusy(false);
		}
	};

	const handleCodeChange = (next: string) => {
		setCode(next);
		setError(null);
		if (next.length === OTP_LENGTH) void verifyStepUp(next);
	};

	const resend = async () => {
		// Re-submitting the credentials re-issues the step-up OTP.
		const { email, password } = credentialsForm.state.values;
		setIsBusy(true);
		setError(null);
		try {
			await api.auth.continueWithEmail(email.trim(), password);
			setResendIn(RESEND_COOLDOWN_SECONDS);
		} catch {
			setError("Could not resend the code. Try again shortly.");
		} finally {
			setIsBusy(false);
		}
	};

	if (step === "credentials") {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void credentialsForm.handleSubmit();
				}}
				className="grid gap-6"
			>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Sign in with your email
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						New to Soroman?{" "}
						<Link
							to="/register"
							className="underline underline-offset-4 hover:text-foreground"
						>
							Create an account
						</Link>{" "}
						with your phone first.
					</p>
				</div>
				<credentialsForm.Field name="email">
					{(field) => (
						<div className="grid gap-1.5">
							<div className="flex items-baseline justify-between">
								<Label htmlFor="email">Email</Label>
								{onSwitchMethod && (
									<button
										type="button"
										className="text-xs text-accent hover:underline"
										onClick={onSwitchMethod}
									>
										Use phone instead
									</button>
								)}
							</div>
							<Input
								id="email"
								type="email"
								inputMode="email"
								autoComplete="email"
								placeholder="name@company.com"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="email-error"
								className="h-11 text-base"
								autoFocus
							/>
							<FieldError meta={field.state.meta} id="email-error" />
						</div>
					)}
				</credentialsForm.Field>
				<credentialsForm.Field name="password">
					{(field) => (
						<div className="grid gap-1.5">
							<div className="flex items-baseline justify-between">
								<Label htmlFor="password">Password</Label>
								<Link
									to="/forgot-password"
									className="text-xs text-accent hover:underline"
								>
									Forgot?
								</Link>
							</div>
							<PasswordInput
								id="password"
								value={field.state.value}
								onChange={(next) => {
									field.handleChange(next);
									setError(null);
								}}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta)}
								aria-describedby="password-error"
								autoComplete="current-password"
							/>
							<FieldError meta={field.state.meta} id="password-error" />
						</div>
					)}
				</credentialsForm.Field>
				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" size="lg" disabled={isBusy}>
					{isBusy && <Loader2 className="animate-spin" />}
					Sign in
				</Button>
				<p className="text-xs text-muted-foreground">
					Prefer no password? Use your phone — we text a one-time code.
				</p>
			</form>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void verifyStepUp(code);
			}}
			className="grid gap-6"
		>
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Confirm it's you
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					New device — enter the code we texted to{" "}
					<span className="font-medium text-foreground">
						{phone ? formatPhoneForDisplay(phone) : "your phone"}
					</span>{" "}
					·{" "}
					<button
						type="button"
						className="underline underline-offset-4 hover:text-foreground"
						onClick={() => {
							setStep("credentials");
							setError(null);
						}}
					>
						Back
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
				Verify and trust this device
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
