/**
 * Customer notification inbox — wraps /api/customer/notifications.
 * Transport (cookies, bearer, refresh) lives in lib/http.ts.
 */

import { request } from "@/lib/http";

import type {
	Notification,
	NotificationPreferencesResult,
	NotificationsListParams,
	NotificationsListResult,
	UnreadCountResult,
	UpdatePreferencesBody,
} from "./types";

const BASE = "/api/customer/notifications";

type ServerListEnvelope = {
	data: Notification[];
	pagination: NotificationsListResult["pagination"];
	unreadCount: number;
};

type MarkReadEnvelope = {
	notification: Notification;
	unreadCount: number;
};

type BulkEnvelope = {
	updated: number;
	unreadCount: number;
};

export const notificationsApi = {
	list: async (
		params: NotificationsListParams = {},
	): Promise<NotificationsListResult> => {
		const query = new URLSearchParams();
		query.set("page", String(params.page ?? 1));
		query.set("limit", String(params.limit ?? 20));
		if (params.unreadOnly) query.set("unreadOnly", "true");
		if (params.category && params.category !== "all") {
			query.set("category", params.category);
		}

		const body = await request<ServerListEnvelope>(
			`${BASE}?${query.toString()}`,
		);

		return {
			notifications: body.data ?? [],
			pagination: body.pagination,
			unreadCount: body.unreadCount ?? 0,
		};
	},

	unreadCount: () => request<UnreadCountResult>(`${BASE}/unread-count`),

	markRead: (id: number) =>
		request<MarkReadEnvelope>(`${BASE}/${id}/read`, { method: "PATCH" }),

	markAllRead: (opts?: { category?: string; ids?: number[] }) =>
		request<BulkEnvelope>(`${BASE}/read-all`, {
			method: "POST",
			body: opts ?? {},
		}),

	archive: (id: number) =>
		request<MarkReadEnvelope>(`${BASE}/${id}/archive`, { method: "PATCH" }),

	/**
	 * Single-use, short-lived credential for EventSource. Browsers cannot set
	 * Authorization headers on EventSource, so the access token must not ride
	 * in the query string — see backend notifications/streamTicket.js.
	 */
	issueStreamTicket: () =>
		request<{ ticket: string; expiresIn: number }>(`${BASE}/stream-ticket`, {
			method: "POST",
		}),

	getPreferences: () =>
		request<NotificationPreferencesResult>(`${BASE}/preferences`),

	updatePreferences: (body: UpdatePreferencesBody) =>
		request<NotificationPreferencesResult>(`${BASE}/preferences`, {
			method: "PATCH",
			body,
		}),

	resetPreferences: (category?: string) =>
		request<NotificationPreferencesResult>(`${BASE}/preferences/reset`, {
			method: "POST",
			body: category ? { category } : {},
		}),
};
