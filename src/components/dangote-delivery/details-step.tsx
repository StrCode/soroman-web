import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";
import { FieldError, showFieldError } from "@/components/field-error";
import { BoxedInput, BoxedSelect } from "@/components/order/boxed";
import { Label } from "@/components/ui/label";
import { NativeSelectOption } from "@/components/ui/native-select";
import { NIGERIAN_STATES } from "@/lib/dangote-delivery/states";
import {
	DANGOTE_DELIVERY_PRODUCTS,
	PRODUCT_META,
} from "@/lib/dangote-delivery/types";
import { cn } from "@/lib/utils";
import {
	emailSchema,
	optionalEmailSchema,
	phoneSchema,
	requiredTrimmed,
} from "@/lib/validation";

/**
 * Order logistics only — contact lives on the account step so guests can
 * verify before Company & license.
 */
export const orderDetailsSchema = z.object({
	product: z.enum(DANGOTE_DELIVERY_PRODUCTS),
	quantity: z
		.string()
		.min(1, "Enter how much you need.")
		.refine((v) => Number(v) > 0, "Quantity must be greater than zero."),
	deliveryAddress: z.string().trim().min(1, "Enter the delivery address."),
	deliveryState: z.string().min(1, "Choose the delivery state."),
	companyName: z.string(),
	contactPerson: z.string(),
	contactPhone: z.string(),
	/** Filled on the account step; empty is fine while still on order details. */
	email: optionalEmailSchema,
});

/** Account step — name, phone, and email required (email is profile, not login). */
export const accountFieldsSchema = z.object({
	contactPerson: requiredTrimmed("Who should the delivery team contact?"),
	contactPhone: phoneSchema,
	email: emailSchema,
});

export const detailsSchema = orderDetailsSchema;

export type DetailsForm = z.infer<typeof orderDetailsSchema>;

export const EMPTY_DETAILS: DetailsForm = {
	product: "PMS",
	quantity: "",
	deliveryAddress: "",
	deliveryState: "",
	companyName: "",
	contactPerson: "",
	contactPhone: "",
	email: "",
};

/**
 * The step's form lives in the route (it must survive step navigation and be
 * refilled when a draft is rehydrated), so the route calls this hook and hands
 * the instance down. Submitting with invalid values never reaches `onSubmit`
 * — TanStack runs the schema first and surfaces every field's message.
 *
 * Hydrated defaults arrive through `defaultValues` rather than form.reset():
 * reset() rewrites the form's internal defaults, and the next render's option
 * sync would snap the values back to the hook's stale literal. Changing the
 * option itself lets TanStack apply the new defaults to a still-untouched form.
 */
export function useDetailsForm(
	defaultValues: DetailsForm,
	onSubmit: (value: DetailsForm) => Promise<void>,
) {
	return useForm({
		defaultValues,
		validators: { onChange: orderDetailsSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});
}

export type DetailsFormApi = ReturnType<typeof useDetailsForm>;

type DetailsStepProps = {
	form: DetailsFormApi;
};

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

/**
 * Step 1 — product, how much, and where. Contact / account lives on the next
 * step so licenses can load under a signed-in session. No price here: the
 * Dangote team returns a firm price after review.
 */
export default function DetailsStep({ form }: DetailsStepProps) {
	const product = useStore(form.store, (s) => s.values.product);
	const meta = PRODUCT_META[product];

	return (
		<section>
			<div className="grid gap-5">
				<form.Field name="product">
					{(field) => (
						<div className="grid gap-1.5">
							<Label className={FIELD_LABEL}>Product</Label>
							<div
								className="grid grid-cols-3 gap-2"
								role="radiogroup"
								aria-label="Product"
							>
								{DANGOTE_DELIVERY_PRODUCTS.map((code) => {
									const option = PRODUCT_META[code];
									const selected = field.state.value === code;
									return (
										<button
											key={code}
											type="button"
											role="radio"
											aria-checked={selected}
											onClick={() => field.handleChange(code)}
											className={cn(
												"ease-luxe cursor-pointer rounded-lg border px-3 py-3.5 text-center transition-colors duration-250 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50",
												selected
													? "border-primary bg-primary/10 text-foreground"
													: "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
											)}
										>
											<span
												className={cn(
													"block text-sm font-medium",
													selected && "text-primary",
												)}
											>
												{option.label}
											</span>
											<span className="mt-0.5 block text-[0.65rem] tracking-[0.12em] uppercase opacity-70">
												{option.code}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>

				<form.Field name="quantity">
					{(field) => {
						const quantity = Number(field.state.value) || 0;
						return (
							<div className="grid gap-1.5">
								<Label htmlFor="co-quantity" className={FIELD_LABEL}>
									Quantity in {meta.unit.toLowerCase()}
								</Label>
								<div className="flex gap-2">
									<BoxedInput
										id="co-quantity"
										type="text"
										inputMode="decimal"
										placeholder={meta.unit === "Kg" ? "10,000" : "33,000"}
										value={field.state.value}
										onChange={(e) => {
											const raw = e.target.value.replace(/[^\d.]/g, "");
											field.handleChange(raw);
										}}
										onBlur={field.handleBlur}
										aria-invalid={showFieldError(field.state.meta) || undefined}
										aria-describedby="co-quantity-error"
										className="flex-1 tabular-nums"
										autoFocus
									/>
									<span className="inline-flex h-11 items-center rounded-lg border border-input px-4 text-xs font-medium text-muted-foreground">
										{meta.unit}
									</span>
								</div>
								<FieldError meta={field.state.meta} id="co-quantity-error" />
								{quantity > 0 && (
									<p className="text-xs text-muted-foreground tabular-nums">
										Requesting{" "}
										<span className="font-medium text-foreground">
											{quantity.toLocaleString()} {meta.unitShort}
										</span>{" "}
										of {meta.label.toLowerCase()} · priced after review
									</p>
								)}
							</div>
						);
					}}
				</form.Field>

				<form.Field name="deliveryState">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="co-state" className={FIELD_LABEL}>
								Delivery state
							</Label>
							<BoxedSelect
								id="co-state"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="co-state-error"
								className={cn(
									field.state.value === "" &&
										"[&>select]:text-muted-foreground/50",
								)}
							>
								<NativeSelectOption value="" disabled>
									Choose a state
								</NativeSelectOption>
								{NIGERIAN_STATES.map((s) => (
									<NativeSelectOption key={s} value={s}>
										{s}
									</NativeSelectOption>
								))}
							</BoxedSelect>
							<FieldError meta={field.state.meta} id="co-state-error" />
						</div>
					)}
				</form.Field>

				<form.Field name="deliveryAddress">
					{(field) => (
						<div className="grid gap-1.5">
							<Label htmlFor="co-address" className={FIELD_LABEL}>
								Delivery address
							</Label>
							<BoxedInput
								id="co-address"
								placeholder="Plot 4, Trans-Amadi Industrial Layout, Port Harcourt"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={showFieldError(field.state.meta) || undefined}
								aria-describedby="co-address-error"
							/>
							<FieldError meta={field.state.meta} id="co-address-error" />
						</div>
					)}
				</form.Field>
			</div>
		</section>
	);
}
