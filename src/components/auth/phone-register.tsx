import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { phoneSchema, pinSchema, requiredTrimmed } from "@/lib/validation";

const detailsSchema = z.object({
	name: requiredTrimmed("Your name is required."),
	companyName: z.string(),
	phone: phoneSchema,
});

const pinSetSchema = z
	.object({ pin: pinSchema, confirm: z.string() })
	.refine((d) => d.pin === d.confirm, {
		message: "The PINs don't match.",
		path: ["confirm"],
	});

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

type Step = "details" | "code" | "pin";

type PhoneRegisterProps = {
	onSuccess: (customer: Customer) => void;
};

/**
 * Phone-first registration, mirroring the backend contract: name and phone
 * up front → POST /register sends the code → the first successful
 * verification activates the account and signs in. The response to register
 * is deliberately generic (it never confirms whether a number exists), so
 * the UI always advances to the code step.
 */
export default function PhoneRegister({ onSuccess }: PhoneRegisterProps) {
	const [step, setStep] = useState<Step>("details");
	const [phone, setPhone] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [resendIn, setResendIn] = useState(0);
	const [devCode, setDevCode] = useState<string | null>(null);
	const [customer, setCustomer] = useState<Customer | null>(null);

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const detailsForm = useForm({
		defaultValues: { name: "", companyName: "", phone: "" },
		validators: { onChange: detailsSchema },
		onSubmit: async ({ value }) => {
			const e164 = normalizePhone(value.phone)!;
			setIsBusy(true);
			setError(null);
			try {
				const { devCode: dc } = await api.auth.register({
					phone: e164,
					name: value.name.trim(),
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
		if (!phone || isBusy) return;
		setIsBusy(true);
		setError(null);
		try {
			// Trust this device on the way in, so the PIN they set next can stand in
			// for the OTP from here on.
			const session = await api.auth.verifyOtp(phone, otp, {
				trustDevice: true,
				deviceName: deviceName(),
			});
			authStore.signedIn(session.customer);
			setCustomer(session.customer);
			setCode("");
			setStep("pin");
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
		if (next.length === OTP_LENGTH) void verifyCode(next);
	};

	const finish = (message?: string) => {
		if (!customer) return;
		toast.success(message ?? `Welcome to Soroman, ${customer.name}!`);
		onSuccess(customer);
	};

	const pinForm = useForm({
		defaultValues: { pin: "", confirm: "" },
		validators: { onChange: pinSetSchema },
		onSubmit: async ({ value }) => {
			setIsBusy(true);
			setError(null);
			try {
				await api.me.setPin(value.pin);
				finish("You're all set — sign in with your PIN next time.");
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Couldn't set your PIN. Try again.",
				);
			} finally {
				setIsBusy(false);
			}
		},
	});

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
			});
			setResendIn(RESEND_COOLDOWN_SECONDS);
		} catch {
			setError("Could not resend the code. Try again shortly.");
		} finally {
			setIsBusy(false);
		}
	};

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
						One code to your phone and you're in — no password needed.
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

	if (step === "pin") {
		const pinField = (
			name: "pin" | "confirm",
			id: string,
			label: string,
			autoFocus?: boolean,
		) => (
			<pinForm.Field name={name}>
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor={id}>{label}</Label>
						<Input
							id={id}
							type="password"
							inputMode="numeric"
							autoComplete="off"
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
							aria-describedby={`${id}-error`}
							className="h-11 text-base tracking-[0.4em]"
							autoFocus={autoFocus}
						/>
						<FieldError meta={field.state.meta} id={`${id}-error`} />
					</div>
				)}
			</pinForm.Field>
		);

		return (
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void pinForm.handleSubmit();
				}}
				className="grid gap-6"
			>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Set a PIN</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						You're in
						{customer?.name ? `, ${customer.name.split(/\s+/)[0]}` : ""}. This
						device is trusted now — pick a 6-digit PIN and you can sign in with
						it next time, no code.
					</p>
				</div>
				{pinField("pin", "reg-pin", "New PIN", true)}
				{pinField("confirm", "reg-confirm-pin", "Confirm PIN")}
				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" size="lg" disabled={isBusy}>
					{isBusy && <Loader2 className="animate-spin" />}
					Set PIN &amp; continue
				</Button>
				<button
					type="button"
					className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
					disabled={isBusy}
					onClick={() => finish()}
				>
					Skip for now — I'll set it later in Account
				</button>
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
