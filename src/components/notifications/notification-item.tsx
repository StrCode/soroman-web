import { categoryIcon, categoryLabel } from "@/lib/notifications/categories";
import { formatRelativeTime } from "@/lib/notifications/relative-time";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type Props = {
	notification: Notification;
	onSelect: (notification: Notification) => void;
};

export function NotificationItem({ notification, onSelect }: Props) {
	const Icon = categoryIcon(notification.category);

	return (
		<button
			type="button"
			onClick={() => onSelect(notification)}
			className={cn(
				"flex w-full cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none",
				"hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50",
				!notification.read && "bg-muted/40",
			)}
		>
			<span
				className={cn(
					"mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
					notification.read
						? "bg-muted text-muted-foreground"
						: "bg-accent/15 text-accent",
				)}
			>
				<Icon />
			</span>

			<span className="min-w-0 flex-1">
				<span className="flex items-start gap-2">
					<span
						className={cn(
							"line-clamp-1 text-sm",
							notification.read
								? "font-medium text-foreground/80"
								: "font-semibold text-foreground",
						)}
					>
						{notification.title}
					</span>
					{!notification.read && (
						<span
							className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
							aria-hidden
						/>
					)}
				</span>
				{notification.body ? (
					<span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
						{notification.body}
					</span>
				) : null}
				<span className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
					<span>{categoryLabel(notification.category)}</span>
					<span aria-hidden>·</span>
					<span>{formatRelativeTime(notification.createdAt)}</span>
				</span>
			</span>
		</button>
	);
}
