import {
	type CellData,
	type ColumnDef,
	type RowData,
	tableFeatures,
} from "@tanstack/react-table";

/**
 * Shared feature set for every table in the app. All tables are core-only —
 * sorting and pagination stay server-driven — so no optional features are
 * registered. `columnMeta` is v9's typed slot replacing the v8 global
 * `ColumnMeta` module augmentation.
 */
export const appTableFeatures = tableFeatures({
	columnMeta: {} as { className?: string },
});

export type AppTableFeatures = typeof appTableFeatures;

/** App-wide ColumnDef bound to the shared feature set. */
export type AppColumnDef<
	TData extends RowData,
	TValue extends CellData = CellData,
> = ColumnDef<AppTableFeatures, TData, TValue>;
