import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { notificationsApi } from "@/lib/notifications/api";
import { CATEGORY_HINT, categoryLabel } from "@/lib/notifications/categories";
import { notificationKeys } from "@/lib/notifications/keys";
import type {
	CategoryPreference,
	NotificationChannel,
	NotificationPreferencesResult,
	NotificationSettings,
	UpdatePreferencesBody,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const CHANNELS: {
	key: NotificationChannel;
	label: string;
	hint?: string;
}[] = [
	{ key: "inApp", label: "In-app" },
	{ key: "push", label: "Push", hint: "Mobile app" },
	{ key: "email", label: "Email" },
	{ key: "sms", label: "SMS" },
];

const MASTER_TOGGLES: {
	key: keyof Pick<
		NotificationSettings,
		"pushEnabled" | "emailEnabled" | "smsEnabled"
	>;
	label: string;
	hint: string;
}[] = [
	{
		key: "pushEnabled",
		label: "Push notifications",
		hint: "Alerts on your phone when the app is installed",
	},
	{
		key: "emailEnabled",
		label: "Email",
		hint: "Sent to the email on your account",
	},
	{
		key: "smsEnabled",
		label: "SMS",
		hint: "Text messages to your phone number",
	},
];

/** Half-hour slots from 00:00–23:30 as minutes past midnight. */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30);

function formatMinutes(mins: number): string {
	const h = Math.floor(mins / 60) % 24;
	const m = mins % 60;
	const d = new Date();
	d.setHours(h, m, 0, 0);
	return d.toLocaleTimeString("en-NG", {
		hour: "numeric",
		minute: "2-digit",
	});
}

function nearestSlot(mins: number): number {
	return Math.min(1410, Math.round(mins / 30) * 30);
}

export function NotificationSettingsPanel() {
	const queryClient = useQueryClient();

	const { data, isPending, isError, refetch } = useQuery({
		queryKey: notificationKeys.preferences(),
		queryFn: () => notificationsApi.getPreferences(),
	});

	const save = useMutation({
		mutationFn: (body: UpdatePreferencesBody) =>
			notificationsApi.updatePreferences(body),
		onMutate: async (body) => {
			await queryClient.cancelQueries({
				queryKey: notificationKeys.preferences(),
			});
			const previous = queryClient.getQueryData<NotificationPreferencesResult>(
				notificationKeys.preferences(),
			);
			if (previous) {
				queryClient.setQueryData<NotificationPreferencesResult>(
					notificationKeys.preferences(),
					optimisticPreferences(previous, body),
				);
			}
			return { previous };
		},
		onError: (_err, _body, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(notificationKeys.preferences(), ctx.previous);
			}
			toast.error("Couldn't save notification preferences");
		},
		onSuccess: (result) => {
			queryClient.setQueryData(notificationKeys.preferences(), result);
		},
	});

	const reset = useMutation({
		mutationFn: () => notificationsApi.resetPreferences(),
		onSuccess: (result) => {
			queryClient.setQueryData(notificationKeys.preferences(), result);
			toast.success("Notification preferences reset");
		},
		onError: () => {
			toast.error("Couldn't reset preferences");
		},
	});

	if (isPending) {
		return (
			<section className={PANEL} aria-label="Notification preferences">
				<div className="flex flex-col gap-4 px-6 py-5">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</section>
		);
	}

	if (isError || !data) {
		return (
			<section className={PANEL} aria-label="Notification preferences">
				<div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
					<p className="text-sm text-muted-foreground">
						Couldn't load notification preferences.
					</p>
					<Button variant="outline" size="sm" onClick={() => void refetch()}>
						Retry
					</Button>
				</div>
			</section>
		);
	}

	const alwaysOn = new Set(data.alwaysOn);
	const busy = save.isPending || reset.isPending;

	return (
		<section className={PANEL} aria-label="Notification preferences">
			<div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Channels</span>
				<span className="text-xs text-muted-foreground">
					Master switches for every category
				</span>
			</div>

			<ul className="divide-y divide-foreground/10">
				{MASTER_TOGGLES.map(({ key, label, hint }) => (
					<li
						key={key}
						className="flex items-center justify-between gap-4 px-6 py-4"
					>
						<div className="min-w-0">
							<p className="text-sm font-medium">{label}</p>
							<p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
						</div>
						<Switch
							checked={data.settings[key]}
							disabled={busy}
							onCheckedChange={(checked) => save.mutate({ [key]: checked })}
						/>
					</li>
				))}
			</ul>

			<div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-foreground/15 px-6 py-4">
				<span className={MICRO}>By category</span>
				<span className="text-xs text-muted-foreground">
					What each channel can send
				</span>
			</div>

			<div className="overflow-x-auto px-2 pb-2 sm:px-4">
				<table className="w-full min-w-[36rem] text-sm">
					<thead>
						<tr className="text-left text-xs text-muted-foreground">
							<th className="px-4 py-2 font-medium">Category</th>
							{CHANNELS.map((ch) => (
								<th
									key={ch.key}
									className="px-2 py-2 text-center font-medium"
									title={ch.hint}
								>
									{ch.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.preferences.map((row) => {
							const locked = alwaysOn.has(row.category);
							return (
								<tr
									key={row.category}
									className="border-t border-foreground/10"
								>
									<td className="px-4 py-3 align-top">
										<p className="font-medium">{categoryLabel(row.category)}</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{locked
												? "Always on — cannot be muted"
												: (CATEGORY_HINT[row.category] ??
													"Updates in this category")}
										</p>
									</td>
									{CHANNELS.map((ch) => {
										const available = row.available[ch.key];
										const checked = locked ? true : row[ch.key];
										return (
											<td key={ch.key} className="px-2 py-3 text-center">
												{!available && !locked ? (
													<span className="text-xs text-muted-foreground">
														—
													</span>
												) : (
													<Checkbox
														checked={checked}
														disabled={busy || locked || !available}
														aria-label={`${categoryLabel(row.category)} ${ch.label}`}
														onCheckedChange={(next) => {
															if (locked || !available) return;
															save.mutate({
																preferences: [
																	{
																		category: row.category,
																		[ch.key]: next,
																	},
																],
															});
														}}
														className="mx-auto"
													/>
												)}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-foreground/15 px-6 py-4">
				<span className={MICRO}>Quiet hours</span>
				<span className="text-xs text-muted-foreground">
					Mute push & SMS overnight · in-app still arrives
				</span>
			</div>

			<div className="flex flex-col gap-4 px-6 py-4">
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-sm font-medium">Enable quiet hours</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Timezone: {data.settings.timezone || "Africa/Lagos"}
						</p>
					</div>
					<Switch
						checked={data.settings.quietHoursEnabled}
						disabled={busy}
						onCheckedChange={(checked) =>
							save.mutate({ quietHoursEnabled: checked })
						}
					/>
				</div>

				<div
					className={cn(
						"flex flex-wrap items-end gap-4",
						!data.settings.quietHoursEnabled && "opacity-50",
					)}
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="quiet-start" className="text-xs">
							From
						</Label>
						<NativeSelect
							id="quiet-start"
							disabled={busy || !data.settings.quietHoursEnabled}
							value={String(nearestSlot(data.settings.quietHoursStart))}
							onChange={(e) =>
								save.mutate({
									quietHoursStart: Number(e.target.value),
								})
							}
						>
							{TIME_OPTIONS.map((mins) => (
								<NativeSelectOption key={mins} value={String(mins)}>
									{formatMinutes(mins)}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="quiet-end" className="text-xs">
							Until
						</Label>
						<NativeSelect
							id="quiet-end"
							disabled={busy || !data.settings.quietHoursEnabled}
							value={String(nearestSlot(data.settings.quietHoursEnd))}
							onChange={(e) =>
								save.mutate({
									quietHoursEnd: Number(e.target.value),
								})
							}
						>
							{TIME_OPTIONS.map((mins) => (
								<NativeSelectOption key={mins} value={String(mins)}>
									{formatMinutes(mins)}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between gap-4 border-t border-foreground/15 px-6 py-4">
				<p className="text-xs text-muted-foreground">
					Reset clears your overrides and restores catalog defaults.
				</p>
				<Button
					variant="ghost"
					size="sm"
					disabled={busy}
					onClick={() => reset.mutate()}
				>
					{reset.isPending ? (
						<LoaderCircle className="animate-spin" data-icon="inline-start" />
					) : (
						<RotateCcw data-icon="inline-start" />
					)}
					Reset to defaults
				</Button>
			</div>
		</section>
	);
}

function optimisticPreferences(
	prev: NotificationPreferencesResult,
	body: UpdatePreferencesBody,
): NotificationPreferencesResult {
	const settings = { ...prev.settings };
	if (body.pushEnabled !== undefined) settings.pushEnabled = body.pushEnabled;
	if (body.emailEnabled !== undefined)
		settings.emailEnabled = body.emailEnabled;
	if (body.smsEnabled !== undefined) settings.smsEnabled = body.smsEnabled;
	if (body.quietHoursEnabled !== undefined) {
		settings.quietHoursEnabled = body.quietHoursEnabled;
	}
	if (body.quietHoursStart !== undefined) {
		settings.quietHoursStart = body.quietHoursStart;
	}
	if (body.quietHoursEnd !== undefined) {
		settings.quietHoursEnd = body.quietHoursEnd;
	}
	if (body.timezone !== undefined) settings.timezone = body.timezone;

	let preferences = prev.preferences;
	if (body.preferences?.length) {
		const patchByCategory = new Map(
			body.preferences.map((p) => [p.category, p]),
		);
		preferences = prev.preferences.map((row) => {
			const patch = patchByCategory.get(row.category);
			if (!patch) return row;
			return {
				...row,
				...(patch.inApp !== undefined ? { inApp: patch.inApp } : {}),
				...(patch.push !== undefined ? { push: patch.push } : {}),
				...(patch.email !== undefined ? { email: patch.email } : {}),
				...(patch.sms !== undefined ? { sms: patch.sms } : {}),
			} satisfies CategoryPreference;
		});
	}

	return { ...prev, settings, preferences };
}
