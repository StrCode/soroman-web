// useQuery is only needed by the disabled identities/sessions fetches below.
// import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ApiError,
	type AuthSession,
	api,
	type Identities,
	type TrustedDevice,
} from "@/lib/api";
import { authStore } from "@/lib/auth";
import { deviceName, formatDeviceLabel } from "@/lib/device";

/**
 * Stand-in for the disabled queries below: typed like useQuery's `data`,
 * always empty. A plain `undefined` const would be narrowed to `never` at the
 * use sites; a function return keeps the union type intact.
 */
function disabledQueryData<T>(): T | undefined {
	return undefined;
}

const whenText = (iso: string | null) => {
	if (!iso) return "";
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.round(diff / 60_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} min ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs} hr ago`;
	return new Date(iso).toLocaleDateString("en-NG", {
		day: "numeric",
		month: "short",
	});
};

function ThisDeviceChip() {
	return (
		<span className="rounded-full border border-accent/40 px-2 py-0.5 text-[0.6rem] tracking-[0.12em] whitespace-nowrap text-accent uppercase">
			This device
		</span>
	);
}

/**
 * Browsers that passed an OTP step-up and can sign in with a PIN.
 * Own panel on Settings — separate from sign-in methods and sessions.
 */
export function TrustedDevicesPanel() {
	const queryClient = useQueryClient();
	// The Devices section is hidden from Settings for now, so its data fetches
	// are disabled with it. To restore, swap the stubs below for these queries
	// (and re-enable the section + import in routes/_authed/dashboard/settings.tsx).
	// const { data: identities, isPending } = useQuery({
	//   queryKey: ["identities"],
	//   queryFn: api.me.identities,
	//   staleTime: 30_000,
	// });
	// const { data: sessions } = useQuery({
	//   queryKey: ["sessions"],
	//   queryFn: api.me.sessions,
	//   staleTime: 30_000,
	// });
	const identities = disabledQueryData<Identities>();
	const sessions = disabledQueryData<AuthSession[]>();
	const isPending = false;

	const devices = identities?.trustedDevices ?? [];
	const currentSession = sessions?.find((s) => s.current);
	const refresh = () =>
		void queryClient.invalidateQueries({ queryKey: ["identities"] });

	return (
		<section className={PANEL} aria-label="Trusted devices">
			<div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Trusted devices</span>
				<span className="text-xs text-muted-foreground">PIN without SMS</span>
			</div>

			{isPending ? (
				<DeviceListSkeleton />
			) : (
				<TrustedDeviceList
					devices={devices}
					currentSession={currentSession}
					onChange={refresh}
				/>
			)}
		</section>
	);
}

/**
 * Every place the account is currently signed in.
 */
export function ActiveSessionsPanel() {
	const queryClient = useQueryClient();
	// Disabled with the hidden Devices section — see TrustedDevicesPanel above.
	// const { data: sessions, isPending } = useQuery({
	//   queryKey: ["sessions"],
	//   queryFn: api.me.sessions,
	//   staleTime: 30_000,
	// });
	const sessions = disabledQueryData<AuthSession[]>();
	const isPending = false;
	const [revoking, setRevoking] = useState<number | "others" | "here" | null>(
		null,
	);
	const others = sessions?.filter((s) => !s.current) ?? [];

	const refresh = () =>
		void queryClient.invalidateQueries({ queryKey: ["sessions"] });

	const revoke = async (id: number) => {
		setRevoking(id);
		try {
			await api.me.revokeSession(id);
			toast.success("Signed out that device");
			refresh();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Couldn't sign it out. Try again.",
			);
		} finally {
			setRevoking(null);
		}
	};

	const revokeOthers = async () => {
		setRevoking("others");
		try {
			const count = await api.me.revokeOtherSessions();
			toast.success(
				count === 1
					? "Signed out 1 other device"
					: `Signed out ${count} other devices`,
			);
			refresh();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Couldn't sign them out. Try again.",
			);
			refresh();
		} finally {
			setRevoking(null);
		}
	};

	const signOutHere = async () => {
		setRevoking("here");
		try {
			await authStore.logout();
			window.location.assign("/");
		} catch {
			setRevoking(null);
			toast.error("Couldn't sign out. Try again.");
		}
	};

	return (
		<section className={PANEL} aria-label="Active sessions">
			<div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Active sessions</span>
				{!isPending && others.length > 0 ? (
					<button
						type="button"
						className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
						disabled={revoking !== null}
						onClick={() => void revokeOthers()}
					>
						{revoking === "others" ? "Signing out…" : "Sign out others"}
					</button>
				) : (
					<span className="text-xs text-muted-foreground">
						Where you're signed in
					</span>
				)}
			</div>

			{isPending ? (
				<DeviceListSkeleton />
			) : !sessions || sessions.length === 0 ? (
				<p className="px-6 py-5 text-sm text-muted-foreground">
					No active sessions.
				</p>
			) : (
				<ul>
					{sessions.map((s, i) => (
						<li
							key={s.id}
							className={
								i === 0
									? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4"
									: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-foreground/15 px-6 py-4"
							}
						>
							<div className="min-w-0">
								<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
									<span className="truncate">
										{formatDeviceLabel(s.deviceName, s.userAgent)}
									</span>
									{s.current && <ThisDeviceChip />}
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
									{[
										s.ipAddress,
										s.lastUsedAt ? `active ${whenText(s.lastUsedAt)}` : null,
									]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</div>
							{s.current ? (
								<button
									type="button"
									className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
									disabled={revoking !== null}
									onClick={() => void signOutHere()}
								>
									{revoking === "here" ? "Signing out…" : "Sign out"}
								</button>
							) : (
								<button
									type="button"
									className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
									disabled={revoking !== null}
									onClick={() => void revoke(s.id)}
								>
									{revoking === s.id ? "Signing out…" : "Sign out"}
								</button>
							)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function TrustedDeviceList({
	devices,
	currentSession,
	onChange,
}: {
	devices: TrustedDevice[];
	currentSession?: AuthSession;
	onChange: () => void;
}) {
	const [revoking, setRevoking] = useState<number | "all" | null>(null);
	const thisLabel = formatDeviceLabel(deviceName());
	const sessionLabel = currentSession
		? formatDeviceLabel(currentSession.deviceName, currentSession.userAgent)
		: null;

	const isThisDevice = (d: TrustedDevice) => {
		const label = formatDeviceLabel(d.deviceName);
		if (sessionLabel && label === sessionLabel) return true;
		return api.auth.hasTrustedDevice() && label === thisLabel;
	};

	const revoke = async (id: number, clearLocal: boolean) => {
		setRevoking(id);
		try {
			await api.me.revokeDevice(id);
			if (clearLocal) api.auth.clearTrustedDevice();
			toast.success("Device removed");
			onChange();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Couldn't remove it. Try again.",
			);
		} finally {
			setRevoking(null);
		}
	};

	const revokeAll = async () => {
		setRevoking("all");
		try {
			await Promise.all(devices.map((d) => api.me.revokeDevice(d.id)));
			api.auth.clearTrustedDevice();
			toast.success("All trusted devices removed");
			onChange();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Couldn't remove them. Try again.",
			);
			onChange();
		} finally {
			setRevoking(null);
		}
	};

	if (devices.length === 0) {
		return (
			<p className="px-6 py-5 text-sm text-muted-foreground">
				None yet. Choose “remember this device” at sign-in to skip the code with
				a PIN.
			</p>
		);
	}

	return (
		<>
			{devices.length > 1 && (
				<div className="flex justify-end border-b border-foreground/15 px-6 py-3">
					<button
						type="button"
						className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
						disabled={revoking !== null}
						onClick={() => void revokeAll()}
					>
						{revoking === "all" ? "Removing…" : "Remove all"}
					</button>
				</div>
			)}
			<ul>
				{devices.map((d, i) => {
					const here = isThisDevice(d);
					return (
						<li
							key={d.id}
							className={
								i === 0
									? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4"
									: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-foreground/15 px-6 py-4"
							}
						>
							<div className="min-w-0">
								<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
									<span className="truncate">
										{formatDeviceLabel(d.deviceName)}
									</span>
									{here && <ThisDeviceChip />}
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{d.lastUsedAt
										? `Last used ${whenText(d.lastUsedAt)}`
										: "Not used yet"}
								</p>
							</div>
							<button
								type="button"
								className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
								disabled={revoking !== null}
								onClick={() => void revoke(d.id, here)}
							>
								{revoking === d.id ? "Removing…" : "Remove"}
							</button>
						</li>
					);
				})}
			</ul>
		</>
	);
}

function DeviceListSkeleton() {
	return (
		<div className="space-y-4 px-6 py-5" aria-busy="true">
			<div className="space-y-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-3 w-56" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-3 w-48" />
			</div>
		</div>
	);
}
