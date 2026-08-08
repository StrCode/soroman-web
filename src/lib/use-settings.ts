import { useCallback, useEffect, useState } from "react";

import { api, type CustomerSettings, DEFAULT_SETTINGS } from "./api";

type SettingsState = {
	settings: CustomerSettings;
	isLoading: boolean;
};

/**
 * Loads the signed-in customer's preferences. Guests (the order flow runs
 * before sign-in) quietly get the defaults, so callers never branch on auth.
 */
export function useSettings(): SettingsState & {
	update: (patch: Partial<CustomerSettings>) => Promise<CustomerSettings>;
} {
	const [state, setState] = useState<SettingsState>({
		settings: DEFAULT_SETTINGS,
		isLoading: true,
	});

	useEffect(() => {
		let cancelled = false;
		api.me
			.settings()
			.catch(() => DEFAULT_SETTINGS)
			.then((settings) => {
				if (!cancelled) setState({ settings, isLoading: false });
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const update = useCallback(async (patch: Partial<CustomerSettings>) => {
		const settings = await api.me.updateSettings(patch);
		setState({ settings, isLoading: false });
		return settings;
	}, []);

	return { ...state, update };
}
