import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { NotificationPanel } from "@/components/notifications/panel";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/notifications/api";
import {
	hrefToPath,
	resolveNotificationHref,
} from "@/lib/notifications/deep-link";
import { notificationKeys } from "@/lib/notifications/keys";
import { useStream } from "@/lib/notifications/use-stream";

export function NotificationBell() {
	const isMobile = useIsMobile();
	const auth = useAuth();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const openRef = useRef(open);
	openRef.current = open;

	const { connected } = useStream({
		enabled: auth.status === "authed",
		onNotification: (notification) => {
			// Panel already shows the row via cache — skip the toast while open.
			if (openRef.current) return;
			toast(notification.title, {
				description: notification.body || undefined,
				action: {
					label: "View",
					onClick: () => {
						router.history.push(
							hrefToPath(resolveNotificationHref(notification)),
						);
					},
				},
			});
		},
	});

	const { data } = useQuery({
		queryKey: notificationKeys.unread(),
		queryFn: () => notificationsApi.unreadCount(),
		enabled: auth.status === "authed",
		// SSE is the fast path; poll only when the stream is down.
		refetchInterval: connected ? false : 60_000,
		refetchOnWindowFocus: true,
	});

	const unreadCount = data?.unreadCount ?? 0;
	const badge =
		unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
	const ariaLabel = badge
		? `Notifications, ${unreadCount} unread`
		: "Notifications, none unread";

	const badgeEl = badge ? (
		<span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6rem] font-semibold text-accent-foreground tabular-nums">
			{badge}
		</span>
	) : null;

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							className="relative"
							aria-label={ariaLabel}
						/>
					}
				>
					<Bell />
					{badgeEl}
				</SheetTrigger>
				<SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
					<SheetHeader className="sr-only">
						<SheetTitle>Notifications</SheetTitle>
					</SheetHeader>
					<div className="flex min-h-0 flex-1 flex-col p-4 pt-12">
						<NotificationPanel layout="sheet" onClose={() => setOpen(false)} />
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative"
						aria-label={ariaLabel}
					/>
				}
			>
				<Bell />
				{badgeEl}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[22.5rem] gap-0 overflow-hidden p-3"
			>
				<NotificationPanel layout="popover" onClose={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
