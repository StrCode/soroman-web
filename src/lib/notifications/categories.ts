import type { LucideIcon } from "lucide-react";
import {
	Bell,
	Factory,
	FileCheck,
	Package,
	Shield,
	Truck,
	UserRound,
	Wallet,
} from "lucide-react";

import type { NotificationCategory } from "./types";

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
	orders: "Orders",
	payments: "Payments",
	delivery: "Delivery",
	tickets: "Tickets",
	account: "Account",
	security: "Security",
	reports: "Reports",
	operations: "Operations",
	marketing: "Marketing",
	system: "System",
};

export const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
	orders: Package,
	payments: Wallet,
	delivery: Truck,
	tickets: FileCheck,
	account: UserRound,
	security: Shield,
	reports: Bell,
	operations: Factory,
	marketing: Bell,
	system: Bell,
};

export function categoryLabel(category: string): string {
	return CATEGORY_LABEL[category as NotificationCategory] ?? category;
}

export function categoryIcon(category: string): LucideIcon {
	return CATEGORY_ICON[category as NotificationCategory] ?? Bell;
}

export const CATEGORY_HINT: Partial<Record<NotificationCategory, string>> = {
	orders: "Depot, Dangote, and cooking-gas order updates",
	payments: "Wallet credits, payment confirmations, and failures",
	delivery: "Truck release and delivery status",
	tickets: "Loading tickets and related alerts",
	account: "Profile and account changes",
	security: "Sign-in and credential alerts — always on",
	system: "Announcements and product updates",
};
