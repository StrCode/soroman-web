import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api, formatPhoneForDisplay } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pinSchema } from "@/lib/validation";

const pinSetSchema = z
	.object({ pin: pinSchema, confirm: z.string() })
	.refine((d) => d.pin === d.confirm, {
		message: "The PINs don't match.",
		path: ["confirm"],
	});

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

	// The session payload never says whether a PIN is configured — /identities
	// is the truth, so that state reads from here, not the in-memory customer.
	const { data: identities, isPending: identitiesPending } = useQuery({
		queryKey: ["identities"],
		queryFn: api.me.identities,
		staleTime: 30_000,
	});

	if (!customer) return null;

	const hasPin = identities?.hasPin ?? false;
	const refreshIdentities = () =>
		void queryClient.invalidateQueries({ queryKey: ["identities"] });

	return (
		<section className={PANEL} aria-label="Sign-in and security">
			<div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Methods</span>
				<span className="text-xs text-muted-foreground">
					Phone or email · PIN
				</span>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-foreground/15 px-6 py-5">
				<div>
					<p className="flex items-center gap-2 text-sm font-medium">
						Phone {customer.phone && <VerifiedChip />}
					</p>
					<p className="mt-1 text-sm text-muted-foreground tabular-nums">
						{customer.phone
							? `${formatPhoneForDisplay(customer.phone)} · with your PIN, or a one-time code by SMS`
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
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-foreground/15 px-6 py-5">
						<div>
							<p className="flex items-center gap-2 text-sm font-medium">
								Email {customer.email && <VerifiedChip />}
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{customer.email
									? `${customer.email} · with your PIN`
									: "Not set. Add one to sign in with it instead of your phone"}
							</p>
						</div>
						<span className="text-xs text-muted-foreground">
							{customer.email ? "Change in Profile" : "Add in Profile"}
						</span>
					</div>

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
