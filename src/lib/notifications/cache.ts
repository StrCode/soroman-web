import type { QueryClient } from "@tanstack/react-query";

import { notificationKeys } from "./keys";
import type {
	Notification,
	NotificationsListParams,
	NotificationsListResult,
	UnreadCountResult,
} from "./types";

function listParams(queryKey: readonly unknown[]): NotificationsListParams {
	const maybe = queryKey[2];
	if (maybe && typeof maybe === "object") {
		return maybe as NotificationsListParams;
	}
	return {};
}

function forEachList(
	queryClient: QueryClient,
	update: (
		prev: NotificationsListResult,
		params: NotificationsListParams,
	) => NotificationsListResult,
) {
	const entries = queryClient.getQueriesData<NotificationsListResult>({
		queryKey: [...notificationKeys.all, "list"],
	});

	for (const [queryKey, prev] of entries) {
		if (!prev) continue;
		queryClient.setQueryData(queryKey, update(prev, listParams(queryKey)));
	}
}

export function applyUnreadCount(
	queryClient: QueryClient,
	unreadCount: number,
) {
	queryClient.setQueryData<UnreadCountResult>(
		notificationKeys.unread(),
		(prev) => ({
			unreadCount,
			byCategory: prev?.byCategory ?? {},
		}),
	);
}

/** A new inbox row arrived over SSE — bump badge and prepend into open lists. */
export function applyIncomingNotification(
	queryClient: QueryClient,
	notification: Notification,
	unreadCount: number,
) {
	applyUnreadCount(queryClient, unreadCount);

	forEachList(queryClient, (prev, params) => {
		if (prev.notifications.some((n) => n.id === notification.id)) {
			return { ...prev, unreadCount };
		}
		if (params.unreadOnly && notification.read) {
			return { ...prev, unreadCount };
		}
		return {
			...prev,
			notifications: [notification, ...prev.notifications],
			unreadCount,
			pagination: {
				...prev.pagination,
				total: prev.pagination.total + 1,
			},
		};
	});
}

/** Read state changed here or on another client. */
export function applyRead(
	queryClient: QueryClient,
	ids: number[],
	unreadCount: number,
) {
	applyUnreadCount(queryClient, unreadCount);
	const idSet = new Set(ids);
	const now = new Date().toISOString();

	forEachList(queryClient, (prev, params) => {
		const marked = prev.notifications.map((n) => {
			const match = idSet.size === 0 || idSet.has(n.id);
			if (!match || n.read) return n;
			return { ...n, read: true, readAt: n.readAt ?? now };
		});

		if (params.unreadOnly) {
			const filtered = marked.filter((n) => !n.read);
			const removed = marked.length - filtered.length;
			return {
				...prev,
				notifications: filtered,
				unreadCount,
				pagination: {
					...prev.pagination,
					total: Math.max(0, prev.pagination.total - removed),
				},
			};
		}

		return { ...prev, notifications: marked, unreadCount };
	});
}

/** Optimistically mark every visible row read (Mark all read). */
export function applyMarkAllRead(queryClient: QueryClient) {
	applyUnreadCount(queryClient, 0);
	const now = new Date().toISOString();

	forEachList(queryClient, (prev, params) => {
		if (params.unreadOnly) {
			return {
				...prev,
				notifications: [],
				unreadCount: 0,
				pagination: { ...prev.pagination, total: 0, pages: 1 },
			};
		}

		return {
			...prev,
			unreadCount: 0,
			notifications: prev.notifications.map((n) =>
				n.read ? n : { ...n, read: true, readAt: n.readAt ?? now },
			),
		};
	});
}

export function applyMarkOneRead(queryClient: QueryClient, id: number) {
	const unread = queryClient.getQueryData<UnreadCountResult>(
		notificationKeys.unread(),
	);
	const nextCount = Math.max(0, (unread?.unreadCount ?? 1) - 1);
	applyRead(queryClient, [id], nextCount);
}
