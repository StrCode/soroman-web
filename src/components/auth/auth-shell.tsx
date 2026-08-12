import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Centered auth layout: the brand mark over a single panel on the plain
 * ground — no split-screen side panel, so it reads the same at every
 * viewport. Login, register and forgot-password all sit in it.
 *
 * The slim header is deliberately off on auth routes (see routes/_slim.tsx),
 * so this back control is the only way out short of the browser's own button —
 * same pinned circle the order wizards use, so the exit is in one learned spot.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative flex min-h-svh items-start justify-center px-4 py-14 sm:py-20">
			<Link
				to="/"
				aria-label="Back to home"
				className="ease-luxe absolute top-5 left-4 z-10 flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-card shadow-xs transition-colors duration-250 hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:left-6"
			>
				<ArrowLeft className="size-5" />
			</Link>
			<div className="w-full max-w-md">
				<img
					src="/favicon.png"
					alt=""
					width={44}
					height={44}
					className="mx-auto size-11"
				/>
				<div className="mt-6 rounded-xl border border-foreground/15 bg-background p-7 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:p-10">
					{children}
				</div>
				<p className="mt-6 text-center text-xs text-muted-foreground">
					Soroman Nigeria Limited ·{" "}
					<Link to="/faq" className="hover:text-foreground">
						FAQ
					</Link>{" "}
					·{" "}
					<Link to="/contact" className="hover:text-foreground">
						Contact
					</Link>{" "}
					·{" "}
					<Link to="/privacy" className="hover:text-foreground">
						Privacy
					</Link>{" "}
					·{" "}
					<Link to="/terms" className="hover:text-foreground">
						Terms
					</Link>{" "}
					·{" "}
					<Link to="/delete-account" className="hover:text-foreground">
						Delete account
					</Link>
				</p>
			</div>
		</div>
	);
}
