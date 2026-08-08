import { flexRender, type RowData, useTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type AppColumnDef, appTableFeatures } from "@/lib/table";
import { cn } from "@/lib/utils";

const LOADING_ROWS = 6;

/** Server-driven page envelope — matches the portal list APIs. */
export type DataTablePagination = {
	page: number;
	pages: number;
	total: number;
	/** Noun for the summary line, e.g. "orders". Defaults to "results". */
	label?: string;
	onPageChange: (page: number) => void;
};

/**
 * Headless TanStack Table + the shared shadcn Table primitives — the pattern
 * from the shadcn Data Table guide. Owns its loading skeleton (header stays,
 * body rows pulse), empty state, and optional server-driven pager so callers
 * don't wrap the whole surface in a blank Skeleton or reinvent Previous/Next.
 */
type DataTableProps<TData extends RowData> = {
	columns: AppColumnDef<TData>[];
	data: TData[];
	isLoading?: boolean;
	/** Title for the in-table empty state. Defaults to "No results." */
	emptyTitle?: string;
	emptyDescription?: string;
	/** Optional CTA under the empty copy (e.g. "Place your first order"). */
	emptyAction?: ReactNode;
	/** Optional row click — used by dashboard list tables that open a detail page. */
	onRowClick?: (row: TData) => void;
	/** Alternate white / muted gray body rows. */
	striped?: boolean;
	/**
	 * Server pagination. When set, Previous/Next render below the table whenever
	 * there is more than one page (or always, if `alwaysShow` is true).
	 */
	pagination?: DataTablePagination & { alwaysShow?: boolean };
	className?: string;
	tableClassName?: string;
};

export function DataTable<TData extends RowData>({
	columns,
	data,
	isLoading = false,
	emptyTitle = "No results.",
	emptyDescription,
	emptyAction,
	onRowClick,
	striped = false,
	pagination,
	className,
	tableClassName,
}: DataTableProps<TData>) {
	// Core-only v9 table — the pager below is fully prop-driven, so no
	// pagination feature (or manualPagination/pageCount options) is registered.
	const table = useTable({
		features: appTableFeatures,
		data,
		columns,
	});

	const colCount = columns.length;
	const rows = table.getRowModel().rows;
	const showEmpty = !isLoading && rows.length === 0;
	const showPager =
		Boolean(pagination) &&
		!isLoading &&
		!showEmpty &&
		(pagination!.alwaysShow || pagination!.pages > 1);

	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border border-foreground/15",
				className,
			)}
		>
			<Table className={cn("min-w-160", tableClassName)}>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className="border-foreground/15 bg-muted/30 hover:bg-muted/30"
						>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className={cn(
										"h-auto px-4 py-3 text-[0.6rem] font-medium tracking-[0.14em] text-muted-foreground uppercase",
										header.column.columnDef.meta?.className,
									)}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{isLoading ? (
						Array.from({ length: LOADING_ROWS }, (_, i) => (
							<TableRow
								key={`loading-${i}`}
								className="border-foreground/15 hover:bg-transparent"
							>
								{columns.map((column, j) => (
									<TableCell
										key={`loading-${i}-${column.id ?? j}`}
										className={cn("px-4 py-3.5", column.meta?.className)}
									>
										<Skeleton className="h-4 w-full max-w-40" />
									</TableCell>
								))}
							</TableRow>
						))
					) : showEmpty ? (
						<TableRow className="hover:bg-transparent">
							<TableCell colSpan={colCount} className="p-0">
								<Empty className="border-0 py-12">
									<EmptyHeader>
										<EmptyTitle>{emptyTitle}</EmptyTitle>
										{emptyDescription && (
											<EmptyDescription>{emptyDescription}</EmptyDescription>
										)}
									</EmptyHeader>
									{emptyAction && <EmptyContent>{emptyAction}</EmptyContent>}
								</Empty>
							</TableCell>
						</TableRow>
					) : (
						rows.map((row, i) => (
							<TableRow
								key={row.id}
								onClick={
									onRowClick ? () => onRowClick(row.original) : undefined
								}
								className={cn(
									"ease-luxe border-foreground/15 transition-colors duration-250",
									striped && i % 2 === 1 && "bg-muted/40",
									onRowClick && "group cursor-pointer hover:bg-muted/60",
								)}
							>
								{row.getAllCells().map((cell) => (
									<TableCell
										key={cell.id}
										className={cn(
											"px-4 py-3.5 whitespace-normal",
											cell.column.columnDef.meta?.className,
										)}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
			{showPager && pagination && (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/15 px-4 py-3 text-sm text-muted-foreground">
					<span className="tabular-nums">
						Page {pagination.page} of {Math.max(1, pagination.pages)} ·{" "}
						{pagination.total.toLocaleString()} {pagination.label ?? "results"}
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page <= 1}
							onClick={() =>
								pagination.onPageChange(Math.max(1, pagination.page - 1))
							}
							className="cursor-pointer"
						>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page >= pagination.pages}
							onClick={() =>
								pagination.onPageChange(
									Math.min(pagination.pages, pagination.page + 1),
								)
							}
							className="cursor-pointer"
						>
							Next
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
