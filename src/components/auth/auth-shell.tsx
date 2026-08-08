import { Link } from "@tanstack/react-router";

/**
 * Centered auth layout: the brand mark over a single panel on the plain
 * ground — no split-screen side panel, so it reads the same at every
 * viewport. Login and forgot-password both sit in it.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-svh items-start justify-center px-4 py-14 sm:py-20">
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
					</Link>
				</p>
			</div>
		</div>
	);
}
