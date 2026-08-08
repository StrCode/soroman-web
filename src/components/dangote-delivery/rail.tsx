import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DangoteDeliveryCta = {
	label: string;
	disabled?: boolean;
	busy?: boolean;
	/** Shown when disabled, so a dead button always explains itself. */
	hint?: string;
	onClick: () => void;
};

type WizardActionsProps = {
	cta: DangoteDeliveryCta | null;
	/** Previous step within the form — the top-left chrome exits to /order. */
	onBack?: () => void;
};

/**
 * Form footer: optional Back (previous step) + the step's commitment CTA.
 * Leaving the wizard entirely is the top-left chrome, not this Back.
 */
export function DangoteDeliveryActions({ cta, onBack }: WizardActionsProps) {
	if (!cta) return null;

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex gap-2">
				{onBack ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="h-12 cursor-pointer px-4"
						disabled={cta.busy}
						onClick={onBack}
					>
						<ArrowLeft data-icon="inline-start" />
						Back
					</Button>
				) : null}
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
			</div>
			{cta.disabled && cta.hint ? (
				<p className="text-center text-[0.65rem] text-muted-foreground/70">
					{cta.hint}
				</p>
			) : null}
		</div>
	);
}
