import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading shell for depot / Dangote / cooking-gas order detail — mirrors the
 * rail layout (header → next-step + facts | actions + progress) so the page
 * doesn't jump when data arrives.
 */
export function OrderDetailSkeleton() {
	return (
		<div className="mt-6" aria-busy="true" aria-label="Loading order">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 flex-1 space-y-3">
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground/15 md:w-12" aria-hidden />
						<Skeleton className="h-3 w-28" />
					</div>
					<Skeleton className="h-8 w-56 max-w-full sm:h-9 sm:w-72" />
					<Skeleton className="h-4 w-72 max-w-full" />
				</div>
				<Skeleton className="mt-1 h-7 w-28 rounded-full" />
			</header>

			<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="min-w-0 space-y-6">
					{/* Next-step / status card */}
					<div className="overflow-hidden rounded-xl border border-foreground/15">
						<div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-3.5">
							<Skeleton className="h-3 w-36" />
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="space-y-3 px-5 py-5">
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-24 w-full rounded-lg" />
						</div>
					</div>

					{/* Summary / request facts */}
					<div className="rounded-xl border border-foreground/15 p-5">
						<Skeleton className="h-3 w-24" />
						<div className="mt-4 space-y-3">
							<div className="flex justify-between gap-4">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="flex justify-between gap-4">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-20" />
							</div>
							<div className="flex justify-between gap-4 border-t border-foreground/10 pt-3">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-5 w-28" />
							</div>
						</div>
						<div className="mt-5 grid gap-3 border-t border-foreground/10 pt-4 sm:grid-cols-3">
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-12" />
								<Skeleton className="h-4 w-20" />
							</div>
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-14" />
								<Skeleton className="h-4 w-16" />
							</div>
						</div>
					</div>
				</div>

				<aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
					<div className="rounded-xl border border-foreground/15 p-5">
						<Skeleton className="h-3 w-16" />
						<div className="mt-3.5 space-y-2">
							<Skeleton className="h-9 w-full rounded-lg" />
							<Skeleton className="h-8 w-full rounded-lg" />
							<Skeleton className="h-8 w-full rounded-lg" />
							<Skeleton className="h-8 w-full rounded-lg" />
						</div>
					</div>
					<div className="rounded-xl border border-foreground/15 p-5">
						<Skeleton className="h-3 w-16" />
						<div className="mt-4 space-y-4">
							{[0, 1, 2, 3].map((i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="mt-1 size-2.5 shrink-0 rounded-full" />
									<div className="min-w-0 flex-1 space-y-1.5">
										<Skeleton className="h-3.5 w-28" />
										<Skeleton className="h-3 w-20" />
									</div>
								</div>
							))}
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
