import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordInput, StrengthMeter } from "@/components/auth/email-login";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api, type Customer, formatPhoneForDisplay } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth";
import { emailSchema, passwordSchema, pinSchema } from "@/lib/validation";

const pinSetSchema = z
	.object({ pin: pinSchema, confirm: z.string() })
	.refine((d) => d.pin === d.confirm, {
		message: "The PINs don't match.",
		path: ["confirm"],
	});

const emailSignInSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

const changePasswordSchema = z.object({ password: passwordSchema });

function VerifiedChip() {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-accent/40 px-2 py-px text-[0.65rem] tracking-[0.14em] whitespace-nowrap text-accent uppercase">
			<Check className="size-2.5" aria-hidden />
			Verified
		</span>
	);
}

/**
 * One row per sign-in method (the Square pattern): status chip on the left,
 * a quiet action link on the right, and any editing happens inline below the
 * row — no dialogs.
 */
export function SecurityPanel() {
	const auth = useAuth();
	const customer = auth.status === "authed" ? auth.customer : null;
	const queryClient = useQueryClient();
	const [addingEmail, setAddingEmail] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);

	// The session payload never says which methods are configured — /identities
	// is the truth, so the email/password/PIN state reads from here, not from
	// the in-memory customer.
	const { data: identities, isPending: identitiesPending } = useQuery({
		queryKey: ["identities"],
		queryFn: api.me.identities,
		staleTime: 30_000,
	});

	if (!customer) return null;

	const hasPassword = identities?.hasPassword ?? false;
	const hasPin = identities?.hasPin ?? false;
	const refreshIdentities = () =>
		void queryClient.invalidateQueries({ queryKey: ["identities"] });

	return (
		<section className={PANEL} aria-label="Sign-in and security">
			<div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Methods</span>
				<span className="text-xs text-muted-foreground">
					Phone · email · PIN
				</span>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-foreground/15 px-6 py-5">
				<div>
					<p className="flex items-center gap-2 text-sm font-medium">
						Phone {customer.phone && <VerifiedChip />}
					</p>
					<p className="mt-1 text-sm text-muted-foreground tabular-nums">
						{customer.phone
							? `${formatPhoneForDisplay(customer.phone)} · one-time code by SMS`
							: "Not set. The desk can add one for you"}
					</p>
				</div>
				<span className="text-xs text-muted-foreground">
					{customer.phone
						? "Contact desk to change"
						: "Contact desk on WhatsApp"}
				</span>
			</div>

			{identitiesPending ? (
				<SecurityIdentitiesSkeleton />
			) : (
				<>
					<div className="border-b border-foreground/15">
						<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5">
							<div>
								<p className="flex items-center gap-2 text-sm font-medium">
									Email sign-in {hasPassword && <VerifiedChip />}
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{hasPassword
										? customer.email
											? `${customer.email} · password`
											: "Email & password set"
										: customer.email
											? `${customer.email} is on your profile — add a password to sign in with it`
											: "Not set. Add an email and password"}
								</p>
							</div>
							{!hasPassword && (
								<button
									type="button"
									className="text-sm font-medium text-accent hover:underline"
									onClick={() => setAddingEmail((v) => !v)}
								>
									{addingEmail ? "Cancel" : customer.email ? "Enable" : "Add"}
								</button>
							)}
						</div>
						{addingEmail && !hasPassword && (
							<AddEmailSignIn
								customer={customer}
								onDone={() => {
									setAddingEmail(false);
									refreshIdentities();
								}}
							/>
						)}
					</div>

					{hasPassword && (
						<div className="border-b border-foreground/15">
							<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5">
								<div>
									<p className="text-sm font-medium">Password</p>
									<p className="mt-1 text-sm text-muted-foreground">
										Used with your email to sign in
									</p>
								</div>
								<button
									type="button"
									className="text-sm font-medium text-accent hover:underline"
									onClick={() => setChangingPassword((v) => !v)}
								>
									{changingPassword ? "Cancel" : "Update"}
								</button>
							</div>
							{changingPassword && (
								<ChangePassword onDone={() => setChangingPassword(false)} />
							)}
						</div>
					)}

					<SetPinRow hasPin={hasPin} onChanged={refreshIdentities} />
				</>
			)}
		</section>
	);
}

/** Placeholder rows until /identities resolves — avoids flashing Set vs Update. */
function SecurityIdentitiesSkeleton() {
	return (
		<div aria-busy="true" aria-label="Loading sign-in methods">
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-foreground/15 px-6 py-5"
				>
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-3.5 w-56 max-w-full" />
					</div>
					<Skeleton className="h-4 w-14" />
				</div>
			))}
		</div>
	);
}

/**
 * Set (or replace) the 6-digit device PIN. The PIN only works from a device
 * you've chosen to remember at sign-in, so we say so — setting one here on an
 * untrusted browser is fine, it just becomes useful after the next "remember
 * this device" sign-in.
 */
function SetPinRow({
	hasPin,
	onChanged,
}: {
	hasPin: boolean;
	onChanged: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const form = useForm({
		defaultValues: { pin: "", confirm: "" },
		validators: { onChange: pinSetSchema },
		onSubmit: async ({ value }) => {
			setBusy(true);
			setError(null);
			try {
				await api.me.setPin(value.pin);
				toast.success(hasPin ? "PIN updated" : "PIN set");
				setOpen(false);
				form.reset();
				onChanged();
			} catch (err) {
				setError(
					err instanceof ApiError ? err.message : "Couldn't set it. Try again.",
				);
			} finally {
				setBusy(false);
			}
		},
	});

	const pinInput = (name: "pin" | "confirm", id: string, label: string) => (
		<form.Field name={name}>
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
							field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 6));
							setError(null);
						}}
						onBlur={field.handleBlur}
						aria-invalid={showFieldError(field.state.meta) || undefined}
						aria-describedby={`${id}-error`}
						className="tracking-[0.4em]"
					/>
					<FieldError meta={field.state.meta} id={`${id}-error`} />
				</div>
			)}
		</form.Field>
	);

	return (
		<div>
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5">
				<div>
					<p className="flex items-center gap-2 text-sm font-medium">
						PIN {hasPin && <VerifiedChip />}
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{hasPin
							? "Set · signs you in on a trusted device without an SMS"
							: "Not set. Add a 6-digit code for trusted devices"}
					</p>
				</div>
				<button
					type="button"
					className="text-sm font-medium text-accent hover:underline"
					onClick={() => {
						setOpen((v) => !v);
						form.reset();
						setError(null);
					}}
				>
					{open ? "Cancel" : hasPin ? "Update" : "Set"}
				</button>
			</div>
			{open && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void form.handleSubmit();
					}}
					className="grid gap-4 border-t border-foreground/15 bg-muted/30 px-6 py-5 sm:grid-cols-2"
				>
					{pinInput("pin", "new-pin", hasPin ? "New PIN" : "PIN")}
					{pinInput("confirm", "confirm-pin", "Confirm PIN")}
					{error && (
						<p className="text-xs text-destructive sm:col-span-2">{error}</p>
					)}
					<div className="sm:col-span-2">
						<Button type="submit" size="sm" disabled={busy}>
							{busy && <Loader2 className="animate-spin" />}
							{hasPin ? "Update PIN" : "Save PIN"}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground sm:col-span-2">
						{hasPin
							? "This replaces your current PIN on every trusted device."
							: "Choose “remember this device” next time you sign in with a code to start using it."}
					</p>
				</form>
			)}
		</div>
	);
}

/**
 * Add email + password sign-in to the account. Being signed in IS the proof
 * of ownership, so the backend takes the email and password directly — there
 * is no emailed code to confirm the address.
 */
function AddEmailSignIn({
	customer,
	onDone,
}: {
	customer: Customer;
	onDone: () => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const form = useForm({
		defaultValues: { email: customer.email ?? "", password: "" },
		validators: { onChange: emailSignInSchema },
		onSubmit: async ({ value }) => {
			setBusy(true);
			setError(null);
			try {
				const updated = await api.me.addEmailSignIn(
					value.email.trim(),
					value.password,
				);
				authStore.customerUpdated(updated);
				toast.success("Email sign-in added");
				onDone();
			} catch (err) {
				setError(
					err instanceof ApiError ? err.message : "Couldn't add it. Try again.",
				);
			} finally {
				setBusy(false);
			}
		},
	});

	const hasProfileEmail = Boolean(customer.email);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="grid gap-4 border-t border-foreground/15 bg-muted/30 px-6 py-5 sm:grid-cols-2"
		>
			<form.Field name="email">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="signin-email">Email</Label>
						<Input
							id="signin-email"
							type="email"
							autoComplete="email"
							placeholder="name@company.com"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={showFieldError(field.state.meta) || undefined}
							aria-describedby="signin-email-error"
							autoFocus={!hasProfileEmail}
						/>
						<FieldError meta={field.state.meta} id="signin-email-error" />
					</div>
				)}
			</form.Field>
			<form.Field name="password">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="signin-password">Password</Label>
						<PasswordInput
							id="signin-password"
							value={field.state.value}
							onChange={(next) => {
								field.handleChange(next);
								setError(null);
							}}
							onBlur={field.handleBlur}
							aria-invalid={showFieldError(field.state.meta)}
							aria-describedby="signin-password-error"
							autoComplete="new-password"
							autoFocus={hasProfileEmail}
						/>
						<FieldError meta={field.state.meta} id="signin-password-error" />
						<StrengthMeter password={field.state.value} />
					</div>
				)}
			</form.Field>
			{error && (
				<p className="text-xs text-destructive sm:col-span-2">{error}</p>
			)}
			<div className="sm:col-span-2">
				<Button type="submit" size="sm" disabled={busy}>
					{busy && <Loader2 className="animate-spin" />}
					{hasProfileEmail ? "Enable email sign-in" : "Add email sign-in"}
				</Button>
			</div>
			<p className="text-xs text-muted-foreground sm:col-span-2">
				You'll use this email and password to sign in. On a new device we'll
				text a one-time code to your phone to confirm it's you.
			</p>
		</form>
	);
}

function ChangePassword({ onDone }: { onDone: () => void }) {
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const form = useForm({
		defaultValues: { password: "" },
		validators: { onChange: changePasswordSchema },
		onSubmit: async ({ value }) => {
			setBusy(true);
			setError(null);
			try {
				const updated = await api.me.setPassword(value.password);
				authStore.customerUpdated(updated);
				toast.success("Password updated");
				onDone();
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Couldn't update it. Try again.",
				);
			} finally {
				setBusy(false);
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="grid gap-4 border-t border-foreground/15 bg-muted/30 px-6 py-5 sm:max-w-md"
		>
			<form.Field name="password">
				{(field) => (
					<div className="grid gap-1.5">
						<Label htmlFor="new-password">New password</Label>
						<PasswordInput
							id="new-password"
							value={field.state.value}
							onChange={(next) => {
								field.handleChange(next);
								setError(null);
							}}
							onBlur={field.handleBlur}
							aria-invalid={showFieldError(field.state.meta)}
							aria-describedby="new-password-error"
							autoComplete="new-password"
							autoFocus
						/>
						<FieldError meta={field.state.meta} id="new-password-error" />
						<StrengthMeter password={field.state.value} />
					</div>
				)}
			</form.Field>
			{error && <p className="text-xs text-destructive">{error}</p>}
			<div>
				<Button type="submit" size="sm" disabled={busy}>
					{busy && <Loader2 className="animate-spin" />}
					Update password
				</Button>
			</div>
		</form>
	);
}
