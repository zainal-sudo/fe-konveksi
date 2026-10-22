/**
 * Fungsi agregasi pivot + format tampilannya.
 * Murni, tanpa dependensi framework.
 */
import type { AggregationFunction, CustomAggregationFn, NumberFormat } from "./types";
import { formatNumber } from "./utils";

export function aggregate(
  values: number[],
  fn: AggregationFunction,
  grandTotal?: number,
  customFn?: CustomAggregationFn,
  allFieldValues?: Record<string, number[]>,
): number | null {
  if (values.length === 0 && fn !== "custom") return null;
  switch (fn) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "count":
      return values.length;
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "countDistinct":
      return new Set(values).size;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    case "stdDev": {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squared = values.map((v) => (v - mean) ** 2);
      return Math.sqrt(squared.reduce((a, b) => a + b, 0) / values.length);
    }
    case "percentOfTotal": {
      const sum = values.reduce((a, b) => a + b, 0);
      if (grandTotal === undefined || grandTotal === 0) return null;
      return (sum / grandTotal) * 100;
    }
    case "custom":
      if (customFn) {
        try {
          return customFn(values, allFieldValues);
        } catch {
          return null;
        }
      }
      return null;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function formatAggregatedValue(
  value: number | null,
  fn: AggregationFunction,
  numberFormat: NumberFormat = "us",
): string {
  if (value === null) return "-";
  if (fn === "count" || fn === "countDistinct") {
    return formatNumber(Math.round(value), numberFormat, { maximumFractionDigits: 0 });
  }
  if (fn === "percentOfTotal") {
    return `${value.toFixed(1)}%`;
  }
  return formatNumber(value, numberFormat);
}

export const AGGREGATION_LABELS: Record<AggregationFunction, string> = {
  sum: "Sum",
  count: "Count",
  avg: "Average",
  min: "Min",
  max: "Max",
  countDistinct: "Count Distinct",
  median: "Median",
  stdDev: "Std Dev",
  percentOfTotal: "% of Total",
  custom: "Custom",
};

/** Label agregasi untuk header kolom. */
export function getAggregationLabel(
  fn: AggregationFunction,
  customLabel?: string,
): string {
  if (fn === "custom" && customLabel) return customLabel;
  return AGGREGATION_LABELS[fn] ?? "Sum";
}

export interface AggregationOption {
  value: AggregationFunction;
  label: string;
}

/** Opsi agregasi yang tersedia di UI (semua gratis, tanpa gating lisensi). */
export const AGGREGATION_OPTIONS: AggregationOption[] = [
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "countDistinct", label: "Count Distinct" },
  { value: "median", label: "Median" },
  { value: "stdDev", label: "Std Dev" },
  { value: "percentOfTotal", label: "% of Total" },
];
