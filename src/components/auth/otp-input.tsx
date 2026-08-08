import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type OtpInputProps = {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	disabled?: boolean;
	label: string;
};

/**
 * Segmented one-time-code input. A single invisible input drives the boxes,
 * so `autocomplete="one-time-code"`, paste, and mobile numeric keyboards all
 * behave natively while the UI reads as six cells.
 */
export default function OtpInput({
	value,
	onChange,
	length = 6,
	disabled,
	label,
}: OtpInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [focused, setFocused] = useState(false);

	const digits = Array.from({ length }, (_, i) => value[i] ?? "");
	const activeIndex = Math.min(value.length, length - 1);

	return (
		<div className="relative">
			<input
				ref={inputRef}
				value={value}
				onChange={(e) =>
					onChange(e.target.value.replace(/\D/g, "").slice(0, length))
				}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onSelect={(e) => {
					// Keep the caret at the end so typing always fills the next cell.
					const el = e.currentTarget;
					el.setSelectionRange(el.value.length, el.value.length);
				}}
				inputMode="numeric"
				autoComplete="one-time-code"
				aria-label={label}
				disabled={disabled}
				autoFocus
				className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
			/>
			<div className="flex gap-2" aria-hidden>
				{digits.map((digit, i) => (
					<div
						key={i}
						className={cn(
							"flex h-12 flex-1 items-center justify-center rounded-lg border border-input bg-transparent text-lg font-semibold tabular-nums transition-colors dark:bg-input/30",
							focused && i === activeIndex && "border-ring ring-1 ring-ring/50",
							disabled && "opacity-50",
						)}
					>
						{digit}
					</div>
				))}
			</div>
		</div>
	);
}
