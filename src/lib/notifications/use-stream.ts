import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { env } from "@/env";

import { notificationsApi } from "./api";
import {
	applyIncomingNotification,
	applyRead,
	applyUnreadCount,
} from "./cache";
import { notificationKeys } from "./keys";
import { normalizeNotification } from "./normalize";
import type { Notification, UnreadCountResult } from "./types";

const STREAM_BASE = `${env.VITE_SERVER_URL.replace(/\/$/, "")}/api/customer/notifications/stream`;

const MAX_BACKOFF_MS = 30_000;

type Options = {
	enabled?: boolean;
	onNotification?: (notification: Notification) => void;
};

/**
 * Live inbox via SSE. Tickets are single-use, so we close the EventSource on
 * any error and open a fresh ticket — never let the browser auto-retry the
 * spent URL. Falls back to polling when disconnected (see NotificationBell).
 */
export function useStream(options: Options = {}) {
	const { enabled = true, onNotification } = options;
	const queryClient = useQueryClient();
	const [connected, setConnected] = useState(false);
	const onNotificationRef = useRef(onNotification);
	onNotificationRef.current = onNotification;

	useEffect(() => {
		if (!enabled) {
			setConnected(false);
			return;
		}

		let disposed = false;
		let source: EventSource | null = null;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let attempt = 0;

		const clearReconnect = () => {
			if (reconnectTimer !== null) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
		};

		const scheduleReconnect = () => {
			if (disposed) return;
			clearReconnect();
			const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** attempt);
			attempt += 1;
			reconnectTimer = setTimeout(() => {
				void connect();
			}, delay);
		};

		const tearDownSource = () => {
			if (!source) return;
			source.onerror = null;
			source.close();
			source = null;
		};

		const connect = async () => {
			if (disposed) return;
			clearReconnect();
			tearDownSource();

			try {
				const { ticket } = await notificationsApi.issueStreamTicket();
				if (disposed) return;

				const url = `${STREAM_BASE}?ticket=${encodeURIComponent(ticket)}`;
				const es = new EventSource(url);
				source = es;

				es.addEventListener("connected", () => {
					if (disposed) return;
					attempt = 0;
					setConnected(true);
				});

				es.addEventListener("notification", (event) => {
					if (disposed || !("data" in event)) return;
					try {
						const payload = JSON.parse(String(event.data)) as {
							notification?: unknown;
							unreadCount?: number;
						};
						const notification = normalizeNotification(payload.notification);
						if (!notification) return;
						const unreadCount =
							typeof payload.unreadCount === "number"
								? payload.unreadCount
								: undefined;
						const nextUnread =
							unreadCount ??
							(queryClient.getQueryData<UnreadCountResult>(
								notificationKeys.unread(),
							)?.unreadCount ?? 0) + (notification.read ? 0 : 1);
						applyIncomingNotification(queryClient, notification, nextUnread);
						onNotificationRef.current?.(notification);
					} catch {
						/* malformed frame — ignore */
					}
				});

				es.addEventListener("read", (event) => {
					if (disposed || !("data" in event)) return;
					try {
						const payload = JSON.parse(String(event.data)) as {
							ids?: number[];
							unreadCount?: number;
						};
						if (typeof payload.unreadCount !== "number") return;
						applyRead(queryClient, payload.ids ?? [], payload.unreadCount);
					} catch {
						/* ignore */
					}
				});

				es.addEventListener("unread-count", (event) => {
					if (disposed || !("data" in event)) return;
					try {
						const payload = JSON.parse(String(event.data)) as {
							unreadCount?: number;
						};
						if (typeof payload.unreadCount !== "number") return;
						applyUnreadCount(queryClient, payload.unreadCount);
					} catch {
						/* ignore */
					}
				});

				es.onerror = () => {
					if (disposed) return;
					setConnected(false);
					tearDownSource();
					scheduleReconnect();
				};
			} catch {
				if (disposed) return;
				setConnected(false);
				scheduleReconnect();
			}
		};

		const onVisibility = () => {
			if (document.visibilityState !== "visible" || disposed) return;
			if (source && source.readyState === EventSource.OPEN) return;
			attempt = 0;
			void connect();
		};

		document.addEventListener("visibilitychange", onVisibility);
		void connect();

		return () => {
			disposed = true;
			document.removeEventListener("visibilitychange", onVisibility);
			clearReconnect();
			tearDownSource();
			setConnected(false);
		};
	}, [enabled, queryClient]);

	return { connected };
}
