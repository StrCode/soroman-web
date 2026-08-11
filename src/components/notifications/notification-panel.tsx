import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, LoaderCircle, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationsApi } from "@/lib/notifications/api";
import { applyMarkAllRead, applyMarkOneRead } from "@/lib/notifications/cache";
import { hrefToPath, resolveNotificationHref } from "@/lib/notifications/href";
import { notificationKeys } from "@/lib/notifications/keys";
import type {
	Notification,
	NotificationsListResult,
	UnreadCountResult,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

type Props = {
	onClose: () => void;
	className?: string;
};

export function NotificationPanel({ onClose, className }: Props) {
	const [filter, setFilter] = useState<Filter>("all");
	const router = useRouter();
	const queryClient = useQueryClient();

	const listQuery = useQuery({
		queryKey: notificationKeys.list({
			unreadOnly: filter === "unread",
			limit: 20,
		}),
		queryFn: () =>
			notificationsApi.list({
				unreadOnly: filter === "unread",
				limit: 20,
			}),
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
		mutationFn: () => notificationsApi.markAllRead(),
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

	const onSelect = (notification: Notification) => {
		const path = hrefToPath(resolveNotificationHref(notification));
		onClose();

		if (!notification.read) {
			markRead.mutate(notification.id);
		}

		void router.history.push(path);
	};

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<div className="flex items-center justify-between gap-2 px-1 pb-2">
				<div>
					<p className="text-sm font-medium">Notifications</p>
					{unreadCount > 0 ? (
						<p className="text-xs text-muted-foreground">
							{unreadCount} unread
						</p>
					) : (
						<p className="text-xs text-muted-foreground">You're up to date</p>
					)}
				</div>
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Notification settings"
						onClick={() => {
							onClose();
							void router.history.push("/dashboard/settings#notifications");
						}}
					>
						<Settings />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						disabled={unreadCount === 0 || markAllRead.isPending}
						onClick={() => markAllRead.mutate()}
					>
						{markAllRead.isPending ? (
							<LoaderCircle className="animate-spin" data-icon="inline-start" />
						) : (
							<CheckCheck data-icon="inline-start" />
						)}
						Mark all read
					</Button>
				</div>
			</div>

			<Tabs
				value={filter}
				onValueChange={(value) => {
					if (value === "all" || value === "unread") setFilter(value);
				}}
				className="flex min-h-0 flex-1 flex-col gap-2"
			>
				<TabsList variant="line" className="w-full justify-start px-1">
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

				<TabsContent
					value={filter}
					className="mt-0 flex min-h-0 flex-1 flex-col"
				>
					{listQuery.isLoading ? (
						<div className="flex flex-col gap-2 px-1 py-2">
							{Array.from({ length: 4 }, (_, i) => (
								<div key={i} className="flex gap-3 px-2 py-2">
									<Skeleton className="size-8 rounded-lg" />
									<div className="flex flex-1 flex-col gap-2">
										<Skeleton className="h-3.5 w-3/4" />
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-2.5 w-1/3" />
									</div>
								</div>
							))}
						</div>
					) : listQuery.isError ? (
						<div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
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
						<Empty className="border-0 py-10">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Bell />
								</EmptyMedia>
								<EmptyTitle>
									{filter === "unread"
										? "No unread notifications"
										: "You're all caught up"}
								</EmptyTitle>
								<EmptyDescription>
									{filter === "unread"
										? "New order and payment updates will show up here."
										: "Order updates, payments, and account alerts land here."}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ScrollArea className="h-[min(24rem,55vh)]">
							<ul className="flex flex-col gap-0.5 px-0.5 pb-1">
								{items.map((notification) => (
									<li key={notification.id}>
										<NotificationItem
											notification={notification}
											onSelect={onSelect}
										/>
									</li>
								))}
							</ul>
						</ScrollArea>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
