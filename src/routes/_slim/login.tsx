import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AuthShell from "@/components/auth/auth-shell";
import EmailLogin from "@/components/auth/email-login";
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
	// A trusted device gets the fastest path first — a PIN. Otherwise phone is
	// the door people know; email is a quiet toggle away. All land in the same
	// session. See the auth flow map.
	const [method, setMethod] = useState<"phone" | "email" | "pin">(() =>
		api.auth.hasTrustedDevice() ? "pin" : "phone",
	);
	const done = () => void navigate({ to: redirectTo ?? "/dashboard" });

	return (
		<AuthShell>
			{method === "pin" ? (
				<PinLogin onSuccess={done} onUseCode={() => setMethod("phone")} />
			) : method === "phone" ? (
				<OtpLogin onSuccess={done} onSwitchMethod={() => setMethod("email")} />
			) : (
				<EmailLogin
					onSuccess={done}
					onSwitchMethod={() => setMethod("phone")}
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
