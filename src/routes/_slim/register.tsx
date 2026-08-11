import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import AuthShell from "@/components/auth/auth-shell";
import PhoneRegister from "@/components/auth/phone-register";
import { authStore } from "@/lib/auth";

// The explicit doorway, phone-first like the backend: name and phone up
// front, then the SMS code that activates the account. Email + password is
// added later from account settings, never at the door.
export const Route = createFileRoute("/_slim/register")({
	beforeLoad: async () => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RegisterPage,
	head: () => ({
		meta: [
			{ title: "Create account | Soroman Energy" },
			{
				name: "description",
				content:
					"Create a Soroman account with your name and phone. Verify with one SMS code — no password required.",
			},
		],
	}),
});

function RegisterPage() {
	const navigate = useNavigate();
	return (
		<AuthShell>
			<PhoneRegister onSuccess={() => void navigate({ to: "/dashboard" })} />
		</AuthShell>
	);
}
