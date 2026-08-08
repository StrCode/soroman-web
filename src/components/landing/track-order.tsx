import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

export default function TrackOrder() {
	const navigate = useNavigate();
	const [reference, setReference] = useState("");

	return (
		<section id="track" className="scroll-mt-20">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground" aria-hidden />
						<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
							Order tracking
						</span>
					</div>
					<h2 className="mt-3 text-xl font-semibold tracking-tight">
						Already ordered?
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Enter the reference from your invoice or SMS to see where your order
						is.
					</p>
				</div>

				<form
					className="w-full max-w-md"
					onSubmit={(e) => {
						e.preventDefault();
						const ref = reference.trim();
						if (ref) void navigate({ to: "/t/$ref", params: { ref } });
					}}
				>
					<Label htmlFor="order-ref" className="sr-only">
						Order reference
					</Label>
					<InputGroup className="h-11 rounded-full bg-background pr-1.5">
						<InputGroupInput
							id="order-ref"
							placeholder="e.g. ORD-8F3A2B1C"
							value={reference}
							onChange={(e) => setReference(e.target.value)}
							className="pl-4 font-medium uppercase tabular-nums placeholder:font-normal placeholder:normal-case"
							autoComplete="off"
						/>
						<InputGroupAddon align="inline-end" className="pr-0">
							<InputGroupButton
								type="submit"
								variant="default"
								size="sm"
								className="rounded-full px-4"
								disabled={!reference.trim()}
							>
								Track order
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</form>
			</div>
		</section>
	);
}
