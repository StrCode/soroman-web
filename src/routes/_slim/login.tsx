import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AuthShell from "@/components/auth/auth-shell";
import OtpLogin from "@/components/auth/otp-login";
import PinLogin from "@/components/auth/pin-login";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth";

const searchSchema = z.object({
	// Only ever an internal path. Anything else (an absolute URL, a
	// protocol-relative "//evil.com") is dropped so a crafted ?redirect can't
	// bounce a freshly signed-in customer off-site.
	redirect: z
		.string()
		.optional()
		.transform((v) =>
			v?.startsWith("/") && !v.startsWith("//") ? v : undefined,
		),
});

export const Route = createFileRoute("/_slim/login")({
	validateSearch: searchSchema,
	beforeLoad: async ({ search }) => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			throw redirect({ to: search.redirect ?? "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const { redirect: redirectTo } = Route.useSearch();
	// A PIN is the only credential, and it needs a device this browser has
	// already proven by OTP. So a trusted device goes straight to the PIN box;
	// everyone else starts at the phone OTP, which is what mints the trust.
	const trusted = api.auth.hasTrustedDevice();
	const [method, setMethod] = useState<"phone" | "pin">(() =>
		trusted ? "pin" : "phone",
	);
	const done = () => void navigate({ to: redirectTo ?? "/dashboard" });

	return (
		<AuthShell>
			{method === "pin" ? (
				<PinLogin onSuccess={done} onUseCode={() => setMethod("phone")} />
			) : (
				<OtpLogin
					onSuccess={done}
					// Only worth offering the way back if a PIN can actually work here.
					onSwitchMethod={trusted ? () => setMethod("pin") : undefined}
				/>
			)}
			<div className="mt-6 flex items-center justify-center gap-2 border-t border-foreground/10 pt-5">
				<span className="text-xs text-muted-foreground">New to Soroman?</span>
				<Button
					size="sm"
					variant="outline"
					nativeButton={false}
					render={<Link to="/register">Create an account</Link>}
				/>
			</div>
		</AuthShell>
	);
}
