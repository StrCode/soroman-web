import { useSyncExternalStore } from "react";

import { api, type Customer, restoreSession } from "./api";

export type AuthState =
	| { status: "loading"; customer: null }
	| { status: "guest"; customer: null }
	| { status: "authed"; customer: Customer };

let state: AuthState = { status: "loading", customer: null };
const listeners = new Set<() => void>();

function setState(next: AuthState) {
	state = next;
	for (const listener of listeners) listener();
}

let bootstrapPromise: Promise<void> | null = null;

export const authStore = {
	getState: () => state,

	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},

	/**
	 * Restores the session on startup. Safe to call from multiple places
	 * (main.tsx and route beforeLoad guards) — runs once.
	 */
	ensureBootstrapped(): Promise<void> {
		bootstrapPromise ??= restoreSession()
			.then((customer) =>
				setState(
					customer
						? { status: "authed", customer }
						: { status: "guest", customer: null },
				),
			)
			.catch(() => setState({ status: "guest", customer: null }));
		return bootstrapPromise;
	},

	signedIn(customer: Customer) {
		setState({ status: "authed", customer });
	},

	customerUpdated(customer: Customer) {
		if (state.status === "authed") setState({ status: "authed", customer });
	},

	async logout() {
		try {
			await api.auth.logout();
		} catch {
			// Session is being discarded either way.
		}
		setState({ status: "guest", customer: null });
	},
};

export function useAuth(): AuthState {
	return useSyncExternalStore(authStore.subscribe, authStore.getState);
}
