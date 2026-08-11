/** Compact relative time for inbox rows — "2m ago", "3h ago", "12 Jan". */
export function formatRelativeTime(iso: string, now = Date.now()): string {
	const then = Date.parse(iso);
	if (Number.isNaN(then)) return "";

	const deltaSec = Math.round((then - now) / 1000);
	const abs = Math.abs(deltaSec);
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	if (abs < 60) return rtf.format(deltaSec, "second");
	const mins = Math.round(deltaSec / 60);
	if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
	const hours = Math.round(deltaSec / 3600);
	if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
	const days = Math.round(deltaSec / 86400);
	if (Math.abs(days) < 7) return rtf.format(days, "day");

	return new Date(then).toLocaleDateString("en-NG", {
		day: "numeric",
		month: "short",
	});
}
