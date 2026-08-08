import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { MICRO } from "@/components/dashboard/panel";
import { cn } from "@/lib/utils";

/**
 * Icon-only back control for order detail pages — round border, no label text
 * (aria-label carries the destination for screen readers).
 */
export function DetailBack({
	to,
	label,
}: {
	to:
		| "/dashboard/orders"
		| "/dashboard/dangote-delivery"
		| "/dashboard/cooking-gas";
	label: string;
}) {
	return (
		<Link
			to={to}
			aria-label={label}
			className="ease-luxe inline-flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-card text-foreground shadow-xs transition-colors duration-250 hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<ArrowLeft className="size-5" strokeWidth={2} />
		</Link>
	);
}

/**
 * Sticky right-hand rail on order detail pages — Actions sit above Progress
 * so the next verb is always in the same place across states.
 */
export function DetailRail({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<aside
			className={cn(
				"min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start",
				className,
			)}
		>
			{children}
		</aside>
	);
}

export function DetailRailCard({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-xl border border-foreground/15 bg-card p-5",
				className,
			)}
		>
			<p className={cn(MICRO, "text-muted-foreground")}>{title}</p>
			<div className="mt-3.5">{children}</div>
		</section>
	);
}

export function railActionClass(destructive?: boolean) {
	return cn(
		"ease-luxe flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors duration-200",
		destructive
			? "text-destructive hover:bg-destructive/10"
			: "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
	);
}

/** Full-width ghost action row used inside the Actions card. */
export function RailAction({
	children,
	onClick,
	href,
	destructive,
	disabled,
}: {
	children: ReactNode;
	onClick?: () => void;
	href?: string;
	destructive?: boolean;
	disabled?: boolean;
}) {
	const className = cn(
		railActionClass(destructive),
		disabled && "pointer-events-none opacity-50",
	);

	if (href) {
		return (
			<a href={href} target="_blank" rel="noreferrer" className={className}>
				{children}
			</a>
		);
	}

	return (
		<button
			type="button"
			className={className}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
}
