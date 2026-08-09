import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	ClipboardCheck,
	Flame,
	MapPin,
	Minus,
	Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import OtpLogin from "@/components/auth/otp-login";
import { BoxedInput, BoxedSelect } from "@/components/order/boxed";
import {
	WizardActions,
	WizardBack,
	type WizardCta,
	WizardHeading,
	type WizardStep,
	WizardStepper,
} from "@/components/order-wizard/chrome";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth";
import {
	createLpgOrder,
	getLpgCatalog,
	type LpgOrderRequest,
	type LpgStation,
} from "@/lib/cooking-gas/api";
import { NIGERIAN_STATES } from "@/lib/dangote-delivery/states";
import { formatNaira } from "@/lib/use-catalog";

type Step = "cylinder" | "delivery" | "review";

const STEPS: readonly WizardStep<Step>[] = [
	{ key: "cylinder", label: "Cylinder", icon: Flame },
	{ key: "delivery", label: "Delivery", icon: MapPin },
	{ key: "review", label: "Review & submit", icon: ClipboardCheck },
];

const STEP_COPY: Record<Step, { title: string; description: string }> = {
	cylinder: {
		title: "Choose your cylinder",
		description: "Pick a station, a size, and how many.",
	},
	delivery: {
		title: "Delivery",
		description: "Where should we bring the cylinders?",
	},
	review: {
		title: "Review & order",
		description: "Confirm your order — delivery is priced after review.",
	},
};

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

export const Route = createFileRoute("/_slim/order_/cooking-gas")({
	component: CookingGasWizard,
});

/**
 * The Cooking Gas wizard — wired to the real LPG portal API. It's a QUOTE
 * REQUEST, not an instant-pay cart: a station quotes a price per Kg, the
 * customer picks one cylinder size and quantity, and staff price delivery and
 * approve it (Pending Review → …). One size per request, matching the backend.
 * Submission is the commitment point, so the guest phone-verify gate sits
 * there — verifying signs the customer in, then the parked request submits.
 */
function CookingGasWizard() {
	const auth = useAuth();
	const catalogQuery = useQuery({
		queryKey: ["lpg-catalog"],
		queryFn: getLpgCatalog,
	});
	const stations = catalogQuery.data ?? [];

	const [step, setStep] = useState<Step>("cylinder");
	const [stationId, setStationId] = useState<number | null>(null);
	const [sizeKg, setSizeKg] = useState<number | null>(null);
	const [quantity, setQuantity] = useState(1);
	const [deliveryState, setDeliveryState] = useState("");
	const [deliveryAddress, setDeliveryAddress] = useState("");
	const [contactName, setContactName] = useState("");
	const [gateOpen, setGateOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState<LpgOrderRequest | null>(null);

	const station = useMemo(
		() => stations.find((s) => s.id === stationId) ?? null,
		[stations, stationId],
	);
	const sizes = useMemo(
		() => (station?.cylinders ?? []).filter((c) => c.available > 0),
		[station],
	);

	// Default to the first open station; a size stays chosen until the station
	// changes out from under it.
	useEffect(() => {
		if (stationId === null && stations.length) setStationId(stations[0].id);
	}, [stations, stationId]);
	useEffect(() => {
		if (sizeKg !== null && !sizes.some((c) => c.sizeKg === sizeKg))
			setSizeKg(null);
	}, [sizes, sizeKg]);

	// Prefill the delivery contact from the signed-in customer, once.
	useEffect(() => {
		if (auth.status === "authed" && !contactName && auth.customer.name) {
			setContactName(auth.customer.name);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.status]);

	const gasSubtotal =
		station && sizeKg ? station.pricePerKg * sizeKg * quantity : 0;

	const submit = async () => {
		if (!station || !sizeKg) return;
		setBusy(true);
		setError(null);
		try {
			const created = await createLpgOrder({
				lpgStationId: station.id,
				cylinderSizeKg: sizeKg,
				cylinderQuantity: quantity,
				deliveryAddress,
				deliveryState,
			});
			setGateOpen(false);
			setSubmitted(created);
		} catch (err) {
			setGateOpen(false);
			setError(
				err instanceof ApiError ? err.message : "Could not submit. Try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	const requestSubmit = async () => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status !== "authed") {
			setGateOpen(true);
			return;
		}
		await submit();
	};

	const cta: WizardCta | null =
		step === "cylinder"
			? {
					label: "Continue",
					disabled: !station || !sizeKg,
					hint: "Pick a cylinder size to continue",
					onClick: () => setStep("delivery"),
				}
			: step === "delivery"
				? {
						label: "Continue",
						disabled:
							deliveryState === "" ||
							deliveryAddress.trim() === "" ||
							contactName.trim() === "",
						hint: "Add the delivery state, address, and a contact name",
						onClick: () => setStep("review"),
					}
				: {
						label: "Place order",
						busy,
						onClick: () => void requestSubmit(),
					};

	const stepIndex = STEPS.findIndex((s) => s.key === step);
	const onStepBack =
		stepIndex > 0 ? () => setStep(STEPS[stepIndex - 1].key) : undefined;

	if (submitted) {
		return (
			<div className="relative mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10">
				<WizardBack to="/order" label="Order something else" />
				<WizardHeading
					title="Cooking Gas"
					subtitle="Cylinder refills to your door."
				/>
				<Card className="mx-auto mt-6 w-full max-w-md">
					<CardContent className="pt-6">
						<SubmittedPanel request={submitted} />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (gateOpen && auth.status !== "authed") {
		return (
			<div className="relative mx-auto flex w-full max-w-4xl flex-col px-4 py-6 sm:px-6 md:py-10">
				<WizardBack onClick={() => setGateOpen(false)} label="Back to review" />
				<WizardHeading
					title="Cooking Gas"
					subtitle="Cylinder refills to your door."
				/>
				<div className="mt-6">
					<WizardStepper steps={STEPS} current={step} />
				</div>
				<Card className="mx-auto mt-6 w-full max-w-md">
					<CardContent className="pt-6">
						<OtpLogin
							title="Verify your phone to submit"
							description="Your order is saved to an account so you can track it and pay — we'll text you a code. No password."
							registerName={contactName}
							onSuccess={() => void submit()}
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	const copy = STEP_COPY[step];

	return (
		<div className="relative mx-auto flex w-full max-w-4xl flex-col px-4 py-6 sm:px-6 md:py-10">
			<WizardBack to="/order" label="Back to orders" disabled={busy} />
			<WizardHeading
				title="Cooking Gas"
				subtitle="Cylinder refills to your door — price per Kg is set by the station."
			/>

			<div className="mt-6">
				<WizardStepper
					steps={STEPS}
					current={step}
					onNavigate={(s) => setStep(s)}
				/>
			</div>

			<Card className="mt-6">
				<CardHeader className="border-b">
					<CardTitle className="text-lg font-semibold tracking-tight">
						{copy.title}
					</CardTitle>
					<CardDescription>{copy.description}</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					{catalogQuery.isLoading ? (
						<div className="grid gap-3">
							<Skeleton className="h-11 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					) : stations.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No stations are open right now — please check back soon.
						</p>
					) : step === "cylinder" ? (
						<CylinderStep
							stations={stations}
							station={station}
							onStation={(id) => {
								setStationId(id);
								setSizeKg(null);
							}}
							sizeKg={sizeKg}
							onSize={setSizeKg}
							quantity={quantity}
							onQuantity={setQuantity}
							gasSubtotal={gasSubtotal}
						/>
					) : step === "delivery" ? (
						<DeliveryStep
							deliveryState={deliveryState}
							onState={setDeliveryState}
							deliveryAddress={deliveryAddress}
							onAddress={setDeliveryAddress}
							contactName={contactName}
							onContact={setContactName}
						/>
					) : (
						<ReviewStep
							station={station}
							sizeKg={sizeKg}
							quantity={quantity}
							gasSubtotal={gasSubtotal}
							deliveryState={deliveryState}
							deliveryAddress={deliveryAddress}
							contactName={contactName}
						/>
					)}
					{error && <p className="mt-4 text-xs text-destructive">{error}</p>}
				</CardContent>
				{stations.length > 0 && (
					<CardFooter className="flex-col items-stretch gap-3 border-t bg-card">
						{step === "cylinder" && gasSubtotal > 0 && (
							<div className="flex items-baseline justify-between">
								<span className="text-[0.6rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
									Gas subtotal
								</span>
								<span className="text-xl font-semibold tracking-tight tabular-nums">
									{formatNaira(gasSubtotal)}
								</span>
							</div>
						)}
						<WizardActions cta={cta} onBack={onStepBack} />
					</CardFooter>
				)}
			</Card>
		</div>
	);
}

function CylinderStep({
	stations,
	station,
	onStation,
	sizeKg,
	onSize,
	quantity,
	onQuantity,
	gasSubtotal,
}: {
	stations: LpgStation[];
	station: LpgStation | null;
	onStation: (id: number) => void;
	sizeKg: number | null;
	onSize: (kg: number) => void;
	quantity: number;
	onQuantity: (n: number) => void;
	gasSubtotal: number;
}) {
	const sizes = (station?.cylinders ?? []).filter((c) => c.available > 0);
	return (
		<div className="grid gap-5">
			{stations.length > 1 && (
				<div className="grid gap-1.5">
					<label htmlFor="cg-station" className={FIELD_LABEL}>
						Station
					</label>
					<BoxedSelect
						id="cg-station"
						value={station?.id ?? ""}
						onChange={(e) => onStation(Number(e.target.value))}
					>
						{stations.map((s) => (
							<NativeSelectOption key={s.id} value={s.id}>
								{s.name} · {s.city}, {s.state} · {formatNaira(s.pricePerKg)}/kg
							</NativeSelectOption>
						))}
					</BoxedSelect>
				</div>
			)}

			<div className="grid gap-1.5">
				<span className={FIELD_LABEL}>Cylinder size</span>
				{sizes.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No cylinders in stock at this station.
					</p>
				) : (
					<div
						className="grid grid-cols-3 gap-2"
						role="radiogroup"
						aria-label="Cylinder size"
					>
						{sizes.map((c) => {
							const selected = sizeKg === c.sizeKg;
							const each = station ? station.pricePerKg * c.sizeKg : 0;
							return (
								<button
									key={c.sizeKg}
									type="button"
									role="radio"
									aria-checked={selected}
									onClick={() => onSize(c.sizeKg)}
									className={
										selected
											? "ease-luxe rounded-lg border border-primary bg-primary/10 p-3 text-center transition-colors duration-250"
											: "ease-luxe rounded-lg border border-input p-3 text-center transition-colors duration-250 hover:border-foreground/30"
									}
								>
									<span className="block text-sm font-semibold">
										{c.sizeKg}kg
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
										{formatNaira(each)}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{sizeKg !== null && (
				<div className="grid gap-1.5">
					<span className={FIELD_LABEL}>Quantity</span>
					<div className="flex items-center gap-4">
						<div className="inline-flex items-center overflow-hidden rounded-lg border border-input">
							<button
								type="button"
								aria-label="Fewer"
								className="grid size-10 place-items-center hover:bg-muted/40"
								onClick={() => onQuantity(Math.max(1, quantity - 1))}
							>
								<Minus className="size-4" />
							</button>
							<span className="w-12 text-center text-sm font-medium tabular-nums">
								{quantity}
							</span>
							<button
								type="button"
								aria-label="More"
								className="grid size-10 place-items-center hover:bg-muted/40"
								onClick={() => onQuantity(quantity + 1)}
							>
								<Plus className="size-4" />
							</button>
						</div>
						<span className="text-sm text-muted-foreground tabular-nums">
							{quantity} × {sizeKg}kg · {formatNaira(gasSubtotal)}
						</span>
					</div>
				</div>
			)}

			<p className="rounded-lg border border-foreground/10 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
				This is the gas price. Delivery is priced by the Soroman team after they
				review your order — you'll see the full price on your dashboard.
			</p>
		</div>
	);
}

function DeliveryStep({
	deliveryState,
	onState,
	deliveryAddress,
	onAddress,
	contactName,
	onContact,
}: {
	deliveryState: string;
	onState: (s: string) => void;
	deliveryAddress: string;
	onAddress: (s: string) => void;
	contactName: string;
	onContact: (s: string) => void;
}) {
	return (
		<div className="grid gap-5">
			<div className="grid gap-1.5">
				<label htmlFor="cg-state" className={FIELD_LABEL}>
					Delivery state
				</label>
				<BoxedSelect
					id="cg-state"
					value={deliveryState}
					onChange={(e) => onState(e.target.value)}
					className={
						deliveryState === ""
							? "[&>select]:text-muted-foreground/50"
							: undefined
					}
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
			</div>
			<div className="grid gap-1.5">
				<label htmlFor="cg-address" className={FIELD_LABEL}>
					Delivery address
				</label>
				<BoxedInput
					id="cg-address"
					value={deliveryAddress}
					onChange={(e) => onAddress(e.target.value)}
					placeholder="14 Ademola Street, Ikoyi, Lagos"
				/>
			</div>
			<div className="grid gap-1.5">
				<label htmlFor="cg-contact" className={FIELD_LABEL}>
					Contact name
				</label>
				<BoxedInput
					id="cg-contact"
					autoComplete="name"
					value={contactName}
					onChange={(e) => onContact(e.target.value)}
					placeholder="Who should the rider ask for?"
				/>
			</div>
		</div>
	);
}

function ReviewStep({
	station,
	sizeKg,
	quantity,
	gasSubtotal,
	deliveryState,
	deliveryAddress,
	contactName,
}: {
	station: LpgStation | null;
	sizeKg: number | null;
	quantity: number;
	gasSubtotal: number;
	deliveryState: string;
	deliveryAddress: string;
	contactName: string;
}) {
	const rows: { label: string; value: string }[] = [
		{
			label: "Station",
			value: station ? `${station.name} · ${station.city}` : "—",
		},
		{ label: "Cylinder", value: sizeKg ? `${quantity} × ${sizeKg}kg` : "—" },
		{ label: "Gas subtotal", value: formatNaira(gasSubtotal) },
		{ label: "Delivery state", value: deliveryState || "—" },
		{ label: "Delivery address", value: deliveryAddress || "—" },
		{ label: "Contact", value: contactName || "—" },
	];
	return (
		<section>
			<dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
				{rows.map((row) => (
					<div key={row.label}>
						<dt className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							{row.label}
						</dt>
						<dd className="mt-1 text-sm font-medium">{row.value}</dd>
					</div>
				))}
			</dl>
			<p className="mt-6 rounded-lg border border-foreground/10 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
				Delivery isn't priced yet. The Soroman team reviews your order, adds the
				delivery fee, and confirms the full price — it appears on your
				dashboard, and you pay once you accept it.
			</p>
		</section>
	);
}

function SubmittedPanel({ request }: { request: LpgOrderRequest }) {
	return (
		<div className="py-6 text-center">
			<CheckCircle2 className="mx-auto size-10 text-accent" aria-hidden />
			<h2 className="mt-4 text-xl font-semibold tracking-tight">
				Order submitted
			</h2>
			<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
				Your order for{" "}
				<span className="font-medium text-foreground tabular-nums">
					{request.cylinderQuantity} × {request.cylinderSizeKg}kg
				</span>{" "}
				is with the Soroman team. They'll price delivery and confirm the full
				price — it appears on your dashboard, and you pay once you accept it.
			</p>

			<p className="mt-6 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
				Order number
			</p>
			<p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
				{request.requestNumber}
			</p>

			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Button
					nativeButton={false}
					render={
						<Link
							to="/dashboard/cooking-gas/$orderId"
							params={{ orderId: String(request.id) }}
						/>
					}
				>
					Track this order
				</Button>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link to="/dashboard/cooking-gas" />}
				>
					All cooking gas orders
				</Button>
			</div>
		</div>
	);
}
