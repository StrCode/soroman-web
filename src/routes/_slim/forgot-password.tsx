import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import AuthShell from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/_slim/forgot-password")({
	beforeLoad: async () => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			throw redirect({ to: "/" });
		}
	},
	component: ForgotPasswordPage,
});

/**
 * There is no email password-reset — accounts are anchored to a phone, so the
 * reliable way back in is always the phone OTP. This page says exactly that
 * and sends the customer to phone sign-in; they can set a fresh password
 * afterwards from Account → Sign-in methods. Kept as a route so the "Forgot?"
 * link and any bookmarks land somewhere that explains, rather than 404.
 */
function ForgotPasswordPage() {
	const navigate = useNavigate();

	return (
		<AuthShell>
			<div className="grid gap-6">
				<div className="flex size-11 items-center justify-center rounded-full border border-foreground/15">
					<KeyRound className="size-5 text-accent" />
				</div>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Forgot your password?
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						No reset needed. Your account is tied to your phone, so just sign in
						with a one-time code — then set a new password under{" "}
						<span className="font-medium text-foreground">
							Account → Sign-in methods
						</span>{" "}
						if you'd like one.
					</p>
				</div>
				<Button size="lg" onClick={() => void navigate({ to: "/login" })}>
					Sign in with your phone
				</Button>
				<p className="text-xs text-muted-foreground">
					Remembered it?{" "}
					<Link
						to="/login"
						className="underline underline-offset-4 hover:text-foreground"
					>
						Back to sign in
					</Link>
					.
				</p>
			</div>
		</AuthShell>
	);
}
