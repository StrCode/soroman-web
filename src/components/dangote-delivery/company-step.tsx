import { CheckCircle2, FileText, Plus, Upload, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { DetailsFormApi } from "@/components/dangote-delivery/details-step";
import { BoxedInput } from "@/components/order/boxed";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type CustomerLicense,
	LICENSE_ACCEPTED_TYPES,
	LICENSE_MAX_BYTES,
	LICENSE_STATUS_LABELS,
	licenseUsable,
} from "@/lib/dangote-delivery/types";
import { cn } from "@/lib/utils";

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

/** What the customer decided about the license on this request. */
export type LicenseChoice =
	| { kind: "none" }
	| { kind: "existing"; license: CustomerLicense }
	| { kind: "file"; file: File };

/** Explicit path: reuse a register license, or upload a new one. */
type LicensePath = "existing" | "new";

type CompanyStepProps = {
	form: DetailsFormApi;
	/** Signed-in customer's register; null while loading. Guests never reach this step unauthenticated. */
	licenses: CustomerLicense[] | null;
	choice: LicenseChoice;
	onChoiceChange: (choice: LicenseChoice) => void;
	/** Always true once this step is reachable — kept for license-path UI. */
	authed: boolean;
	error?: string | null;
};

/**
 * Step 2 — company + DPR/NUPRC license as a clear fork: pick one already on
 * file, or add a new company/license. Optional by design — staff can still
 * ask for a license before approving.
 */
export default function CompanyStep({
	form,
	licenses,
	choice,
	onChoiceChange,
	authed,
	error,
}: CompanyStepProps) {
	const fileRef = useRef<HTMLInputElement>(null);
	const userPickedPath = useRef(false);
	const hasRegister = Boolean(authed && licenses && licenses.length > 0);

	const [path, setPath] = useState<LicensePath>(() =>
		choice.kind === "file"
			? "new"
			: choice.kind === "existing" || hasRegister
				? "existing"
				: "new",
	);

	// Keep path in sync with an active choice; default to "existing" once the
	// register loads unless the user already flipped the fork themselves.
	useEffect(() => {
		if (choice.kind === "file") {
			setPath("new");
			return;
		}
		if (choice.kind === "existing") {
			setPath("existing");
			return;
		}
		if (!userPickedPath.current) {
			setPath(hasRegister ? "existing" : "new");
		} else if (!hasRegister) {
			setPath("new");
		}
	}, [hasRegister, choice.kind]);

	const pickFile = (file: File | undefined) => {
		if (!file) return;
		if (!(LICENSE_ACCEPTED_TYPES as readonly string[]).includes(file.type))
			return;
		if (file.size > LICENSE_MAX_BYTES) return;
		onChoiceChange({ kind: "file", file });
	};

	const selectPath = (next: LicensePath) => {
		userPickedPath.current = true;
		setPath(next);
		if (next === "existing" && choice.kind === "file") {
			onChoiceChange({ kind: "none" });
			if (fileRef.current) fileRef.current.value = "";
		}
		if (next === "new" && choice.kind === "existing") {
			onChoiceChange({ kind: "none" });
		}
	};

	const selectExisting = (license: CustomerLicense) => {
		const selected =
			choice.kind === "existing" && choice.license.id === license.id;
		if (selected) {
			onChoiceChange({ kind: "none" });
			return;
		}
		onChoiceChange({ kind: "existing", license });
		// Prefer the name on the license document for the order paperwork.
		if (license.companyName.trim()) {
			form.setFieldValue("companyName", license.companyName);
		}
	};

	return (
		<section className="grid gap-6">
			<div className="grid gap-1.5">
				<span className={FIELD_LABEL}>
					Company &amp; license{" "}
					<span className="normal-case tracking-normal">(optional)</span>
				</span>
				<p className="text-xs text-muted-foreground">
					Attach a license already on your account, or add a new company and
					upload a DPR / NUPRC document. Verified before your order is priced.
				</p>
			</div>

			{/* Path picker — only when the register has something to choose from. */}
			{hasRegister ? (
				<div
					className="grid grid-cols-2 gap-2"
					role="radiogroup"
					aria-label="License source"
				>
					<PathCard
						selected={path === "existing"}
						title="Use on file"
						subtitle="Pick a verified license"
						onSelect={() => selectPath("existing")}
					/>
					<PathCard
						selected={path === "new"}
						title="Add new"
						subtitle="Company + upload"
						icon={<Plus className="size-3.5" />}
						onSelect={() => selectPath("new")}
					/>
				</div>
			) : null}

			{authed && licenses === null && <Skeleton className="h-24 rounded-lg" />}

			{/* Path A — choose from the register */}
			{path === "existing" && hasRegister && licenses && (
				<div className="grid gap-2">
					<span className={FIELD_LABEL}>Licenses on your account</span>
					{licenses.map((license) => {
						const selected =
							choice.kind === "existing" && choice.license.id === license.id;
						const usable = licenseUsable(license);
						return (
							<button
								key={license.id}
								type="button"
								disabled={!usable}
								role="radio"
								aria-checked={selected}
								onClick={() => selectExisting(license)}
								className={cn(
									"ease-luxe flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors duration-250 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
									selected
										? "border-primary bg-primary/10"
										: "border-input hover:border-foreground/30",
									!usable && "cursor-not-allowed opacity-50",
								)}
							>
								<span className="flex min-w-0 items-center gap-2.5">
									<FileText className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium">
											{license.companyName}
										</span>
										<span className="block text-xs text-muted-foreground">
											{LICENSE_STATUS_LABELS[license.status]}
											{license.expiryDate && ` · expires ${license.expiryDate}`}
										</span>
									</span>
								</span>
								<span
									className={cn(
										"grid size-5 shrink-0 place-items-center rounded-full border",
										selected
											? "border-primary bg-primary"
											: "border-foreground/25",
									)}
									aria-hidden
								>
									{selected && (
										<span className="size-2 rounded-full bg-primary-foreground" />
									)}
								</span>
							</button>
						);
					})}
					{choice.kind === "existing" && (
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<CheckCircle2 className="size-3.5 text-primary" />
							Company on the order set to {choice.license.companyName}
						</p>
					)}
				</div>
			)}

			{/* Path B — new company + upload (also the only path when no register) */}
			{(path === "new" || !hasRegister) && licenses !== null && (
				<div className="grid gap-5">
					<form.Field name="companyName">
						{(field) => (
							<div className="grid gap-1.5">
								<Label htmlFor="co-company" className={FIELD_LABEL}>
									Company name on the license
								</Label>
								<BoxedInput
									id="co-company"
									autoComplete="organization"
									placeholder="Obi Fuels Ltd"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
								/>
								<p className="text-xs text-muted-foreground">
									Goes on the order and delivery paperwork.
								</p>
							</div>
						)}
					</form.Field>

					<div className="grid gap-1.5">
						<span className={FIELD_LABEL}>Upload DPR / NUPRC license</span>
						<p className="text-xs text-muted-foreground">
							PDF, JPG, or PNG — up to 10MB.
							{!authed && " Uploads after you verify your phone."}
						</p>

						{choice.kind === "file" ? (
							<div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/10 px-4 py-3">
								<span className="flex min-w-0 items-center gap-2.5">
									<FileText className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium">
											{choice.file.name}
										</span>
										<span className="block text-xs text-muted-foreground">
											{(choice.file.size / 1024 / 1024).toFixed(1)} MB
										</span>
									</span>
								</span>
								<button
									type="button"
									aria-label="Remove file"
									className="cursor-pointer text-muted-foreground hover:text-foreground"
									onClick={() => {
										onChoiceChange({ kind: "none" });
										if (fileRef.current) fileRef.current.value = "";
									}}
								>
									<X className="size-4" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="ease-luxe mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-5 text-sm text-muted-foreground transition-colors duration-250 hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<Upload className="size-4" />
								Drop a file here or tap to choose
							</button>
						)}
						<input
							ref={fileRef}
							type="file"
							accept={LICENSE_ACCEPTED_TYPES.join(",")}
							className="hidden"
							onChange={(e) => pickFile(e.target.files?.[0])}
						/>
					</div>
				</div>
			)}

			{error && <p className="text-xs text-destructive">{error}</p>}
		</section>
	);
}

function PathCard({
	selected,
	title,
	subtitle,
	icon,
	onSelect,
}: {
	selected: boolean;
	title: string;
	subtitle: string;
	icon?: ReactNode;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onClick={onSelect}
			className={cn(
				"ease-luxe cursor-pointer rounded-lg border px-3.5 py-3 text-left transition-colors duration-250 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
				selected
					? "border-primary bg-primary/10"
					: "border-input hover:border-foreground/30",
			)}
		>
			<span
				className={cn(
					"flex items-center gap-1.5 text-sm font-semibold",
					selected && "text-primary",
				)}
			>
				{icon}
				{title}
			</span>
			<span className="mt-0.5 block text-xs text-muted-foreground">
				{subtitle}
			</span>
		</button>
	);
}
