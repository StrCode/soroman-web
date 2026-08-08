import { env } from "@/env";

/**
 * The transport layer under lib/api.ts: base URL, cookies, bearer token,
 * CSRF echo, and the serialized refresh-on-401 dance. Nothing here knows
 * about domain shapes — api.ts owns mapping, this owns moving bytes.
 *
 * Session model (web = cookie transport):
 * - The refresh token lives in an httpOnly cookie the browser attaches
 *   automatically — never readable, never stored here.
 * - The access token (15 min) lives in memory only.
 * - The CSRF token arrives in token-issuing response bodies and is persisted
 *   to localStorage: it must survive a reload (the refresh cookie does), and
 *   it is not a secret — double-submit only requires that a cross-site page
 *   cannot READ it, and localStorage is same-origin-only.
 */

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const BASE = env.VITE_SERVER_URL.replace(/\/$/, "");
const CSRF_KEY = "soroman.csrf";

/**
 * The session-restore refresh runs inside every route's `beforeLoad`, so the
 * whole app is blocked until it answers. A sleeping backend (e.g. a free-tier
 * host cold-starting) would otherwise hold a blank spinner for a minute — this
 * bounds the wait so a slow or unreachable backend degrades to the signed-out
 * UI instead of hanging. A warm backend answers in well under a second, so this
 * only ever trips on a genuinely stuck one. User-initiated calls stay untimed.
 */
const REFRESH_TIMEOUT_MS = 12_000;

let accessToken: string | null = null;
let csrfToken: string | null = localStorage.getItem(CSRF_KEY);

export function getAccessToken(): string | null {
	return accessToken;
}

/** Called by api.ts whenever a token-issuing endpoint answers. */
export function tokensIssued(data: {
	accessToken?: string;
	csrfToken?: string;
}) {
	if (data.accessToken) accessToken = data.accessToken;
	if (data.csrfToken) {
		csrfToken = data.csrfToken;
		localStorage.setItem(CSRF_KEY, data.csrfToken);
	}
}

export function clearTokens() {
	accessToken = null;
	csrfToken = null;
	localStorage.removeItem(CSRF_KEY);
}

type Json = Record<string, unknown>;

async function parseBody(res: Response): Promise<Json> {
	if (res.status === 204) return {};
	try {
		return (await res.json()) as Json;
	} catch {
		return {};
	}
}

function toError(res: Response, body: Json): ApiError {
	const message =
		typeof body.message === "string" && body.message
			? body.message
			: "Something went wrong. Please try again.";
	return new ApiError(res.status, message);
}

async function rawFetch(
	path: string,
	{
		method = "GET",
		body,
		csrf = false,
		timeoutMs,
	}: {
		method?: string;
		body?: unknown;
		csrf?: boolean;
		timeoutMs?: number;
	} = {},
): Promise<Response> {
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
	if (csrf && csrfToken) headers["X-CSRF-Token"] = csrfToken;

	return fetch(`${BASE}${path}`, {
		method,
		credentials: "include",
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		// Aborts as a fetch rejection, which callers already treat as a network
		// failure. Only the bootstrap refresh passes this today.
		signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
	});
}

/**
 * One refresh at a time, shared by every caller. Two parallel refreshes would
 * both present the same rotated-out token — the backend reads that as theft
 * and revokes every session the customer has.
 */
let refreshInFlight: Promise<Json | null> | null = null;

export function refreshSession(): Promise<Json | null> {
	refreshInFlight ??= doRefresh().finally(() => {
		refreshInFlight = null;
	});
	return refreshInFlight;
}

async function doRefresh(): Promise<Json | null> {
	let res: Response;
	try {
		res = await rawFetch("/api/customer/auth/refresh", {
			method: "POST",
			csrf: true,
			timeoutMs: REFRESH_TIMEOUT_MS,
		});
	} catch {
		// Network failure (or the timeout above) is not "signed out" — leave state
		// alone and report nothing; the caller's original 401 will surface, and the
		// bootstrap simply falls through to the signed-out UI.
		return null;
	}
	if (!res.ok) {
		// 400 = no cookie (fresh visitor), 401 = session over, 403 = CSRF drift.
		// All mean the same thing here: no session to restore.
		clearTokens();
		return null;
	}
	const body = await parseBody(res);
	const data = (body.data ?? {}) as Json;
	tokensIssued(data as { accessToken?: string; csrfToken?: string });
	return data;
}

/**
 * JSON request with the standard behaviours: cookies on, bearer attached,
 * one serialized refresh-and-retry on 401, ApiError with the server's own
 * message on failure. `data` from the standard `{success, message, data}`
 * envelope is returned directly; `raw: true` returns the whole envelope for
 * the few endpoints that signal on the top level (e.g. stepUpRequired).
 */
export async function request<T>(
	path: string,
	opts: {
		method?: string;
		body?: unknown;
		csrf?: boolean;
		retryOn401?: boolean;
		raw?: boolean;
	} = {},
): Promise<T> {
	const { retryOn401 = true, raw = false, ...fetchOpts } = opts;

	let res: Response;
	try {
		res = await rawFetch(path, fetchOpts);
	} catch {
		throw new ApiError(
			0,
			"Can't reach the server. Check your connection and try again.",
		);
	}

	if (res.status === 401 && retryOn401) {
		const refreshed = await refreshSession();
		if (refreshed) {
			try {
				res = await rawFetch(path, fetchOpts);
			} catch {
				throw new ApiError(
					0,
					"Can't reach the server. Check your connection and try again.",
				);
			}
		}
	}

	const body = await parseBody(res);
	if (!res.ok) throw toError(res, body);
	return (raw ? body : (body.data ?? body)) as T;
}
