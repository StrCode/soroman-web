/** Categories the customer inbox can show (matches backend enum). */
export type NotificationCategory =
	| "orders"
	| "payments"
	| "delivery"
	| "tickets"
	| "account"
	| "security"
	| "reports"
	| "operations"
	| "marketing"
	| "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/** One inbox row from GET /api/customer/notifications. */
export type Notification = {
	id: number;
	type: string;
	category: NotificationCategory;
	priority: NotificationPriority;
	title: string;
	body: string;
	data: Record<string, unknown>;
	entityType: string | null;
	entityId: string | number | null;
	actionUrl: string | null;
	imageUrl: string | null;
	read: boolean;
	readAt: string | null;
	archived: boolean;
	createdAt: string;
};

export type NotificationsPagination = {
	total: number;
	page: number;
	limit: number;
	pages: number;
};

export type NotificationsListResult = {
	notifications: Notification[];
	pagination: NotificationsPagination;
	unreadCount: number;
};

export type UnreadCountResult = {
	unreadCount: number;
	byCategory: Record<string, number>;
};

export type NotificationsListParams = {
	page?: number;
	limit?: number;
	unreadOnly?: boolean;
	category?: NotificationCategory | "all";
};

export type NotificationChannel = "inApp" | "push" | "email" | "sms";

export type ChannelAvailability = Record<NotificationChannel, boolean>;

export type CategoryPreference = {
	category: NotificationCategory;
	available: ChannelAvailability;
	inApp: boolean;
	push: boolean;
	email: boolean;
	sms: boolean;
};

export type NotificationSettings = {
	pushEnabled: boolean;
	emailEnabled: boolean;
	smsEnabled: boolean;
	quietHoursEnabled: boolean;
	/** Minutes past midnight (0–1439). */
	quietHoursStart: number;
	quietHoursEnd: number;
	timezone: string;
	locale: string;
};

export type NotificationPreferencesResult = {
	preferences: CategoryPreference[];
	settings: NotificationSettings;
	alwaysOn: string[];
};

export type UpdatePreferencesBody = {
	preferences?: Array<{
		category: NotificationCategory;
		inApp?: boolean;
		push?: boolean;
		email?: boolean;
		sms?: boolean;
	}>;
	pushEnabled?: boolean;
	emailEnabled?: boolean;
	smsEnabled?: boolean;
	quietHoursEnabled?: boolean;
	quietHoursStart?: number;
	quietHoursEnd?: number;
	timezone?: string;
	locale?: string;
};
