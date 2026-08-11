import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";

/**
 * Shared copy for every not-found boundary. Layouts that already supply
 * chrome (e.g. `_site`) render this alone; the root boundary wraps it in
 * the marketing frame so unknown URLs still look like Soroman.
 */
export function NotFoundContent() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="snapshot-rise">
				<div className="flex items-center gap-4">
					<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
					<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
						404
					</span>
				</div>

				<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
					This page isn't here.
				</h1>
				<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
					The link may be old, or the address mistyped. Head home to browse
					prices, or ask the desk if you were expecting something specific.
				</p>

				<div className="mt-10 flex flex-wrap items-center gap-3">
					<Button
						nativeButton={false}
						render={<Link to="/">Back to home</Link>}
					/>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link to="/contact">Contact the desk</Link>}
					/>
				</div>
			</div>
		</div>
	);
}

/** Root / router-default boundary — includes header and footer. */
export function NotFoundPage() {
	useEffect(() => {
		document.title = "Page not found | Soroman";
	}, []);

	return (
		<div className="flex min-h-svh flex-col">
			<Header />
			<main className="flex-1">
				<NotFoundContent />
			</main>
			<Footer />
		</div>
	);
}
