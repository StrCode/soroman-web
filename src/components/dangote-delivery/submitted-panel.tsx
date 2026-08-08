import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
	type DangoteOrderRequest,
	formatDangoteQuantity,
} from "@/lib/dangote-delivery/types";

/**
 * What the customer sees the moment their request lands as Pending Review:
 * the request number to hold on to, and where the answer will appear.
 */
export default function SubmittedPanel({
	request,
}: {
	request: DangoteOrderRequest;
}) {
	return (
		<div className="py-6 text-center">
			<CheckCircle2 className="mx-auto size-10 text-accent" aria-hidden />
			<h2 className="mt-4 text-xl font-semibold tracking-tight">
				Order request submitted
			</h2>
			<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
				Your request for{" "}
				<span className="font-medium text-foreground tabular-nums">
					{formatDangoteQuantity(request.quantity, request.quantityUnit)} of{" "}
					{request.product}
				</span>{" "}
				is with the Dangote team. They'll review and price your order — it
				appears on your dashboard, and you pay only if you accept it.
			</p>

			<p className="mt-6 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
				Request number
			</p>
			<p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
				{request.requestNumber}
			</p>

			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Button
					nativeButton={false}
					render={
						<Link
							to="/dashboard/dangote-delivery/$orderId"
							params={{ orderId: String(request.id) }}
						/>
					}
				>
					Track this request
				</Button>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link to="/dashboard/dangote-delivery" />}
				>
					All Dangote orders
				</Button>
			</div>
		</div>
	);
}
