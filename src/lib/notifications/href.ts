/**
 * Map a notification's actionUrl / deep-link payload onto a dashboard route.
 *
 * The catalog emits absolute portal URLs with paths like `/orders/:id` and
 * `/dangote-orders/:id`. The web app lives under `/dashboard/…`, and depot
 * order detail is keyed by order number (not the numeric id), so we prefer
 * `data.orderNumber` when present.
 */

import type { Notification } from "./types";

export type NotificationHref = {
	to: string;
	params?: Record<string, string>;
};

/** Concrete path for history navigation (fills `$param` segments). */
export function hrefToPath(href: NotificationHref): string {
	if (!href.params) return href.to;
	return Object.entries(href.params).reduce(
		(path, [key, value]) => path.replace(`$${key}`, encodeURIComponent(value)),
		href.to,
	);
}

function extractPath(actionUrl: string | null): string | null {
	if (!actionUrl) return null;
	try {
		if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
			return new URL(actionUrl).pathname;
		}
	} catch {
		return null;
	}
	return actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`;
}

export function resolveNotificationHref(
	notification: Notification,
): NotificationHref {
	const data = notification.data ?? {};
	const orderNumber =
		typeof data.orderNumber === "string" && data.orderNumber.trim()
			? data.orderNumber.trim()
			: null;
	const requestId =
		data.requestId != null && String(data.requestId).trim()
			? String(data.requestId).trim()
			: null;

	if (orderNumber) {
		return {
			to: "/dashboard/orders/$orderId",
			params: { orderId: orderNumber },
		};
	}

	if (requestId && notification.entityType === "dangote_request") {
		return {
			to: "/dashboard/dangote-delivery/$orderId",
			params: { orderId: requestId },
		};
	}
	if (requestId && notification.entityType === "lpg_request") {
		return {
			to: "/dashboard/cooking-gas/$orderId",
			params: { orderId: requestId },
		};
	}

	const path = extractPath(notification.actionUrl);
	if (!path || path === "/") {
		return { to: "/dashboard" };
	}

	if (path.startsWith("/dashboard")) {
		return { to: path };
	}

	const orderMatch = path.match(/^\/orders\/([^/]+)\/?$/);
	if (orderMatch) {
		const segment = orderMatch[1];
		// Detail page looks up by order number; a bare numeric id would 404.
		if (/^\d+$/.test(segment)) {
			return { to: "/dashboard/orders" };
		}
		return {
			to: "/dashboard/orders/$orderId",
			params: { orderId: segment },
		};
	}

	const dangoteMatch = path.match(/^\/dangote-orders\/([^/]+)\/?$/);
	if (dangoteMatch) {
		return {
			to: "/dashboard/dangote-delivery/$orderId",
			params: { orderId: dangoteMatch[1] },
		};
	}

	const lpgMatch = path.match(/^\/lpg-orders\/([^/]+)\/?$/);
	if (lpgMatch) {
		return {
			to: "/dashboard/cooking-gas/$orderId",
			params: { orderId: lpgMatch[1] },
		};
	}

	if (path === "/wallet" || path.startsWith("/wallet/")) {
		return { to: "/dashboard/wallet" };
	}
	if (path === "/commissions" || path.startsWith("/commissions/")) {
		return { to: "/dashboard/commissions" };
	}
	if (path === "/licenses" || path.startsWith("/licenses/")) {
		return { to: "/dashboard/licenses" };
	}

	return { to: "/dashboard" };
}
