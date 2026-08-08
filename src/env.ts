import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Vite exposes client vars on import.meta.env, not process.env. Typed locally
// rather than augmenting ImportMeta globally, so this package never collides
// with the consuming app's vite/client types.
const viteEnv = (
	import.meta as unknown as { env: Record<string, string | undefined> }
).env;

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		// Shows the invoice page's "Simulate payment" button for testers. Only ever
		// set this on a test/staging build wired to a Paystack test key — the
		// backend independently refuses the call outside test mode, so a stray
		// "true" in production yields a dead button, never a real state change.
		VITE_ENABLE_DEV_PAYMENT: z
			.enum(["true", "false"])
			.optional()
			.transform((v) => v === "true"),
	},
	runtimeEnv: viteEnv,
	skipValidation: !!viteEnv.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
