import type * as React from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

/**
 * Checkout wants sturdier, form-like controls than the marketing surfaces'
 * editorial underline, so every text field in the flow shares this boxed
 * treatment. Matches the selects and the quantity group. Placeholders are
 * dimmed a step so an example address never reads as a filled value.
 */
export function BoxedInput({
	className,
	...props
}: React.ComponentProps<typeof Input>) {
	return (
		<Input
			className={cn(
				"h-11 rounded-lg border border-input px-3.5 text-sm placeholder:text-muted-foreground/50 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/30",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The flow's select, sized to sit beside BoxedInput. A native <select> keeps
 * the phone's own wheel picker, which is the right control for a driver on a
 * handset — and it can't be clipped by a page-drawn popup.
 *
 * NativeSelect takes className on its wrapper and pins the control at h-8, so
 * the taller boxed treatment has to reach the <select> through a child
 * selector rather than the usual className merge.
 */
export function BoxedSelect({
	className,
	...props
}: React.ComponentProps<typeof NativeSelect>) {
	return (
		<NativeSelect
			className={cn(
				"w-full",
				"[&>select]:h-11 [&>select]:px-3.5 [&>select]:pr-10",
				"[&>select]:transition-colors [&>select]:duration-300 [&>select]:ease-luxe",
				"[&>select:hover]:border-foreground/40",
				"[&>select:focus-visible]:border-accent [&>select:focus-visible]:ring-1 [&>select:focus-visible]:ring-accent/30",
				className,
			)}
			{...props}
		/>
	);
}
