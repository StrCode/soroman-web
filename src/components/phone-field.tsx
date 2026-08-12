import { getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import * as React from "react";
import RPNInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import "react-phone-number-input/style.css";

/**
 * The phone input, everywhere a phone is typed. Locked to Nigeria for now —
 * the flag still shows so the +234 context is obvious, but the country picker
 * only offers NG. Emitted value is E.164 ("+234…") or "" while incomplete.
 *
 * Flags come from react-phone-number-input's inline-SVG set rather than the
 * default <img> URLs, so nothing loads from a third-party CDN.
 */

const NG_PLACEHOLDER =
	getExampleNumber("NG", examples)?.formatNational() ?? "0802 123 4567";

type PhoneFieldProps = {
	/** E.164 ("+2348031234567") or "" — feed it straight to normalizePhone. */
	value: string;
	onChange: (value: string) => void;
	/**
	 * Renders the number box; defaults to the shared UI Input. Checkout
	 * surfaces pass BoxedInput to keep their sturdier boxed treatment.
	 */
	inputComponent?: React.ElementType;
	/** Classes for the number box; `className` styles the wrapper row. */
	inputClassName?: string;
	className?: string;
} & Omit<
	React.ComponentProps<"input">,
	"value" | "onChange" | "className" | "placeholder"
>;

export default function PhoneField({
	value,
	onChange,
	inputComponent,
	inputClassName,
	className,
	...inputProps
}: PhoneFieldProps) {
	return (
		<RPNInput
			value={value || undefined}
			onChange={(next) => onChange(next ?? "")}
			defaultCountry="NG"
			countries={["NG" satisfies Country]}
			addInternationalOption={false}
			flags={flags}
			countrySelectProps={{ "aria-label": "Country", disabled: true }}
			inputComponent={inputComponent ?? Input}
			numberInputProps={{
				className: inputClassName,
				placeholder: NG_PLACEHOLDER,
				...inputProps,
			}}
			className={cn(
				"flex items-stretch gap-2",
				// Restyle the library's country selector as a sibling box that matches
				// the inputs. Structural rules (the invisible <select> overlaying the
				// flag) come from its stylesheet; these override only the cosmetics.
				"[&_.PhoneInputCountry]:m-0 [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:gap-0.5 [&_.PhoneInputCountry]:rounded-lg [&_.PhoneInputCountry]:border [&_.PhoneInputCountry]:border-input [&_.PhoneInputCountry]:px-3",
				// Picker is locked to NG — hide the dropdown arrow so it reads as a
				// static +234 badge rather than a disabled control.
				"[&_.PhoneInputCountrySelectArrow]:hidden",
				"[--PhoneInputCountryFlag-borderColor:transparent] [--PhoneInputCountryFlag-height:0.95rem]",
				className,
			)}
		/>
	);
}
