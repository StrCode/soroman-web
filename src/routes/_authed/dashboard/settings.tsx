import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
// Devices section hidden for now — restore this import with the section below.
// import {
//   ActiveSessionsPanel,
//   TrustedDevicesPanel,
// } from "@/components/account/devices-panel";
import { DeleteAccountPanel } from "@/components/account/delete-account-panel";
import { SecurityPanel } from "@/components/account/security-panel";
import { MICRO } from "@/components/dashboard/panel";
import { NotificationSettingsPanel } from "@/components/notifications/settings-panel";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/dashboard/settings")({
	component: SettingsPage,
	head: () => ({
		meta: [
			{ title: "Settings | Soroman Energy" },
			{
				name: "description",
				content:
					"Manage sign-in methods, notification preferences, and account security for your Soroman account.",
			},
		],
	}),
});

function SettingsPage() {
	const auth = useAuth();
	const hash = useRouterState({ select: (s) => s.location.hash });

	useEffect(() => {
		if (hash !== "#notifications" && hash !== "#delete-account") return;
		document
			.getElementById(hash.slice(1))
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [hash]);

	if (auth.status !== "authed") return null;

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="snapshot-rise" style={{ animationDelay: "0ms" }}>
				<div className="flex items-center gap-4">
					<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
					<span className={cn(MICRO, "text-muted-foreground")}>Settings</span>
				</div>
				<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
					Your{" "}
					<em className="font-semibold text-accent not-italic">settings</em>.
				</h1>
				<p className="mt-3 max-w-lg text-sm text-muted-foreground">
					How you sign in, and how we reach you.
				</p>
			</header>

			<div className="mt-10 space-y-10">
				<SettingsGroup
					label="Sign-in"
					hint="How you get into your account"
					delay="90ms"
				>
					<SecurityPanel />
				</SettingsGroup>

				<SettingsGroup
					id="notifications"
					label="Notifications"
					hint="Channels, categories, and quiet hours"
					delay="160ms"
				>
					<NotificationSettingsPanel />
				</SettingsGroup>

				<SettingsGroup label="Account" hint="Permanent removal" delay="230ms">
					<DeleteAccountPanel />
				</SettingsGroup>

				{/* Devices section hidden for now. To restore: uncomment this block,
            the devices-panel import above, and the data queries in
            components/account/devices-panel.tsx.
        <SettingsGroup
          label="Devices"
          hint="Trusted browsers and open sessions"
          delay="230ms"
        >
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <TrustedDevicesPanel />
            <ActiveSessionsPanel />
          </div>
        </SettingsGroup> */}
			</div>
		</div>
	);
}

function SettingsGroup({
	id,
	label,
	hint,
	delay,
	children,
}: {
	id?: string;
	label: string;
	hint: string;
	delay: string;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			className="snapshot-rise scroll-mt-8"
			style={{ animationDelay: delay }}
		>
			<div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 className={cn(MICRO, "text-muted-foreground")}>{label}</h2>
				<p className="text-xs text-muted-foreground">{hint}</p>
			</div>
			{children}
		</section>
	);
}
