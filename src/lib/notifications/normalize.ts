import type {
	Notification,
	NotificationCategory,
	NotificationPriority,
} from "./types";

/**
 * SSE publishes the raw inbox row (readAt/archivedAt), while REST returns the
 * public shape (read/archived). Accept either so the cache stays consistent.
 */
export function normalizeNotification(raw: unknown): Notification | null {
	if (!raw || typeof raw !== "object") return null;
	const row = raw as Record<string, unknown>;

	const id = Number(row.id);
	if (!Number.isFinite(id)) return null;

	const read = typeof row.read === "boolean" ? row.read : Boolean(row.readAt);
	const archived =
		typeof row.archived === "boolean" ? row.archived : Boolean(row.archivedAt);

	const createdAt =
		typeof row.createdAt === "string"
			? row.createdAt
			: row.createdAt instanceof Date
				? row.createdAt.toISOString()
				: "";

	if (!createdAt) return null;

	return {
		id,
		type: String(row.type ?? ""),
		category: (row.category as NotificationCategory) ?? "system",
		priority: (row.priority as NotificationPriority) ?? "normal",
		title: String(row.title ?? ""),
		body: String(row.body ?? ""),
		data:
			row.data && typeof row.data === "object"
				? (row.data as Record<string, unknown>)
				: {},
		entityType: row.entityType ? String(row.entityType) : null,
		entityId:
			row.entityId === null || row.entityId === undefined || row.entityId === ""
				? null
				: (row.entityId as string | number),
		actionUrl: row.actionUrl ? String(row.actionUrl) : null,
		imageUrl: row.imageUrl ? String(row.imageUrl) : null,
		read,
		readAt:
			typeof row.readAt === "string" ? row.readAt : read ? createdAt : null,
		archived,
		createdAt,
	};
}
