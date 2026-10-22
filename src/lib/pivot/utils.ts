/**
 * Utilitas murni untuk engine pivot: kunci path, deteksi tipe kolom,
 * format angka/tanggal, nilai unik kolom. Tidak ada dependensi Vue/DOM.
 */
import type { FieldStats, NumberFormat } from "./types";

/** Separator kunci kolom (aman, tak muncul di data biasa). */
const COL_SEP = "|||";
/** Separator kunci path hierarki. */
const PATH_SEP = "\0";

export function stringifyFieldValue(value: unknown): string {
  return String(value ?? "(blank)");
}

/** Kunci komposit satu baris untuk sekumpulan field (dipakai grouping). */
export function makeKey(row: Record<string, unknown>, fields: string[]): string {
  return fields.map((f) => stringifyFieldValue(row[f])).join(COL_SEP);
}

export function parseKey(key: string): string[] {
  return key.split(COL_SEP);
}

export function pathKey(values: string[]): string {
  return values.join(PATH_SEP);
}

export function parsePathKey(key: string): string[] {
  if (key === "") return [];
  return key.split(PATH_SEP);
}

/** Bandingkan dua path secara natural (angka dikenali). */
export function comparePaths(a: string[], b: string[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const cmp = a[i].localeCompare(b[i], undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
  }
  return a.length - b.length;
}

export function detectColumnType(
  values: unknown[],
): "string" | "number" | "date" | "boolean" {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "string";
  const sample = nonNull.slice(0, 100);
  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  for (const val of sample) {
    if (typeof val === "boolean") {
      booleanCount++;
    } else if (typeof val === "number" || (!Number.isNaN(Number(val)) && val !== "")) {
      numberCount++;
    } else if (val instanceof Date || !Number.isNaN(Date.parse(String(val)))) {
      dateCount++;
    }
  }
  const threshold = sample.length * 0.8;
  if (booleanCount >= threshold) return "boolean";
  if (numberCount >= threshold) return "number";
  if (dateCount >= threshold) return "date";
  return "string";
}

export function detectFieldType(
  data: Record<string, unknown>[],
  field: string,
): FieldStats {
  const values = data
    .map((row) => row[field])
    .filter((v) => v !== null && v !== undefined && v !== "");
  const sample = values.slice(0, 100);
  let numberCount = 0;
  const uniqueSet = new Set<string>();
  for (const val of sample) {
    uniqueSet.add(String(val));
    if (typeof val === "number" || (!Number.isNaN(Number(val)) && val !== "")) {
      numberCount++;
    }
  }
  const isNumeric = sample.length > 0 && numberCount >= sample.length * 0.8;
  return {
    field,
    type: isNumeric ? "number" : "string",
    uniqueCount: uniqueSet.size,
    isNumeric,
  };
}

export function formatNumber(
  value: number,
  format: NumberFormat = "us",
  options?: { maximumFractionDigits?: number },
): string {
  const maxDigits =
    options?.maximumFractionDigits ?? (Math.abs(value) >= 1000 ? 2 : 4);
  switch (format) {
    case "eu":
      return value.toLocaleString("de-DE", { maximumFractionDigits: maxDigits });
    case "plain":
      return Number.isInteger(value)
        ? String(value)
        : value.toFixed(Math.min(maxDigits, 20));
    case "us":
    default:
      return value.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
  }
}

export function formatDate(value: unknown, format: "us" | "eu" | "iso" = "iso"): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  switch (format) {
    case "us":
      return `${month}/${day}/${year}`;
    case "eu":
      return `${day}/${month}/${year}`;
    case "iso":
    default:
      return `${year}-${month}-${day}`;
  }
}

export interface ColumnUniqueValues {
  uniqueValues: string[];
  totalCount: number;
  nullCount: number;
  type: "string" | "number" | "date" | "boolean";
  numericMin?: number;
  numericMax?: number;
  dateMin?: string;
  dateMax?: string;
}

/** Nilai unik kolom untuk filter dropdown (bergaya Excel). */
export function getColumnUniqueValues(
  data: Record<string, unknown>[],
  columnKey: string,
  maxValues = 500,
): ColumnUniqueValues {
  const values: unknown[] = [];
  let nullCount = 0;
  let numericMin: number | undefined;
  let numericMax: number | undefined;
  let dateMin: string | undefined;
  let dateMax: string | undefined;

  for (const row of data) {
    const value = row[columnKey];
    if (value === null || value === undefined || value === "") {
      nullCount++;
      continue;
    }
    values.push(value);
    const num = typeof value === "number" ? value : Number.parseFloat(String(value));
    if (!Number.isNaN(num)) {
      if (numericMin === undefined || num < numericMin) numericMin = num;
      if (numericMax === undefined || num > numericMax) numericMax = num;
    }
    if (
      value instanceof Date ||
      (typeof value === "string" && !Number.isNaN(Date.parse(String(value))))
    ) {
      const dateObj = value instanceof Date ? value : new Date(String(value));
      if (!Number.isNaN(dateObj.getTime())) {
        const isoStr = dateObj.toISOString().split("T")[0];
        if (dateMin === undefined || isoStr < dateMin) dateMin = isoStr;
        if (dateMax === undefined || isoStr > dateMax) dateMax = isoStr;
      }
    }
  }

  const uniqueSet = new Set<string>();
  for (const val of values) {
    uniqueSet.add(String(val));
    if (uniqueSet.size >= maxValues) break;
  }
  const uniqueValues = Array.from(uniqueSet).sort((a, b) => {
    const numA = Number.parseFloat(a);
    const numB = Number.parseFloat(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const columnType = detectColumnType(values);
  return {
    uniqueValues,
    totalCount: data.length,
    nullCount,
    type: columnType,
    ...(columnType === "number" && numericMin !== undefined && numericMax !== undefined
      ? { numericMin, numericMax }
      : {}),
    ...(columnType === "date" && dateMin !== undefined && dateMax !== undefined
      ? { dateMin, dateMax }
      : {}),
  };
}
