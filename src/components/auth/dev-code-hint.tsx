/**
 * Shows the fixed verification code the backend returns in OTP dev mode, so a
 * tester on an environment with no live SMS can sign in. The backend only
 * sends `code` when dev mode is on (and dev mode can't run in production), so
 * this simply renders nothing on a real deploy.
 */
export function DevCodeHint({ code }: { code?: string | null }) {
	if (!code) return null;
	return (
		<div
			className="rounded-lg border border-amber-600/30 bg-amber-600/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-500"
			role="note"
		>
			Testing mode — no SMS sent. Your code is{" "}
			<span className="font-semibold tracking-widest tabular-nums">{code}</span>
			.
		</div>
	);
}
