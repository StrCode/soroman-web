import { getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import * as React from "react";
import RPNInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import "react-phone-number-input/style.css";

/**
 * The phone input, everywhere a phone is typed. A country selector (flag +
 * native <select>, so the handset's own picker opens on mobile) sits beside
 * the number box; the emitted value is E.164 — the exact form the backend
 * stores — or "" while the number is incomplete. Nigeria is preselected, so
 * the familiar "0803 123 4567" keeps working untouched, but any customer can
 * pick their flag (or type +<code>, which switches the flag by itself).
 *
 * Flags come from react-phone-number-input's inline-SVG set rather than the
 * default <img> URLs, so nothing loads from a third-party CDN.
 */

/**
 * A realistic example number for the selected country, in the national
 * format the customer would actually type ("0802 123 4567" for NG,
 * "07400 123456" for GB). A hardcoded Nigerian placeholder would read as
 * wrong the moment someone picks another flag.
 */
function examplePlaceholder(country: Country): string {
	return getExampleNumber(country, examples)?.formatNational() ?? "";
}

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
	const [country, setCountry] = React.useState<Country>("NG");
	return (
		<RPNInput
			value={value || undefined}
			onChange={(next) => onChange(next ?? "")}
			defaultCountry="NG"
			onCountryChange={(next) => setCountry(next ?? "NG")}
			flags={flags}
			countrySelectProps={{ "aria-label": "Country" }}
			inputComponent={inputComponent ?? Input}
			numberInputProps={{
				className: inputClassName,
				placeholder: examplePlaceholder(country),
				...inputProps,
			}}
			className={cn(
				"flex items-stretch gap-2",
				// Restyle the library's country selector as a sibling box that matches
				// the inputs. Structural rules (the invisible <select> overlaying the
				// flag) come from its stylesheet; these override only the cosmetics.
				"[&_.PhoneInputCountry]:m-0 [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:gap-0.5 [&_.PhoneInputCountry]:rounded-lg [&_.PhoneInputCountry]:border [&_.PhoneInputCountry]:border-input [&_.PhoneInputCountry]:px-3",
				"[--PhoneInputCountryFlag-borderColor:transparent] [--PhoneInputCountryFlag-height:0.95rem]",
				"[--PhoneInputCountrySelectArrow-color:var(--muted-foreground)] [--PhoneInputCountrySelectArrow-marginLeft:0.4rem] [--PhoneInputCountrySelectArrow-opacity:1]",
				className,
			)}
		/>
	);
}
