/**
 * Engine pivot murni. Menghasilkan `PivotResult` (heading, baris, sel,
 * total) dari data mentah + konfigurasi. Tanpa sentuhan DOM/Vue.
 *
 * Dilengkapi collapse-aware output (rowMeta) dan opsi urut (sort).
 */
import type {
  CalculatedField,
  FieldStats,
  PivotCell,
  PivotConfig,
  PivotResult,
  PivotRowMeta,
  PivotSort,
} from "./types";
import { aggregate, formatAggregatedValue, getAggregationLabel } from "./aggregate";
import {
  comparePaths,
  detectFieldType,
  makeKey,
  parseKey,
  pathKey,
} from "./utils";

export function computeAvailableFields(
  data: Record<string, unknown>[],
): FieldStats[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]).map((field) => detectFieldType(data, field));
}

export function getUnassignedFields(
  availableFields: FieldStats[],
  rowFields: string[],
  columnFields: string[],
  valueFields: { field: string }[],
): FieldStats[] {
  const assigned = new Set([
    ...rowFields,
    ...columnFields,
    ...valueFields.map((v) => v.field),
  ]);
  return availableFields.filter((f) => !assigned.has(f.field));
}

export function isPivotConfigured(config: PivotConfig): boolean {
  return (
    (config.rowFields.length > 0 || config.columnFields.length > 0) &&
    config.valueFields.length > 0
  );
}

export function isConfigValidForFields(
  config: PivotConfig,
  availableFieldNames: string[],
): boolean {
  const available = new Set(availableFieldNames);
  const all = [
    ...config.rowFields,
    ...config.columnFields,
    ...config.valueFields.map((v) => v.field),
  ];
  return all.filter((f) => !f.startsWith("calc:")).every((f) => available.has(f));
}

const STORAGE_KEY_PREFIX = "bsm-pivot-";
export function generateStorageKey(columns: string[]): string {
  const sorted = [...columns].sort();
  return `${STORAGE_KEY_PREFIX}${sorted.join("|").substring(0, 100)}`;
}

export interface ComputePivotOptions {
  collapsedPaths?: Set<string>;
  sort?: PivotSort | null;
  numberFormat?: "us" | "eu" | "plain";
}

function extractNumericValue(
  row: Record<string, unknown>,
  vf: { field: string; aggregation: string },
  calcFieldMap: Map<string, CalculatedField>,
  allDataFieldNames: string[],
): number | null {
  if (vf.field.startsWith("calc:")) {
    const calcId = vf.field.replace("calc:", "");
    const calcDef = calcFieldMap.get(calcId);
    if (!calcDef) return null;
    return evaluateSimpleFormula(calcDef.formula, row, allDataFieldNames);
  }
  const val = row[vf.field];
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : Number.parseFloat(String(val));
  if (Number.isNaN(num)) {
    return vf.aggregation === "count" || vf.aggregation === "countDistinct" ? 1 : null;
  }
  return num;
}

/** Hitung formula sederhana (mis. "SUM(a)/SUM(b)") untuk satu baris. */
export function evaluateSimpleFormula(
  formula: string,
  row: Record<string, unknown>,
  fieldNames: string[],
): number | null {
  try {
    const referenced = Array.from(formula.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g))
      .map((m) => m[0])
      .filter((f) => f.toUpperCase() !== "SUM");
    let expression = formula;
    for (const field of new Set(referenced)) {
      const actual =
        fieldNames.find((f) => f.toLowerCase() === field.toLowerCase()) ?? field;
      const value = row[actual];
      if (value === null || value === undefined || value === "") return null;
      const num = typeof value === "number" ? value : Number.parseFloat(String(value));
      if (Number.isNaN(num)) return null;
      const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expression = expression.replace(new RegExp(`\\b${escaped}\\b`, "gi"), String(num));
    }
    // SUM(x) setelah substitusi: x mungkin berisi angka bertumpuk; jabarkan penjumlahan.
    expression = expression.replace(
      /SUM\(([^()]*)\)/gi,
      (_m, inner: string) => `(${inner})`,
    );
    if (!/^[\d\s+\-*/().]+$/.test(expression)) return null;
    const result = new Function(`return ${expression}`)() as unknown;
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function buildCell(
  values: number[],
  vf: { field: string; aggregation: string; customFn?: unknown },
  grandTotal: number | undefined,
  calcFieldMap: Map<string, CalculatedField>,
  numberFormat: "us" | "eu" | "plain",
): PivotCell {
  const aggValue = aggregate(
    values,
    vf.aggregation as never,
    grandTotal,
    vf.customFn as never,
  );
  let formattedValue: string;
  if (vf.field.startsWith("calc:")) {
    const calcDef = calcFieldMap.get(vf.field.replace("calc:", ""));
    const v = aggValue ?? 0;
    if (calcDef?.formatAs === "percent") {
      formattedValue = `${v.toFixed(calcDef.decimals ?? 2)}%`;
    } else {
      formattedValue = v.toLocaleString("en-US", {
        maximumFractionDigits: calcDef?.decimals ?? 2,
      });
    }
  } else {
    formattedValue = formatAggregatedValue(
      aggValue,
      vf.aggregation as never,
      numberFormat,
    );
  }
  return { value: aggValue, count: values.length, formattedValue };
}

export function computePivotResult(
  data: Record<string, unknown>[],
  config: PivotConfig,
  options: ComputePivotOptions = {},
): PivotResult | null {
  const { rowFields, columnFields, valueFields, showRowTotals, showColumnTotals } =
    config;
  const collapsedPaths = options.collapsedPaths ?? new Set<string>();
  const numberFormat = options.numberFormat ?? "us";

  if (!isPivotConfigured(config)) return null;
  if (data.length === 0) return null;

  const calcFieldMap = new Map<string, CalculatedField>();
  if (config.calculatedFields) {
    for (const cf of config.calculatedFields) calcFieldMap.set(cf.id, cf);
  }
  const allDataFieldNames = Object.keys(data[0]);

  const colKeySet = new Set<string>();
  const leafDataMap = new Map<string, Map<string, number[][]>>();
  const leafRowKeySet = new Set<string>();

  for (const row of data) {
    const rowKey = rowFields.length > 0 ? makeKey(row, rowFields) : "__all__";
    const colKey = columnFields.length > 0 ? makeKey(row, columnFields) : "__all__";
    leafRowKeySet.add(rowKey);
    colKeySet.add(colKey);
    if (!leafDataMap.has(rowKey)) leafDataMap.set(rowKey, new Map());
    const colMap = leafDataMap.get(rowKey)!;
    if (!colMap.has(colKey)) colMap.set(colKey, valueFields.map(() => []));
    const valueArrays = colMap.get(colKey)!;
    for (let i = 0; i < valueFields.length; i++) {
      const num = extractNumericValue(row, valueFields[i], calcFieldMap, allDataFieldNames);
      if (num !== null) valueArrays[i].push(num);
    }
  }

  // Default urutan "natural" (numeric-aware): "8","9","10" — bukan lexicographic
  // ("10","8","9"). Berbeda dari sort manual user (dropdown Urut) yang tetap.
  const compareNatural = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const leafRowKeys = Array.from(leafRowKeySet).sort(compareNatural);
  const colKeys = Array.from(colKeySet).sort(compareNatural);

  const grandTotals = valueFields.map((vf) => {
    let total = 0;
    for (const row of data) {
      const num = extractNumericValue(row, vf, calcFieldMap, allDataFieldNames);
      if (num !== null) total += num;
    }
    return total;
  });

  const getValueFieldLabel = (vf: (typeof valueFields)[number]): string => {
    if (vf.field.startsWith("calc:")) {
      const def = calcFieldMap.get(vf.field.replace("calc:", ""));
      return `${def?.name || vf.field} (${getAggregationLabel(vf.aggregation)})`;
    }
    return `${vf.label || vf.field} (${getAggregationLabel(vf.aggregation)})`;
  };

  // ── Header kolom ─────────────────────────────────────────────────────
  const headers: string[][] = [];
  if (columnFields.length > 0) {
    const repeatCount = valueFields.length > 1 ? valueFields.length : 1;
    for (let level = 0; level < columnFields.length; level++) {
      const headerRow: string[] = [];
      for (const colKey of colKeys) {
        const parts = parseKey(colKey);
        for (let i = 0; i < repeatCount; i++) headerRow.push(parts[level] || "");
      }
      headers.push(headerRow);
    }
  }
  if (valueFields.length > 1 || headers.length === 0) {
    if (colKeys.length === 1 && colKeys[0] === "__all__") {
      headers.push(valueFields.map((vf) => getValueFieldLabel(vf)));
    } else {
      const valueLabels: string[] = [];
      for (const _colKey of colKeys) {
        for (const vf of valueFields) valueLabels.push(getValueFieldLabel(vf));
      }
      headers.push(valueLabels);
    }
  }

  // ── Baris: leaf + subtotal collapse-aware ────────────────────────────
  const groupLeafMap = new Map<string, string[]>();
  if (rowFields.length > 1) {
    for (const leafKey of leafRowKeys) {
      const parts = parseKey(leafKey);
      for (let depth = 1; depth < parts.length; depth++) {
        const prefixKey = pathKey(parts.slice(0, depth));
        const existing = groupLeafMap.get(prefixKey);
        if (existing) existing.push(leafKey);
        else groupLeafMap.set(prefixKey, [leafKey]);
      }
    }
  }

  const collapsedAncestor = (leafParts: string[]): string[] | null => {
    for (let len = 1; len < leafParts.length; len++) {
      const prefix = leafParts.slice(0, len);
      if (collapsedPaths.has(pathKey(prefix))) return prefix;
    }
    return null;
  };

  interface RowEntry {
    rowPath: string[];
    leafKeys: string[];
    isSubtotal: boolean;
  }

  const buildRowEntries = (): RowEntry[] => {
    if (rowFields.length <= 1) {
      return leafRowKeys.map((lk) => ({
        rowPath: lk === "__all__" ? [] : parseKey(lk),
        leafKeys: [lk],
        isSubtotal: false,
      }));
    }
    const entries: RowEntry[] = [];
    const emittedSubtotals = new Set<string>();
    for (const lk of leafRowKeys) {
      const parts = parseKey(lk);
      const ancestor = collapsedAncestor(parts);
      if (ancestor !== null) {
        const subtotalKey = pathKey(ancestor);
        if (emittedSubtotals.has(subtotalKey)) continue;
        emittedSubtotals.add(subtotalKey);
        const groupLeaves = groupLeafMap.get(subtotalKey) ?? [];
        const paddedPath = [
          ...ancestor,
          ...Array.from({ length: rowFields.length - ancestor.length }).fill(""),
        ] as string[];
        entries.push({ rowPath: paddedPath, leafKeys: groupLeaves, isSubtotal: true });
      } else {
        entries.push({ rowPath: parts, leafKeys: [lk], isSubtotal: false });
      }
    }
    return entries;
  };

  let rowEntries = buildRowEntries();

  // ── Urut (sort) ──────────────────────────────────────────────────────
  const sort = options.sort ?? null;
  const totalOf = (entry: RowEntry): number => {
    let sum = 0;
    for (const lk of entry.leafKeys) {
      const colMap = leafDataMap.get(lk);
      if (!colMap) continue;
      for (const colKey of colKeys) {
        const vals = colMap.get(colKey)?.[0];
        if (vals) for (const v of vals) sum += v;
      }
    }
    return sum;
  };
  if (sort) {
    const dir = sort.direction === "asc" ? 1 : -1;
    if (sort.target === "value") {
      rowEntries = rowEntries
        .map((e, i) => ({ e, i, v: totalOf(e) }))
        .sort((a, b) => (a.v - b.v) * dir || a.i - b.i)
        .map((x) => x.e);
    } else if (sort.field && rowFields.includes(sort.field)) {
      const depth = rowFields.indexOf(sort.field);
      rowEntries = [...rowEntries].sort(
        (a, b) =>
          (a.rowPath[depth] ?? "").localeCompare(b.rowPath[depth] ?? "", undefined, {
            numeric: true,
            sensitivity: "base",
          }) * dir,
      );
    } else {
      rowEntries = [...rowEntries].sort((a, b) => comparePaths(a.rowPath, b.rowPath) * dir);
    }
  } else if (rowFields.length > 1) {
    rowEntries.sort((a, b) => comparePaths(a.rowPath, b.rowPath));
  }

  // ── rowHeaders & rowMeta (groupStarts mengikuti urutan akhir) ────────
  const seenGroupKeys = new Set<string>();
  const buildGroupStarts = (entry: RowEntry) => {
    const starts: PivotResult["rowMeta"][number]["groupStarts"] = [];
    if (rowFields.length <= 1) return starts;
    const effectivePath = entry.isSubtotal
      ? entry.rowPath.slice(
          0,
          entry.rowPath.reduceRight((acc, v, i) => (acc === -1 && v !== "" ? i : acc), -1) + 1,
        )
      : entry.rowPath;
    const maxGroupDepth = rowFields.length - 2;
    for (let depth = 0; depth <= maxGroupDepth; depth++) {
      if (depth >= effectivePath.length) break;
      const groupPath = effectivePath.slice(0, depth + 1);
      const key = pathKey(groupPath);
      if (!seenGroupKeys.has(key)) {
        seenGroupKeys.add(key);
        starts.push({ depth, path: groupPath, key, isCollapsed: collapsedPaths.has(key) });
      }
    }
    return starts;
  };

  const rowHeaders = rowEntries.map((e) => e.rowPath);
  const rowMeta: PivotRowMeta[] = rowEntries.map((e) => ({
    path: e.rowPath,
    key: pathKey(e.rowPath),
    isSubtotal: e.isSubtotal,
    groupStarts: buildGroupStarts(e),
  }));

  // ── Matriks data ─────────────────────────────────────────────────────
  const getRawValues = (leafKeys: string[], colKey: string): number[][] => {
    const result = valueFields.map(() => [] as number[]);
    for (const lk of leafKeys) {
      const colMap = leafDataMap.get(lk);
      const vals = colMap?.get(colKey) ?? valueFields.map(() => [] as number[]);
      for (let fi = 0; fi < vals.length; fi++) result[fi].push(...vals[fi]);
    }
    return result;
  };

  const pivotData: PivotCell[][] = [];
  const rowTotals: PivotCell[] = [];
  const columnTotalsMap = new Map<string, number[][]>();

  for (const entry of rowEntries) {
    const rowData: PivotCell[] = [];
    const rowAllValues = valueFields.map(() => [] as number[]);
    for (const colKey of colKeys) {
      const rawValues = getRawValues(entry.leafKeys, colKey);
      for (let fi = 0; fi < rawValues.length; fi++) {
        rowAllValues[fi].push(...rawValues[fi]);
      }
      if (!columnTotalsMap.has(colKey)) {
        columnTotalsMap.set(colKey, valueFields.map(() => [] as number[]));
      }
      const colTotals = columnTotalsMap.get(colKey)!;
      for (let fi = 0; fi < rawValues.length; fi++) colTotals[fi].push(...rawValues[fi]);

      for (let vfIdx = 0; vfIdx < valueFields.length; vfIdx++) {
        const vf = valueFields[vfIdx];
        rowData.push(
          buildCell(rawValues[vfIdx] ?? [], vf, grandTotals[vfIdx], calcFieldMap, numberFormat),
        );
      }
    }
    pivotData.push(rowData);
    if (showRowTotals && colKeys.length > 1 && valueFields.length > 0) {
      rowTotals.push(
        buildCell(rowAllValues[0] ?? [], valueFields[0], grandTotals[0], calcFieldMap, numberFormat),
      );
    } else if (showRowTotals && colKeys.length > 1) {
      rowTotals.push({ value: null, count: 0, formattedValue: "-" });
    }
  }

  const columnTotals: PivotCell[] = [];
  if (showColumnTotals && rowEntries.length > 1) {
    for (const colKey of colKeys) {
      const colRawValues = columnTotalsMap.get(colKey) ?? valueFields.map(() => [] as number[]);
      for (let vfIdx = 0; vfIdx < valueFields.length; vfIdx++) {
        columnTotals.push(
          buildCell(
            colRawValues[vfIdx] ?? [],
            valueFields[vfIdx],
            grandTotals[vfIdx],
            calcFieldMap,
            numberFormat,
          ),
        );
      }
    }
  }

  // Grand total global (independen dari collapse state)
  let grandTotal: PivotCell = { value: null, count: 0, formattedValue: "-" };
  if (showRowTotals && showColumnTotals && valueFields.length > 0) {
    const merged: number[] = [];
    for (const lk of leafRowKeys) {
      const colMap = leafDataMap.get(lk);
      if (!colMap) continue;
      for (const colKey of colKeys) {
        const vals = colMap.get(colKey)?.[0];
        if (vals) merged.push(...vals);
      }
    }
    grandTotal = buildCell(merged, valueFields[0], grandTotals[0], calcFieldMap, numberFormat);
  }

  return {
    headers,
    rowHeaders,
    data: pivotData,
    rowTotals,
    columnTotals,
    grandTotal,
    rowMeta,
  };
}
