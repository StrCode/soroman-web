/**
 * Single source of truth for company contact details and depot addresses.
 *
 * TODO: the phone, email and street addresses below are placeholders pending
 * the real details from the desk team. The depot names and states match the
 * catalog in lib/api.ts.
 */

export const WHATSAPP_URL = "https://chat.whatsapp.com/K0OVqaE6KJf80A2jd4nIWM";
export const SUPPORT_PHONE = "+234 705 5555 9623";
export const SUPPORT_EMAIL = "support@soromannl.com";

export const LOADING_HOURS = "7:00am to 6:00pm, Monday to Saturday";

// TODO: swap for the real store listings once they're published.
export const APP_STORE_URL =
	"https://apps.apple.com/ng/app/soroman/id0000000000";
export const PLAY_STORE_URL =
	"https://play.google.com/store/apps/details?id=ng.soroman.app";

export const COMPANY_NAME = "Soroman Energy";

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

export const DEPOT_LOCATIONS = [
	{ name: "Apapa Depot", state: "Lagos" },
	{ name: "Ijegun Depot", state: "Lagos" },
	{ name: "Oghara Depot", state: "Delta" },
	{ name: "Warri Depot", state: "Delta" },
	{ name: "Port Harcourt Depot", state: "Rivers" },
	{ name: "Calabar Depot", state: "Cross River" },
] as const;
