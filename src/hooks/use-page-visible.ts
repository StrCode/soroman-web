import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
	document.addEventListener("visibilitychange", onChange);
	return () => document.removeEventListener("visibilitychange", onChange);
}

function getSnapshot() {
	return document.visibilityState === "visible";
}

/** SSR / first paint — treat as visible so we don't skip the initial fetch. */
function getServerSnapshot() {
	return true;
}

/**
 * True while this tab is visible. Drive `refetchInterval` off this so live
 * polls stop the moment the user leaves the tab (and resume when they return).
 */
export function usePageVisible() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
