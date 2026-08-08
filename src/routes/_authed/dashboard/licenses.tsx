import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MICRO } from "@/components/dashboard/panel";
import { DataTable } from "@/components/data-table";
import { BoxedInput } from "@/components/order/boxed";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
	createLicense,
	type LicensesListParams,
	listMyLicenses,
	uploadLicenseFile,
} from "@/lib/dangote-delivery/api";
import {
	type CustomerLicense,
	LICENSE_ACCEPTED_TYPES,
	LICENSE_MAX_BYTES,
	LICENSE_STATUS_LABELS,
} from "@/lib/dangote-delivery/types";
import type { AppColumnDef } from "@/lib/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/dashboard/licenses")({
	component: LicensesPage,
});

const PAGE_SIZE = 10;

const FIELD_LABEL =
	"text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase";

const isExpired = (license: CustomerLicense) =>
	license.expiryDate !== null && Date.parse(license.expiryDate) <= Date.now();

/**
 * A lapsed license reads as Expired regardless of what verification said —
 * that's the fact that decides whether it can back a quote.
 */
function chipFor(license: CustomerLicense): { label: string; tone: string } {
	if (isExpired(license)) {
		return {
			label: "Expired",
			tone: "border-foreground/15 bg-muted/50 text-muted-foreground",
		};
	}
	if (license.status === "rejected") {
		return {
			label: LICENSE_STATUS_LABELS.rejected,
			tone: "border-destructive/30 bg-destructive/10 text-destructive",
		};
	}
	if (license.status === "approved") {
		return {
			label: LICENSE_STATUS_LABELS.approved,
			tone: "border-accent/40 bg-accent/15 text-accent",
		};
	}
	return {
		label: LICENSE_STATUS_LABELS.pending,
		tone: "border-amber-500/40 bg-amber-500/10 text-amber-600",
	};
}

type FilterKey = "all" | "approved" | "pending" | "rejected" | "expired";

/** The status cards double as the table's filter — expired wins over status. */
const FILTERS: {
	key: FilterKey;
	label: string;
	match: (l: CustomerLicense) => boolean;
}[] = [
	{ key: "all", label: "All", match: () => true },
	{
		key: "approved",
		label: "Verified",
		match: (l) => l.status === "approved" && !isExpired(l),
	},
	{
		key: "pending",
		label: "Awaiting",
		match: (l) => l.status === "pending" && !isExpired(l),
	},
	{
		key: "rejected",
		label: "Rejected",
		match: (l) => l.status === "rejected" && !isExpired(l),
	},
	{ key: "expired", label: "Expired", match: isExpired },
];

const formatDate = (iso?: string | null) =>
	iso
		? new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium" })
		: "—";

/** Stable column defs — module-level so useReactTable never re-creates them. */
const columns: AppColumnDef<CustomerLicense>[] = [
	{
		accessorKey: "companyName",
		header: "Company",
		cell: ({ row }) => (
			<span className="block max-w-64 truncate font-medium">
				{row.original.companyName}
			</span>
		),
	},
	{
		id: "document",
		header: "Document",
		cell: ({ row }) =>
			row.original.licenseUrl ? (
				<a
					href={row.original.licenseUrl}
					target="_blank"
					rel="noreferrer"
					onClick={(e) => e.stopPropagation()}
					className="ease-luxe inline-flex items-center gap-1 text-accent transition-colors duration-250 hover:underline"
				>
					View
					<ExternalLink className="size-3" />
				</a>
			) : (
				<span className="text-muted-foreground">No file</span>
			),
	},
	{
		accessorKey: "expiryDate",
		header: "Expires",
		cell: ({ row }) => (
			<span className="text-muted-foreground tabular-nums">
				{formatDate(row.original.expiryDate)}
			</span>
		),
	},
	{
		accessorKey: "createdAt",
		header: "Added",
		cell: ({ row }) => (
			<span className="text-muted-foreground tabular-nums">
				{formatDate(row.original.createdAt)}
			</span>
		),
	},
	{
		id: "status",
		header: "Status",
		cell: ({ row }) => {
			const chip = chipFor(row.original);
			return (
				<span
					className={cn(
						"inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-widest uppercase",
						chip.tone,
					)}
				>
					{chip.label}
				</span>
			);
		},
	},
];

/**
 * The account's license register, in the dashboard's own idiom: status cards
 * up top that double as filters, the register as a table below, and the
 * upload form at the end. A verified, unexpired license is what the Dangote
 * wizard offers for reuse — this page is where the customer sees why one is
 * (or isn't) usable.
 */
function LicensesPage() {
	const [filter, setFilter] = useState<FilterKey>("all");
	const [page, setPage] = useState(1);

	// Snapshot for status-card counts (and the Expired tab, which is
	// expiry-date derived and not a server status).
	const { data: snapshot } = useQuery({
		queryKey: ["customer-licenses", "snapshot"],
		queryFn: () => listMyLicenses({ page: 1, limit: 100 }),
	});

	const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
	const listParams: LicensesListParams | null =
		filter === "expired"
			? null
			: {
					page,
					limit: PAGE_SIZE,
					...(filter === "all" ? {} : { status: filter }),
				};

	const { data, isLoading } = useQuery({
		queryKey: ["customer-licenses", listParams],
		queryFn: () => listMyLicenses(listParams!),
		enabled: listParams !== null,
	});

	const counts = useMemo(() => {
		const all = snapshot?.licenses ?? [];
		return Object.fromEntries(
			FILTERS.map((f) => [f.key, all.filter(f.match).length]),
		) as Record<FilterKey, number>;
	}, [snapshot]);

	const rows =
		filter === "expired"
			? (snapshot?.licenses ?? []).filter(isExpired)
			: (data?.licenses ?? []);
	const pagination =
		filter === "expired"
			? {
					page: 1,
					pages: 1,
					total: rows.length,
				}
			: data?.pagination;

	const selectFilter = (key: FilterKey) => {
		setFilter(key);
		setPage(1);
	};

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header
				className="snapshot-rise flex flex-wrap items-end justify-between gap-6"
				style={{ animationDelay: "0ms" }}
			>
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground")}>
							Compliance
						</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						Company{" "}
						<em className="font-semibold text-accent not-italic">licenses</em>.
					</h1>
					<p className="mt-3 max-w-xl text-sm text-muted-foreground">
						The Soroman team verifies each license once; a verified, unexpired
						license can back any Dangote quote request without another upload.
					</p>
				</div>
				<AddLicenseDialog />
			</header>

			<div
				className="snapshot-rise mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
				style={{ animationDelay: "60ms" }}
			>
				{FILTERS.map((f) => (
					<button
						key={f.key}
						type="button"
						aria-pressed={filter === f.key}
						onClick={() => selectFilter(f.key)}
						className={cn(
							"ease-luxe rounded-xl border p-4 text-left transition-colors duration-250 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
							filter === f.key
								? "border-accent/50 bg-accent/5"
								: "border-foreground/15 bg-card hover:border-foreground/30",
						)}
					>
						<span className={cn(MICRO, "text-muted-foreground")}>
							{f.label}
						</span>
						<span className="mt-1.5 block text-2xl leading-none font-semibold tabular-nums">
							{snapshot ? counts[f.key] : "—"}
						</span>
					</button>
				))}
			</div>

			<div className="snapshot-rise mt-6" style={{ animationDelay: "120ms" }}>
				<DataTable
					columns={columns}
					data={rows}
					isLoading={filter === "expired" ? !snapshot : isLoading}
					emptyTitle={
						filter === "all"
							? "No licenses on file yet."
							: `No ${active.label.toLowerCase()} licenses.`
					}
					emptyDescription={
						filter === "all"
							? "Add your DPR/NUPRC license with the button above, or attach one during a Dangote quote request."
							: "Switch to All to see the full register."
					}
					pagination={
						pagination
							? {
									page: pagination.page,
									pages: pagination.pages,
									total: pagination.total,
									label: "licenses",
									alwaysShow: true,
									onPageChange: setPage,
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}

/**
 * Upload a license ahead of any order — same register the wizard reads. A
 * modal keeps the page itself read-and-filter; the form appears only when
 * asked for, and closes itself once the license lands.
 */
function AddLicenseDialog() {
	const queryClient = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [companyName, setCompanyName] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	const reset = () => {
		setCompanyName("");
		setFile(null);
		setError(null);
		if (fileRef.current) fileRef.current.value = "";
	};

	const save = useMutation({
		mutationFn: async () => {
			const uploaded = file ? await uploadLicenseFile(file) : {};
			return createLicense({ companyName: companyName.trim(), ...uploaded });
		},
		onSuccess: () => {
			reset();
			setOpen(false);
			void queryClient.invalidateQueries({ queryKey: ["customer-licenses"] });
			toast.success("License added — the Soroman team will verify it.");
		},
		onError: (err) =>
			setError(
				err instanceof ApiError
					? err.message
					: "Could not add the license. Try again.",
			),
	});

	const pickFile = (next: File | undefined) => {
		if (!next) return;
		if (!(LICENSE_ACCEPTED_TYPES as readonly string[]).includes(next.type)) {
			setError("PDF, JPG, or PNG only.");
			return;
		}
		if (next.size > LICENSE_MAX_BYTES) {
			setError("The file is over 10MB.");
			return;
		}
		setError(null);
		setFile(next);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				// Mid-upload the dialog stays put — closing it wouldn't stop the
				// request, it would just hide the outcome.
				if (save.isPending) return;
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger render={<Button size="lg" />}>
				<Plus data-icon="inline-start" />
				Add license
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add a license</DialogTitle>
					<DialogDescription>
						PDF, JPG, or PNG — up to 10MB. The Soroman team verifies it before
						it can back a quote.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 px-5">
					<div className="grid gap-1.5">
						<Label htmlFor="license-company" className={FIELD_LABEL}>
							Company name on the license
						</Label>
						<BoxedInput
							id="license-company"
							value={companyName}
							onChange={(e) => setCompanyName(e.target.value)}
							placeholder="Obi Fuels Ltd"
							autoComplete="organization"
						/>
					</div>

					{file ? (
						<div className="flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/10 px-4 py-3">
							<span className="flex min-w-0 items-center gap-2.5">
								<FileText className="size-4 shrink-0 text-muted-foreground" />
								<span className="min-w-0">
									<span className="block truncate text-sm font-medium">
										{file.name}
									</span>
									<span className="block text-xs text-muted-foreground">
										{(file.size / 1024 / 1024).toFixed(1)} MB
									</span>
								</span>
							</span>
							<button
								type="button"
								aria-label="Remove file"
								className="text-muted-foreground hover:text-foreground"
								onClick={() => {
									setFile(null);
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
							className="ease-luxe flex items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-6 text-sm text-muted-foreground transition-colors duration-250 hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={save.isPending}
						onClick={() => {
							setOpen(false);
							reset();
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!companyName.trim() || !file || save.isPending}
						onClick={() => save.mutate()}
					>
						{save.isPending && (
							<Loader2 className="animate-spin" data-icon="inline-start" />
						)}
						{save.isPending ? "Uploading…" : "Add license"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
