import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Customer } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { optionalEmailSchema, requiredTrimmed } from "@/lib/validation";

const profileSchema = z.object({
	name: requiredTrimmed("Your name is required — it goes on invoices."),
	company: z.string(),
	email: optionalEmailSchema,
});

/**
 * Profile data is set once and rarely touched, so it reads as a record
 * (label/value facts) rather than a wall of inputs; the form only appears
 * behind an explicit Edit, the same quiet-action language as Security.
 */
export function ProfilePanel() {
	const auth = useAuth();
	const customer = auth.status === "authed" ? auth.customer : null;
	const [editing, setEditing] = useState(false);

	if (!customer) return null;

	return (
		<section className={PANEL} aria-label="Profile">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Profile</span>
				<button
					type="button"
					className="text-sm font-medium text-accent hover:underline"
					onClick={() => setEditing((v) => !v)}
				>
					{editing ? "Cancel" : "Edit"}
				</button>
			</div>

			{editing ? (
				<ProfileForm customer={customer} onDone={() => setEditing(false)} />
			) : (
				<dl className="grid gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-2">
					<ProfileFact label="Your name" value={customer.name} />
					<ProfileFact label="Company" value={customer.company_name} />
					<ProfileFact label="Email" value={customer.email} />
				</dl>
			)}

			<div className="bg-muted/60 px-6 py-3">
				<p className="text-xs text-muted-foreground">
					Shown on invoices and waybills. Receipts are copied to your email when
					set.
				</p>
			</div>
		</section>
	);
}

function ProfileFact({
	label,
	value,
}: {
	label: string;
	value?: string | null;
}) {
	return (
		<div>
			<dt className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
				{label}
			</dt>
			<dd
				className={cn(
					"mt-1.5 text-sm",
					value ? "font-medium" : "text-muted-foreground",
				)}
			>
				{value || "Not set"}
			</dd>
		</div>
	);
}

function ProfileForm({
	customer,
	onDone,
}: {
	customer: Customer;
	onDone: () => void;
}) {
	const [saving, setSaving] = useState(false);

	const form = useForm({
		defaultValues: {
			name: customer.name,
			company: customer.company_name ?? "",
			email: customer.email ?? "",
		},
		validators: { onChange: profileSchema },
		onSubmit: async ({ value }) => {
			const dirty =
				value.name !== customer.name ||
				value.company !== (customer.company_name ?? "") ||
				value.email !== (customer.email ?? "");
			if (!dirty) {
				onDone();
				return;
			}
			setSaving(true);
			try {
				const updated = await api.me.update({
					name: value.name.trim(),
					company_name: value.company.trim() || null,
					email: value.email.trim() || null,
				});
				authStore.customerUpdated(updated);
				toast.success("Profile saved");
				onDone();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Couldn't save. Try again.",
				);
			} finally {
				setSaving(false);
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="grid gap-5 px-6 py-6 sm:grid-cols-2"
		>
			<form.Field name="name">
				{(field) => (
					<div className="grid gap-2">
						<Label htmlFor="account-name">Your name</Label>
						<Input
							id="account-name"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={showFieldError(field.state.meta) || undefined}
							aria-describedby="account-name-error"
							placeholder="Danlami Adamu"
							autoComplete="name"
							autoFocus
						/>
						<FieldError meta={field.state.meta} id="account-name-error" />
					</div>
				)}
			</form.Field>
			<form.Field name="company">
				{(field) => (
					<div className="grid gap-2">
						<Label htmlFor="account-company">Company</Label>
						<Input
							id="account-company"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							placeholder="Danlami Oil Ltd"
							autoComplete="organization"
						/>
					</div>
				)}
			</form.Field>
			<form.Field name="email">
				{(field) => (
					<div className="grid gap-2 sm:col-span-2">
						<Label htmlFor="account-email">Email</Label>
						<Input
							id="account-email"
							type="email"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={showFieldError(field.state.meta) || undefined}
							aria-describedby="account-email-error"
							placeholder="ops@danlamioil.ng"
							autoComplete="email"
						/>
						<FieldError meta={field.state.meta} id="account-email-error" />
					</div>
				)}
			</form.Field>
			<div className="sm:col-span-2">
				<Button type="submit" disabled={saving}>
					{saving ? "Saving…" : "Save changes"}
				</Button>
			</div>
		</form>
	);
}
