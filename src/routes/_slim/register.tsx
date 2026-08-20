import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import AuthShell from "@/components/auth/auth-shell";
import PhoneRegister from "@/components/auth/phone-register";
import { authStore } from "@/lib/auth";

const searchSchema = z.object({
	// Carried over from the login screen when someone tries to sign in with a
	// number that has no account — prefilled here so they don't retype it.
	phone: z.string().optional(),
});

// The explicit doorway, phone-first like the backend: name and phone up
// front, then the SMS code that activates the account. Email + password is
// added later from account settings, never at the door.
export const Route = createFileRoute("/_slim/register")({
	validateSearch: searchSchema,
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
	const { phone } = Route.useSearch();
	return (
		<AuthShell>
			<PhoneRegister
				initialPhone={phone}
				onSuccess={() => void navigate({ to: "/dashboard" })}
			/>
		</AuthShell>
	);
}
