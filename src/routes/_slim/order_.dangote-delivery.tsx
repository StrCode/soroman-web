import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import AccountStep, {
	type AccountPhase,
} from "@/components/dangote-delivery/account-step";
import CompanyStep, {
	type LicenseChoice,
} from "@/components/dangote-delivery/company-step";
import DetailsStep, {
	type DetailsForm,
	EMPTY_DETAILS,
	useDetailsForm,
} from "@/components/dangote-delivery/details-step";
import {
	DangoteDeliveryActions,
	type DangoteDeliveryCta,
} from "@/components/dangote-delivery/rail";
import ReviewStep from "@/components/dangote-delivery/review-step";
import DangoteDeliveryStepper, {
	wizardStepsFor,
} from "@/components/dangote-delivery/stepper";
import SubmittedPanel from "@/components/dangote-delivery/submitted-panel";
import { WizardBack, WizardHeading } from "@/components/order-wizard/chrome";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth";
import {
	createDangoteOrder,
	createLicense,
	listMyLicenses,
	uploadLicenseFile,
} from "@/lib/dangote-delivery/api";
import {
	clearDangoteDeliveryDraft,
	type DangoteDeliveryWizardStep,
	readDangoteDeliveryDraft,
	writeDangoteDeliveryDraft,
} from "@/lib/dangote-delivery/draft";
import {
	DANGOTE_DELIVERY_PRODUCTS,
	type DangoteDeliveryProduct,
	type DangoteOrderRequest,
	PRODUCT_META,
} from "@/lib/dangote-delivery/types";

const STEP_COPY: Record<
	DangoteDeliveryWizardStep,
	{ title: string; description: string }
> = {
	details: {
		title: "Order details",
		description: "Select product, quantity, and where to deliver.",
	},
	account: {
		title: "Your account",
		description:
			"A phone number saves this order to your account so you can track and pay.",
	},
	company: {
		title: "Company & license",
		description:
			"Who the order is for, and the DPR/NUPRC license that backs it.",
	},
	review: {
		title: "Review & submit",
		description: "Confirm your order, then place it.",
	},
};

/**
 * The Dangote Delivery wizard — an order built client-side until one
 * POST. Guests verify on the account step (before company/licenses); signed-in
 * customers skip that step. Draft lives in sessionStorage until submit or exit.
 */
export const Route = createFileRoute("/_slim/order_/dangote-delivery")({
	component: DangoteDeliveryOrderPage,
	head: () => ({
		meta: [
			{ title: "Dangote delivery | Soroman Energy" },
			{
				name: "description",
				content:
					"Place a Dangote delivery order with Soroman. Submit product, quantity, company, and licence details for pricing.",
			},
		],
	}),
});

function DangoteDeliveryOrderPage() {
	const auth = useAuth();
	const navigate = useNavigate();
	const isAuthed = auth.status === "authed";
	const steps = useMemo(() => wizardStepsFor(isAuthed), [isAuthed]);

	const [step, setStep] = useState<DangoteDeliveryWizardStep>(() => {
		const saved = readDangoteDeliveryDraft()?.step ?? "details";
		// Guests shouldn't resume on company/review without an account; signed-in
		// customers skip account if a draft pointed there.
		if (authStore.getState().status === "authed") {
			return saved === "account" ? "company" : saved;
		}
		if (saved === "company" || saved === "review") return "account";
		return saved;
	});
	const [submitted, setSubmitted] = useState<DangoteOrderRequest | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [accountPhase, setAccountPhase] = useState<AccountPhase>("fields");
	const accountContinueRef = useRef<(() => Promise<void>) | null>(null);

	const [initialDetails] = useState<DetailsForm>(() => {
		const saved = readDangoteDeliveryDraft()?.details;
		if (!saved) return EMPTY_DETAILS;
		const product = (DANGOTE_DELIVERY_PRODUCTS as readonly string[]).includes(
			saved.product,
		)
			? (saved.product as DangoteDeliveryProduct)
			: "PMS";
		return { ...EMPTY_DETAILS, ...saved, product, email: saved.email ?? "" };
	});

	const detailsForm = useDetailsForm(initialDetails, async (value) => {
		// After order details: guests collect account; signed-in skip to company.
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			goTo("company", value);
		} else {
			goTo("account", value);
		}
	});

	const [licenseChoice, setLicenseChoice] = useState<LicenseChoice>({
		kind: "none",
	});
	const [licenseError, setLicenseError] = useState<string | null>(null);

	const licensesQuery = useQuery({
		queryKey: ["customer-licenses", "picker"],
		queryFn: () => listMyLicenses({ page: 1, limit: 100 }),
		enabled: isAuthed,
	});
	const licenses = licensesQuery.data?.licenses;

	useEffect(() => {
		if (licenseChoice.kind !== "none") return;
		const savedId = readDangoteDeliveryDraft()?.licenseId;
		if (!savedId || !licenses) return;
		const saved = licenses.find((l) => l.id === savedId);
		if (saved) setLicenseChoice({ kind: "existing", license: saved });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [licenses]);

	// Pre-fill contact from the signed-in profile once (and email when present).
	useEffect(() => {
		if (auth.status !== "authed") return;
		const { contactPerson, contactPhone, email } = detailsForm.state.values;
		if (!contactPerson && auth.customer.name) {
			detailsForm.setFieldValue("contactPerson", auth.customer.name);
		}
		if (!contactPhone && auth.customer.phone) {
			detailsForm.setFieldValue("contactPhone", auth.customer.phone);
		}
		if (!email && auth.customer.email) {
			detailsForm.setFieldValue("email", auth.customer.email);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.status]);

	// If the customer signs in mid-wizard while sitting on account, advance.
	useEffect(() => {
		if (isAuthed && step === "account") {
			setAccountPhase("fields");
			goTo("company");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthed, step]);

	const goTo = (next: DangoteDeliveryWizardStep, details?: DetailsForm) => {
		// Signed-in customers never land on the account step.
		const resolved = isAuthed && next === "account" ? "company" : next;
		setStep(resolved);
		setError(null);
		if (resolved === "account") setAccountPhase("fields");
		writeDangoteDeliveryDraft({
			step: resolved,
			details: details ?? detailsForm.state.values,
			licenseId:
				licenseChoice.kind === "existing" ? licenseChoice.license.id : null,
		});
	};

	const resolveLicenseId = async (
		value: DetailsForm,
	): Promise<number | undefined> => {
		if (licenseChoice.kind === "existing") return licenseChoice.license.id;
		if (licenseChoice.kind !== "file") return undefined;
		const uploaded = await uploadLicenseFile(licenseChoice.file);
		const license = await createLicense({
			companyName: value.companyName.trim() || value.contactPerson.trim(),
			...uploaded,
		});
		setLicenseChoice({ kind: "existing", license });
		return license.id;
	};

	const submit = async () => {
		const value = detailsForm.state.values;
		const meta =
			PRODUCT_META[value.product as DangoteDeliveryProduct] ?? PRODUCT_META.PMS;
		setBusy(true);
		setError(null);
		setLicenseError(null);
		try {
			let licenseId: number | undefined;
			try {
				licenseId = await resolveLicenseId(value);
			} catch (err) {
				setLicenseError(
					err instanceof ApiError
						? err.message
						: "Could not upload the license. Try again, or remove the file to submit without it.",
				);
				goTo("company");
				return;
			}
			const created = await createDangoteOrder({
				product: `${meta.label} (${meta.code})`,
				quantity: Number(value.quantity),
				quantityUnit: meta.unit,
				deliveryAddress: value.deliveryAddress,
				deliveryState: value.deliveryState,
				companyName: value.companyName.trim() || undefined,
				licenseId,
			});
			clearDangoteDeliveryDraft();
			setSubmitted(created);
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not submit. Try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	const requestSubmit = async () => {
		if (!termsAccepted) return;
		await authStore.ensureBootstrapped();
		if (authStore.getState().status !== "authed") {
			// Shouldn't happen — account step gates guests — but recover cleanly.
			goTo("account");
			return;
		}
		await submit();
	};

	const visibleSteps = steps;
	const stepIndex = visibleSteps.findIndex((s) => s.key === step);

	const cta: DangoteDeliveryCta | null =
		step === "details"
			? {
					label: "Continue",
					busy,
					onClick: () => void detailsForm.handleSubmit(),
				}
			: step === "account"
				? {
						label: accountPhase === "code" ? "Verify & continue" : "Send code",
						busy,
						onClick: () => void accountContinueRef.current?.(),
					}
				: step === "company"
					? {
							label: "Continue",
							busy,
							onClick: () => goTo("review"),
						}
					: {
							label: "Place order",
							busy,
							disabled: !termsAccepted,
							hint: "Accept the Soroman terms & conditions to submit",
							onClick: () => void requestSubmit(),
						};

	const copy = STEP_COPY[step];
	const onStepBack =
		stepIndex > 0
			? () => {
					if (step === "account" && accountPhase === "code") {
						setAccountPhase("fields");
						setError(null);
						return;
					}
					goTo(visibleSteps[stepIndex - 1]!.key);
				}
			: undefined;

	const leaveWizard = () => {
		clearDangoteDeliveryDraft();
		void navigate({ to: "/order" });
	};

	if (submitted) {
		return (
			<div className="relative mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10">
				<WizardBack to="/order" label="Order something else" />
				<WizardHeading
					title="Dangote Delivery"
					subtitle="Bulk fuel delivered to your site — price confirmed after review."
				/>
				<Card className="mx-auto mt-6 w-full max-w-2xl">
					<CardContent className="pt-2">
						<SubmittedPanel request={submitted} />
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="relative mx-auto flex w-full max-w-4xl flex-col px-4 py-6 sm:px-6 md:py-10">
			<WizardBack
				onClick={leaveWizard}
				label="Back to orders"
				disabled={busy}
			/>
			<WizardHeading
				title="Dangote Delivery"
				subtitle="Bulk fuel delivered to your site — price confirmed after review."
			/>

			<div className="mt-6">
				<DangoteDeliveryStepper
					current={step}
					steps={visibleSteps}
					onNavigate={(s) => {
						// Don't jump past account while still a guest.
						if (!isAuthed && (s === "company" || s === "review")) return;
						goTo(s);
					}}
				/>
			</div>

			<Card className="mt-6">
				<CardHeader className="border-b">
					<CardTitle className="text-lg font-semibold tracking-tight">
						{copy.title}
					</CardTitle>
					<CardDescription>
						{step === "account" && accountPhase === "code"
							? "Enter the code we texted you to continue."
							: copy.description}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-1">
					{step === "details" && <DetailsStep form={detailsForm} />}
					{step === "account" && (
						<AccountStep
							form={detailsForm}
							busy={busy}
							error={error}
							onError={setError}
							onBusy={setBusy}
							phase={accountPhase}
							onPhaseChange={setAccountPhase}
							continueHandlerRef={accountContinueRef}
							onVerified={() => {
								setError(null);
								goTo("company");
							}}
						/>
					)}
					{step === "company" && (
						<CompanyStep
							form={detailsForm}
							licenses={isAuthed ? (licenses ?? null) : []}
							choice={licenseChoice}
							onChoiceChange={(next) => {
								setLicenseChoice(next);
								setLicenseError(null);
							}}
							authed={isAuthed}
							error={licenseError}
						/>
					)}
					{step === "review" && (
						<ReviewStep
							details={detailsForm.state.values}
							licenseLabel={
								licenseChoice.kind === "existing"
									? licenseChoice.license.companyName
									: licenseChoice.kind === "file"
										? licenseChoice.file.name
										: "None — add during review"
							}
							termsAccepted={termsAccepted}
							onTermsAcceptedChange={setTermsAccepted}
						/>
					)}
					{error && step !== "account" && (
						<p className="mt-4 text-xs text-destructive">{error}</p>
					)}
				</CardContent>
				<CardFooter className="bg-card">
					<DangoteDeliveryActions cta={cta} onBack={onStepBack} />
				</CardFooter>
			</Card>
		</div>
	);
}
