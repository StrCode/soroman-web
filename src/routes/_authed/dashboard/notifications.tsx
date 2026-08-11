import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, LoaderCircle, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { NotificationItem } from "@/components/notifications/item";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationsApi } from "@/lib/notifications/api";
import { applyMarkAllRead, applyMarkOneRead } from "@/lib/notifications/cache";
import { categoryLabel } from "@/lib/notifications/categories";
import {
	hrefToPath,
	resolveNotificationHref,
} from "@/lib/notifications/deep-link";
import { notificationKeys } from "@/lib/notifications/keys";
import type {
	Notification,
	NotificationCategory,
	NotificationsListResult,
	UnreadCountResult,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/dashboard/notifications")({
	component: NotificationsPage,
	head: () => ({
		meta: [
			{ title: "Notifications | Soroman Energy" },
			{
				name: "description",
				content:
					"Your Soroman inbox — order, payment, delivery, and account updates.",
			},
		],
	}),
});

const PAGE_SIZE = 20;

const CATEGORY_FILTERS: Array<NotificationCategory | "all"> = [
	"all",
	"orders",
	"payments",
	"delivery",
	"tickets",
	"account",
	"security",
	"system",
];

type ReadFilter = "all" | "unread";

function NotificationsPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [readFilter, setReadFilter] = useState<ReadFilter>("all");
	const [category, setCategory] = useState<NotificationCategory | "all">("all");
	const [page, setPage] = useState(1);

	const listParams = {
		page,
		limit: PAGE_SIZE,
		unreadOnly: readFilter === "unread",
		category,
	};

	const listQuery = useQuery({
		queryKey: notificationKeys.list(listParams),
		queryFn: () => notificationsApi.list(listParams),
	});

	const unreadQuery = useQuery({
		queryKey: notificationKeys.unread(),
		queryFn: () => notificationsApi.unreadCount(),
	});

	const markRead = useMutation({
		mutationFn: (id: number) => notificationsApi.markRead(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: notificationKeys.all });
			const previousLists = queryClient.getQueriesData<NotificationsListResult>(
				{ queryKey: [...notificationKeys.all, "list"] },
			);
			const previousUnread = queryClient.getQueryData<UnreadCountResult>(
				notificationKeys.unread(),
			);
			applyMarkOneRead(queryClient, id);
			return { previousLists, previousUnread };
		},
		onError: (_err, _id, ctx) => {
			if (!ctx) return;
			for (const [key, data] of ctx.previousLists) {
				queryClient.setQueryData(key, data);
			}
			queryClient.setQueryData(notificationKeys.unread(), ctx.previousUnread);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
		},
	});

	const markAllRead = useMutation({
		mutationFn: () =>
			notificationsApi.markAllRead(
				category === "all" ? undefined : { category },
			),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: notificationKeys.all });
			const previousLists = queryClient.getQueriesData<NotificationsListResult>(
				{ queryKey: [...notificationKeys.all, "list"] },
			);
			const previousUnread = queryClient.getQueryData<UnreadCountResult>(
				notificationKeys.unread(),
			);
			applyMarkAllRead(queryClient);
			return { previousLists, previousUnread };
		},
		onSuccess: () => {
			toast.success("All notifications marked as read");
		},
		onError: (_err, _v, ctx) => {
			if (ctx) {
				for (const [key, data] of ctx.previousLists) {
					queryClient.setQueryData(key, data);
				}
				queryClient.setQueryData(notificationKeys.unread(), ctx.previousUnread);
			}
			toast.error("Couldn't mark notifications as read");
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
		},
	});

	const unreadCount = unreadQuery.data?.unreadCount ?? 0;
	const items = listQuery.data?.notifications ?? [];
	const pagination = listQuery.data?.pagination;
	const pages = pagination?.pages ?? 1;

	const onSelect = (notification: Notification) => {
		if (!notification.read) {
			markRead.mutate(notification.id);
		}
		void router.history.push(hrefToPath(resolveNotificationHref(notification)));
	};

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="snapshot-rise" style={{ animationDelay: "0ms" }}>
				<div className="flex items-center gap-4">
					<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
					<span className={cn(MICRO, "text-muted-foreground")}>
						Notifications
					</span>
				</div>
				<div className="mt-5 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-3xl leading-[1.05] tracking-tight md:text-4xl">
							Your{" "}
							<em className="font-semibold text-accent not-italic">inbox</em>.
						</h1>
						<p className="mt-3 max-w-lg text-sm text-muted-foreground">
							{unreadCount > 0
								? `${unreadCount} unread · order, payment, and account updates`
								: "Order, payment, and account updates land here."}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								void router.history.push("/dashboard/settings#notifications")
							}
						>
							<Settings data-icon="inline-start" />
							Preferences
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={unreadCount === 0 || markAllRead.isPending}
							onClick={() => markAllRead.mutate()}
						>
							{markAllRead.isPending ? (
								<LoaderCircle
									className="animate-spin"
									data-icon="inline-start"
								/>
							) : (
								<CheckCheck data-icon="inline-start" />
							)}
							Mark all read
						</Button>
					</div>
				</div>
			</header>

			<section
				className="snapshot-rise mt-10"
				style={{ animationDelay: "90ms" }}
			>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<Tabs
						value={readFilter}
						onValueChange={(value) => {
							if (value === "all" || value === "unread") {
								setReadFilter(value);
								setPage(1);
							}
						}}
					>
						<TabsList variant="line">
							<TabsTrigger value="all">All</TabsTrigger>
							<TabsTrigger value="unread">
								Unread
								{unreadCount > 0 ? (
									<span className="ml-1 rounded-full bg-muted px-1.5 text-[0.65rem] text-muted-foreground tabular-nums">
										{unreadCount > 99 ? "99+" : unreadCount}
									</span>
								) : null}
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<NativeSelect
						value={category}
						aria-label="Filter by category"
						onChange={(e) => {
							const next = e.target.value as NotificationCategory | "all";
							setCategory(next);
							setPage(1);
						}}
					>
						{CATEGORY_FILTERS.map((key) => (
							<NativeSelectOption key={key} value={key}>
								{key === "all" ? "All categories" : categoryLabel(key)}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>

				<div className={PANEL}>
					{listQuery.isLoading ? (
						<ul className="divide-y divide-foreground/10">
							{Array.from({ length: 6 }, (_, i) => (
								<li key={i} className="flex gap-3 px-4 py-3 sm:px-6">
									<Skeleton className="size-7 rounded-md" />
									<div className="flex flex-1 flex-col gap-2">
										<Skeleton className="h-3.5 w-1/2" />
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-2.5 w-1/4" />
									</div>
								</li>
							))}
						</ul>
					) : listQuery.isError ? (
						<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
							<p className="text-sm text-muted-foreground">
								Couldn't load notifications. Try again in a moment.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void listQuery.refetch()}
							>
								Retry
							</Button>
						</div>
					) : items.length === 0 ? (
						<Empty className="border-0 py-16">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Bell />
								</EmptyMedia>
								<EmptyTitle>
									{readFilter === "unread"
										? "No unread notifications"
										: "No notifications yet"}
								</EmptyTitle>
								<EmptyDescription>
									{readFilter === "unread"
										? "You're caught up. Switch to All to browse history."
										: "Order updates, payments, and account alerts will show up here."}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ul className="divide-y divide-foreground/10">
							{items.map((notification) => (
								<li key={notification.id}>
									<NotificationItem
										notification={notification}
										onSelect={onSelect}
									/>
								</li>
							))}
						</ul>
					)}

					{pagination && pages > 1 ? (
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/15 px-4 py-3 sm:px-6">
							<p className="text-xs text-muted-foreground tabular-nums">
								Page {pagination.page} of {pages} · {pagination.total}{" "}
								{pagination.total === 1 ? "notification" : "notifications"}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= pages}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					) : null}
				</div>
			</section>
		</div>
	);
}
