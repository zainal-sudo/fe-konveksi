/**
 * Drill-through: kembalikan baris sumber yang menyusun sebuah sel pivot.
 * Path boleh berupa prefix (untuk baris subtotal / total).
 */
import type { AggregationFunction, PivotConfig } from "./types";
import { aggregate, formatAggregatedValue } from "./aggregate";
import { stringifyFieldValue } from "./utils";

export interface DrillThroughDescriptor {
  rowPath: string[];
  columnPath: string[];
  valueField: string;
  aggregation: AggregationFunction;
  formattedValue: string;
  rowCount: number;
}

export interface DrillThroughResult {
  rows: Record<string, unknown>[];
  descriptor: DrillThroughDescriptor;
}

export function getDrillThroughRows(
  data: Record<string, unknown>[],
  config: PivotConfig,
  rowPath: string[],
  columnPath: string[],
  valueFieldIndex = 0,
): DrillThroughResult {
  const { rowFields, columnFields, valueFields } = config;

  const rows = data.filter((row) => {
    for (let i = 0; i < rowPath.length; i++) {
      if (stringifyFieldValue(row[rowFields[i]]) !== rowPath[i]) return false;
    }
    for (let i = 0; i < columnPath.length; i++) {
      if (stringifyFieldValue(row[columnFields[i]]) !== columnPath[i]) return false;
    }
    return true;
  });

  const vf = valueFields[valueFieldIndex] ?? valueFields[0];
  const numericValues: number[] = [];
  for (const row of rows) {
    const raw = row[vf.field];
    if (raw === null || raw === undefined || raw === "") continue;
    const num = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    if (!Number.isNaN(num)) numericValues.push(num);
  }
  const aggregatedValue = aggregate(numericValues, vf.aggregation);
  const formattedValue = formatAggregatedValue(aggregatedValue, vf.aggregation);

  return {
    rows,
    descriptor: {
      rowPath,
      columnPath,
      valueField: vf.field,
      aggregation: vf.aggregation,
      formattedValue,
      rowCount: rows.length,
    },
  };
}
