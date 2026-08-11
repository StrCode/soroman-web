import { categoryIcon, categoryLabel } from "@/lib/notifications/categories";
import { formatRelativeTime } from "@/lib/notifications/relative-time";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type Props = {
	notification: Notification;
	onSelect: (notification: Notification) => void;
	/** Denser row for the header popover. */
	compact?: boolean;
};

export function NotificationItem({
	notification,
	onSelect,
	compact = false,
}: Props) {
	const Icon = categoryIcon(notification.category);

	return (
		<button
			type="button"
			onClick={() => onSelect(notification)}
			className={cn(
				"flex w-full cursor-pointer text-left transition-colors outline-none",
				"hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50",
				compact ? "gap-2.5 rounded-md px-2 py-2" : "gap-3 rounded-lg px-3 py-3",
				!notification.read && "bg-muted/40",
			)}
		>
			<span
				className={cn(
					"mt-0.5 flex shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5",
					compact ? "size-6" : "size-7",
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
							"line-clamp-1",
							compact ? "text-[0.8125rem]" : "text-sm",
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
					<span
						className={cn(
							"mt-0.5 text-xs text-muted-foreground",
							compact ? "line-clamp-1" : "line-clamp-2",
						)}
					>
						{notification.body}
					</span>
				) : null}
				<span className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
					<span>{categoryLabel(notification.category)}</span>
					<span aria-hidden>·</span>
					<span>{formatRelativeTime(notification.createdAt)}</span>
				</span>
			</span>
		</button>
	);
}
