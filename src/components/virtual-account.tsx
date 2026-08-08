import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { VirtualAccount } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * The customer's dedicated (permanent) Paystack account, rendered the same
 * everywhere it appears — invoice step, account page, dashboard strip — so
 * the number always reads as the one account it is.
 */

function useCopied(): [boolean, (text: string) => Promise<void>] {
	const [copied, setCopied] = useState(false);
	const copy = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard unavailable (permissions); the value is still selectable.
		}
	};
	return [copied, copy];
}

export function CopyIconButton({
	value,
	label,
	className,
}: {
	value: string;
	label: string;
	className?: string;
}) {
	const [copied, copy] = useCopied();
	return (
		<button
			type="button"
			onClick={() => void copy(value.replace(/\s/g, ""))}
			aria-label={label}
			// Padding over raw icon size: keeps the visual weight light while the
			// hit area clears the 24px accessibility minimum.
			className={cn(
				"-m-1.5 rounded-md p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-accent/80",
				className,
			)}
		>
			{copied ? (
				<Check className="size-3.5" aria-hidden />
			) : (
				<Copy className="size-3.5" aria-hidden />
			)}
		</button>
	);
}

function AccountRow({
	label,
	value,
	emphasized,
	last,
}: {
	label: string;
	value: string;
	emphasized?: boolean;
	last?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4 px-3.5 py-2.5",
				!last && "border-b",
			)}
		>
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="flex items-center gap-2.5">
				<span
					className={cn(
						"tabular-nums",
						emphasized ? "text-base font-semibold tracking-wide" : "text-sm",
					)}
				>
					{value}
				</span>
				<CopyIconButton value={value} label={`Copy ${label.toLowerCase()}`} />
			</span>
		</div>
	);
}

/** The bordered three-row account block. Style the border via className. */
export function AccountRows({
	account,
	className,
}: {
	account: VirtualAccount;
	className?: string;
}) {
	return (
		<div className={cn("overflow-hidden rounded-lg border", className)}>
			<AccountRow
				label="Account number"
				value={account.account_number}
				emphasized
			/>
			<AccountRow label="Bank" value={account.bank} />
			<AccountRow label="Account name" value={account.account_name} last />
		</div>
	);
}

export function CopyAllButton({ account }: { account: VirtualAccount }) {
	const [copied, copy] = useCopied();

	const copyAll = () =>
		copy(
			[
				`Bank: ${account.bank}`,
				`Account number: ${account.account_number}`,
				`Account name: ${account.account_name}`,
			].join("\n"),
		);

	return (
		<button
			type="button"
			onClick={() => void copyAll()}
			className="shrink-0 rounded-full border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.15em] text-accent uppercase transition-colors hover:bg-accent/10"
		>
			{copied ? "Copied" : "Copy all details"}
		</button>
	);
}
