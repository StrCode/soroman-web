/** A friendly label stored when the user trusts this browser for PIN sign-in. */
export function deviceName(): string {
	const { browser, os } = parseUserAgent(
		typeof navigator === "undefined" ? "" : navigator.userAgent,
	);
	return os ? `${browser} on ${os}` : `${browser} — Web`;
}

/**
 * Prefer a stored deviceName; otherwise parse the user-agent into
 * "Chrome on macOS". Falls back to "Unknown device".
 */
export function formatDeviceLabel(
	name: string | null | undefined,
	userAgent?: string | null,
): string {
	const trimmed = name?.trim();
	if (trimmed && !/^mozilla\//i.test(trimmed)) {
		return trimmed.replace(/\s*[—–]\s*/g, " on ");
	}
	const { browser, os } = parseUserAgent(userAgent ?? "");
	if (os) return `${browser} on ${os}`;
	if (browser !== "Browser") return browser;
	return "Unknown device";
}

function parseUserAgent(ua: string): { browser: string; os: string | null } {
	const browser = /Edg\//.test(ua)
		? "Edge"
		: /Chrome\//.test(ua) && !/Edg\//.test(ua)
			? "Chrome"
			: /Firefox\//.test(ua)
				? "Firefox"
				: /Safari\//.test(ua) && !/Chrome\//.test(ua)
					? "Safari"
					: "Browser";

	const os = /iPhone|iPad|iPod/.test(ua)
		? "iOS"
		: /Android/.test(ua)
			? "Android"
			: /Mac OS X|Macintosh/.test(ua)
				? "macOS"
				: /Windows/.test(ua)
					? "Windows"
					: /Linux/.test(ua)
						? "Linux"
						: null;

	return { browser, os };
}
