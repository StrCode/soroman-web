import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, LoaderCircle, Settings } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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

const PANEL_LIST_PARAMS = { unreadOnly: true, limit: 8 } as const;

type Props = {
	onClose: () => void;
	className?: string;
	/**
	 * popover — grow with content, scroll after ~8 rows.
	 * sheet — fill the mobile drawer height.
	 */
	layout?: "popover" | "sheet";
};

export function NotificationPanel({
	onClose,
	className,
	layout = "popover",
}: Props) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const listQuery = useQuery({
		queryKey: notificationKeys.list(PANEL_LIST_PARAMS),
		queryFn: () => notificationsApi.list(PANEL_LIST_PARAMS),
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
	const totalUnread = listQuery.data?.pagination.total ?? unreadCount;

	const onSelect = (notification: Notification) => {
		const path = hrefToPath(resolveNotificationHref(notification));
		onClose();

		if (!notification.read) {
			markRead.mutate(notification.id);
		}

		void router.history.push(path);
	};

	const goToInbox = () => {
		onClose();
		void router.history.push("/dashboard/notifications");
	};

	return (
		<div
			className={cn(
				"flex flex-col",
				layout === "sheet" && "min-h-0 flex-1",
				className,
			)}
		>
			<div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
				<div>
					<p className="text-sm font-medium">Notifications</p>
					<p className="text-xs text-muted-foreground">
						{unreadCount > 0 ? `${unreadCount} unread` : "You're up to date"}
					</p>
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

			<div
				className={cn(
					"min-h-0",
					layout === "sheet"
						? "flex-1 overflow-y-auto"
						: "max-h-[20rem] overflow-y-auto",
				)}
			>
				{listQuery.isLoading ? (
					<div className="flex flex-col gap-1 px-1 py-1">
						{Array.from({ length: 3 }, (_, i) => (
							<div key={i} className="flex gap-2.5 px-2 py-2">
								<Skeleton className="size-6 rounded-md" />
								<div className="flex flex-1 flex-col gap-1.5">
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-2.5 w-full" />
								</div>
							</div>
						))}
					</div>
				) : listQuery.isError ? (
					<div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
						<p className="text-sm text-muted-foreground">
							Couldn't load notifications.
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
					<Empty className="border-0 py-8">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Bell />
							</EmptyMedia>
							<EmptyTitle>No unread notifications</EmptyTitle>
							<EmptyDescription>
								Order updates and payments will show up here.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="flex flex-col gap-0.5 px-0.5">
						{items.map((notification) => (
							<li key={notification.id}>
								<NotificationItem
									notification={notification}
									onSelect={onSelect}
									compact
								/>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="shrink-0 border-t border-border pt-2">
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-center text-muted-foreground"
					onClick={goToInbox}
				>
					{totalUnread > items.length
						? `View all notifications (${totalUnread})`
						: "View all notifications"}
				</Button>
			</div>
		</div>
	);
}
