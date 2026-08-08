import { useId } from "react";

import type { SpendPoint } from "@/lib/api";

/**
 * A cumulative-spend sparkline: the month's daily spend summed into a rising
 * line, so it reads as "how this month's spend built up" rather than a spiky
 * per-day bar chart (most days have no order). Pure SVG, no dependency; the
 * line is drawn in a unit viewBox and stretched to fit by preserveAspectRatio.
 */
export default function Sparkline({
	trend,
	className,
}: {
	trend: SpendPoint[];
	className?: string;
}) {
	const gradientId = useId();

	// Running total across the month → a monotonic series.
	let running = 0;
	const cumulative = trend.map((p) => (running += p.spent));
	const max = Math.max(...cumulative, 1);
	const n = cumulative.length;

	// Nothing spent yet: a flat baseline reads better than an empty box.
	const points =
		n <= 1
			? [
					[0, 100],
					[100, 100],
				]
			: cumulative.map((v, i) => [(i / (n - 1)) * 100, 100 - (v / max) * 100]);

	const line = points.map(([x, y]) => `${x},${y}`).join(" ");
	const area = `0,100 ${line} 100,100`;

	return (
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			className={className}
			aria-hidden
			role="presentation"
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
					<stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
				</linearGradient>
			</defs>
			<polygon points={area} fill={`url(#${gradientId})`} />
			<polyline
				points={line}
				fill="none"
				stroke="var(--accent)"
				strokeWidth="1.75"
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
