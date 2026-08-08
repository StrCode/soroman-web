import {
	Building2,
	Check,
	ClipboardCheck,
	type LucideIcon,
	Package,
	UserRound,
} from "lucide-react";
import type { DangoteDeliveryWizardStep } from "@/lib/dangote-delivery/draft";
import { cn } from "@/lib/utils";

export const ALL_WIZARD_STEPS: {
	key: DangoteDeliveryWizardStep;
	label: string;
	icon: LucideIcon;
}[] = [
	{ key: "details", label: "Order details", icon: Package },
	{ key: "account", label: "Your account", icon: UserRound },
	{ key: "company", label: "Company & license", icon: Building2 },
	{ key: "review", label: "Review & submit", icon: ClipboardCheck },
];

/** Steps shown in the chrome — omit account when the customer is already signed in. */
export function wizardStepsFor(authed: boolean) {
	return authed
		? ALL_WIZARD_STEPS.filter((s) => s.key !== "account")
		: ALL_WIZARD_STEPS;
}

/** @deprecated Prefer wizardStepsFor — kept for any leftover imports. */
export const WIZARD_STEPS = ALL_WIZARD_STEPS;

type DangoteDeliveryStepperProps = {
	current: DangoteDeliveryWizardStep;
	steps?: typeof ALL_WIZARD_STEPS;
	/** Steps behind the current one are clickable when provided. */
	onNavigate?: (step: DangoteDeliveryWizardStep) => void;
};

/**
 * Full-width icon stepper with a progress connector — same posture as the
 * classic Soroman order wizard. Completed steps are revisitable; future steps
 * stay inert.
 */
export default function DangoteDeliveryStepper({
	current,
	steps = ALL_WIZARD_STEPS,
	onNavigate,
}: DangoteDeliveryStepperProps) {
	const currentIndex = steps.findIndex((s) => s.key === current);
	const progress =
		currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

	return (
		<nav
			aria-label="Order request progress"
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
