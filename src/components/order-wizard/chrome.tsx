import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Loader2,
	type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The shared order-wizard chrome — the Dangote Delivery idiom, generalized so
 * the depot and cooking-gas wizards read as one family: a top-left exit back
 * to the order chooser, a centered page heading, an icon stepper with a
 * progress connector, and a footer with optional step-Back + forward CTA.
 */

const BACK_CLASS =
	"ease-luxe absolute top-5 left-4 z-10 flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-card shadow-xs transition-colors duration-250 hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:left-6";

/**
 * Back pinned to the top-left of the page. With `onClick` it runs a handler
 * (exit + clear, or close a gate); with `to` it's a plain link.
 */
export function WizardBack({
	onClick,
	to,
	disabled,
	label = "Back",
}: {
	onClick?: () => void;
	to?: string;
	disabled?: boolean;
	label?: string;
}) {
	if (onClick) {
		return (
			<button
				type="button"
				aria-label={label}
				className={BACK_CLASS}
				onClick={onClick}
				disabled={disabled}
			>
				<ArrowLeft className="size-5" />
			</button>
		);
	}
	return (
		<Link to={to ?? "/order"} aria-label={label} className={BACK_CLASS}>
			<ArrowLeft className="size-5" />
		</Link>
	);
}

/** Centered page heading + subtitle, above the stepper. */
export function WizardHeading({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="mt-3 text-center">
			<p className="text-xl font-semibold tracking-tight">{title}</p>
			{subtitle && (
				<p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
			)}
		</div>
	);
}

export type WizardStep<K extends string> = {
	key: K;
	label: string;
	icon: LucideIcon;
};

/**
 * Full-width icon stepper with a progress connector. Completed steps behind
 * the current one are clickable when `onNavigate` is provided; future steps
 * stay inert.
 */
export function WizardStepper<K extends string>({
	steps,
	current,
	onNavigate,
}: {
	steps: readonly WizardStep<K>[];
	current: K;
	onNavigate?: (step: K) => void;
}) {
	const currentIndex = steps.findIndex((s) => s.key === current);
	const progress =
		currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

	return (
		<nav
			aria-label="Order progress"
			className="relative mx-auto w-full max-w-3xl px-2"
		>
			<div
				className="absolute top-5 right-[10%] left-[10%] h-0.5 bg-border"
				aria-hidden
			/>
			<div
				className="ease-luxe absolute top-5 left-[10%] h-0.5 bg-primary transition-[width] duration-300"
				style={{ width: `calc(${progress}% * 0.8)` }}
				aria-hidden
			/>
			<ol className="relative flex justify-between">
				{steps.map((step, i) => {
					const done = i < currentIndex;
					const active = i === currentIndex;
					const clickable = done && onNavigate;
					const Icon = step.icon;
					const Tag = clickable ? "button" : "div";
					return (
						<li key={step.key} className="flex flex-1 flex-col items-center">
							<Tag
								{...(clickable
									? {
											type: "button" as const,
											onClick: () => onNavigate(step.key),
										}
									: {})}
								className={cn(
									"flex flex-col items-center gap-2 bg-transparent",
									clickable && "cursor-pointer",
								)}
							>
								<span
									className={cn(
										"ease-luxe relative z-10 flex size-10 items-center justify-center rounded-full transition-colors duration-250 sm:size-11",
										active &&
											"bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
										done && !active && "bg-primary text-primary-foreground",
										!active && !done && "bg-muted text-muted-foreground",
									)}
								>
									{done && !active ? (
										<Check className="size-4" />
									) : (
										<Icon className="size-4" />
									)}
								</span>
								<span
									className={cn(
										"max-w-16 text-center text-[0.65rem] leading-tight font-medium sm:max-w-20 sm:text-xs",
										active &&
											"text-primary underline decoration-2 underline-offset-4",
										done && !active && "text-muted-foreground",
										!active && !done && "text-muted-foreground/60",
									)}
								>
									{step.label}
								</span>
							</Tag>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export type WizardCta = {
	label: string;
	disabled?: boolean;
	busy?: boolean;
	/** Shown under a disabled button so a dead CTA always explains itself. */
	hint?: string;
	onClick: () => void;
};

/**
 * Form footer: optional Back (previous step) + the step's commitment CTA.
 * Leaving the wizard entirely is the top-left chrome, not this Back.
 */
export function WizardActions({
	cta,
	onBack,
}: {
	cta: WizardCta | null;
	onBack?: () => void;
}) {
	if (!cta && !onBack) return null;
	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex gap-2">
				{onBack ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="h-12 cursor-pointer px-4"
						disabled={cta?.busy}
						onClick={onBack}
					>
						<ArrowLeft data-icon="inline-start" />
						Back
					</Button>
				) : null}
				{cta ? (
					<Button
						type="button"
						size="lg"
						className="h-12 min-w-0 flex-1 cursor-pointer text-base"
						disabled={cta.disabled || cta.busy}
						onClick={cta.onClick}
					>
						{cta.busy ? (
							<Loader2 className="animate-spin" data-icon="inline-start" />
						) : null}
						{cta.label}
						{!cta.busy ? <ArrowRight data-icon="inline-end" /> : null}
					</Button>
				) : null}
			</div>
			{cta?.disabled && cta.hint ? (
				<p className="text-center text-[0.65rem] text-muted-foreground/70">
					{cta.hint}
				</p>
			) : null}
		</div>
	);
}
