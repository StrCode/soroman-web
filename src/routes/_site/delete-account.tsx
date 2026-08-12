import { createFileRoute, Link } from "@tanstack/react-router";

import { useAuth } from "@/lib/auth";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/company";

export const Route = createFileRoute("/_site/delete-account")({
	component: DeleteAccountPage,
	head: () => ({
		meta: [
			{ title: "Delete account | Soroman Energy" },
			{
				name: "description",
				content:
					"How to delete your Soroman account and personal data from the app or the website.",
			},
		],
	}),
});

const STEPS = [
	{
		title: "In the Soroman app",
		body: "Open the app while signed in, go to Settings, choose Delete account, and enter the one-time code sent to your phone.",
	},
	{
		title: "On this website",
		body: "Sign in, open Settings, choose Delete account, then confirm with the SMS code we send to your phone.",
	},
	{
		title: "If you cannot sign in",
		body: `Email ${SUPPORT_EMAIL} from the phone number or email on the account. We verify the request, then delete what we are not legally required to keep.`,
	},
] as const;

const AFTER = [
	"Your login, profile, notification preferences, and saved order defaults are removed.",
	"You must spend any wallet balance, cancel unpaid orders, and wait for paid orders to complete at the depot first — otherwise deletion is refused.",
	"We may keep invoices, payment records, and fulfilment logs for accounting, tax, dispute, and regulatory requirements.",
	"Deletion is permanent. To order again later you create a new account.",
] as const;

function DeleteAccountPage() {
	const auth = useAuth();
	const signedIn = auth.status === "authed";

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Account
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Delete your account.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				{COMPANY_NAME} lets you permanently delete your Soroman account and the
				personal data we are not required to keep. You can start that from the
				app or this website.
			</p>

			<div className="mt-10">
				{signedIn ? (
					<Link
						to="/dashboard/settings"
						hash="delete-account"
						className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						Go to Settings to delete
					</Link>
				) : (
					<Link
						to="/login"
						search={{ redirect: "/dashboard/settings" }}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						Sign in to delete your account
					</Link>
				)}
			</div>

			<div className="mt-16 max-w-3xl">
				<section className="border-t border-border border-t-foreground py-8">
					<h2 className="text-xl leading-snug">
						<span className="text-muted-foreground tabular-nums">01</span> How
						to delete
					</h2>
					<ol className="mt-6 flex flex-col gap-6">
						{STEPS.map((step, index) => (
							<li key={step.title} className="flex gap-4">
								<span
									className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-xs tabular-nums"
									aria-hidden
								>
									{index + 1}
								</span>
								<div>
									<p className="text-sm font-medium">{step.title}</p>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
										{step.body}
									</p>
								</div>
							</li>
						))}
					</ol>
				</section>

				<section className="border-t border-border py-8">
					<h2 className="text-xl leading-snug">
						<span className="text-muted-foreground tabular-nums">02</span> What
						happens after
					</h2>
					<ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
						{AFTER.map((line) => (
							<li key={line} className="flex gap-3">
								<span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
								<span>{line}</span>
							</li>
						))}
					</ul>
				</section>
			</div>

			<div className="mt-12 border-t border-foreground pt-8">
				<p className="text-sm text-muted-foreground">
					Also see our{" "}
					<Link
						to="/privacy"
						className="text-accent underline-offset-4 hover:underline"
					>
						privacy policy
					</Link>
					, or{" "}
					<Link
						to="/contact"
						className="text-accent underline-offset-4 hover:underline"
					>
						contact the desk
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
