/**
 * Tipe inti library pivot BSM.
 *
 * Bentuk `PivotResult` sengaja dibuat identik dengan yang dipakai
 * `usePivotExport` / `exportPivotToExcel` (headers, rowHeaders, data,
 * rowTotals, columnTotals, grandTotal) supaya exporter lama tetap jalan.
 */

export type AggregationFunction =
  | "sum"
  | "count"
  | "avg"
  | "min"
  | "max"
  | "countDistinct"
  | "median"
  | "stdDev"
  | "percentOfTotal"
  | "custom";

export interface PivotField {
  field: string;
  label?: string;
}

export interface PivotValueField extends PivotField {
  aggregation: AggregationFunction;
  customFn?: CustomAggregationFn;
  customLabel?: string;
  customSymbol?: string;
}

export type CustomAggregationFn = (
  values: number[],
  allFieldValues?: Record<string, number[]>,
) => number | null;

export interface CalculatedField {
  id: string;
  name: string;
  formula: string;
  formatAs?: "number" | "percent" | "currency";
  decimals?: number;
}

export interface PivotConfig {
  rowFields: string[];
  columnFields: string[];
  valueFields: PivotValueField[];
  showRowTotals: boolean;
  showColumnTotals: boolean;
  calculatedFields?: CalculatedField[];
}

export interface PivotCell {
  value: number | null;
  count: number;
  formattedValue: string;
}

export interface PivotGroupStart {
  depth: number;
  path: string[];
  key: string;
  isCollapsed: boolean;
}

export interface PivotRowMeta {
  path: string[];
  key: string;
  isSubtotal: boolean;
  groupStarts: PivotGroupStart[];
}

export interface PivotResult {
  headers: string[][];
  rowHeaders: string[][];
  data: PivotCell[][];
  rowTotals: PivotCell[];
  columnTotals: PivotCell[];
  grandTotal: PivotCell;
  rowMeta: PivotRowMeta[];
}

export interface FieldStats {
  field: string;
  type: "string" | "number" | "date" | "boolean" | "mixed";
  uniqueCount: number;
  isNumeric: boolean;
}

/** Format angka: 'us' (1,234.56), 'eu' (1.234,56), 'plain' (1234.56). */
export type NumberFormat = "us" | "eu" | "plain";

/** Conditional formatting untuk kolom data numerik. */
export type ConditionalFormat = "none" | "heatmap" | "databar";

/** Layout pivot yang dapat disimpan per user. */
export interface SavedPivotLayout {
  version: 1;
  rowFields: string[];
  columnFields: string[];
  valueFields: PivotValueField[];
  showRowTotals: boolean;
  showColumnTotals: boolean;
  conditionalFormat: ConditionalFormat;
  sort?: PivotSort | null;
  savedAt: string;
}

export interface PivotSort {
  /** 'row' = urutkan menurut baris, 'value' = menurut total kolom nilai. */
  target: "row" | "value";
  /** Untuk target 'row': field yang diurutkan. */
  field?: string;
  direction: "asc" | "desc";
}
