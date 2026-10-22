/**
 * Conditional formatting sel pivot numerik.
 *
 * Keputusan warna: heatmap memakai satu skala intensitas Steel Blue pada latar
 * putih (bukan skala merah-hijau) supaya tetap selaras palet DESIGN.md dan tidak
 * menambah warna di luar 2-3 warna inti. Alpha dibatasi 0.5 dan semua teks tetap
 * gelap (#1B2D4A) agar kontras tetap lolos WCAG AA. Data bar memakai latar
 * transparan agar angka selalu terbaca di atasnya.
 */
import type { ConditionalFormat, PivotCell } from "./types";

export interface CellFormat {
  /** Warna latar (heatmap). */
  bg?: string;
  /** Rasio panjang bar 0..1 (databar). */
  barRatio?: number;
}

const HEAT_A_MAX = 0.5;

export interface ColumnRange {
  min: number;
  max: number;
}

/** Hitung rentang min/max per indeks kolom data (abaikan nilai kosong). */
export function computeColumnRanges(matrix: PivotCell[][]): ColumnRange[] {
  const width = matrix[0]?.length ?? 0;
  const ranges: ColumnRange[] = Array.from({ length: width }, () => ({
    min: Infinity,
    max: -Infinity,
  }));
  for (const row of matrix) {
    for (let c = 0; c < width; c++) {
      const v = row[c]?.value;
      if (v === null || v === undefined) continue;
      if (v < ranges[c].min) ranges[c].min = v;
      if (v > ranges[c].max) ranges[c].max = v;
    }
  }
  for (const r of ranges) {
    if (!Number.isFinite(r.min)) r.min = 0;
    if (!Number.isFinite(r.max)) r.max = 0;
  }
  return ranges;
}

/**
 * Hitung format satu sel. `value` boleh negatif; skala heatmap memakai
 * jarak dari minimum kolom sehingga tetap informatif.
 */
export function formatCell(
  value: number | null,
  range: ColumnRange | undefined,
  mode: ConditionalFormat,
): CellFormat {
  if (mode === "none" || value === null || value === undefined || !range) return {};
  const span = range.max - range.min;
  const ratio = span === 0 ? 0.5 : (value - range.min) / span;
  const clamped = Math.max(0, Math.min(1, ratio));
  if (mode === "databar") {
    return { barRatio: clamped };
  }
  // heatmap
  const alpha = clamped * HEAT_A_MAX;
  return { bg: `rgba(59, 89, 152, ${alpha.toFixed(3)})` };
}

export const CONDITIONAL_FORMAT_OPTIONS: { value: ConditionalFormat; label: string }[] = [
  { value: "none", label: "Tanpa format" },
  { value: "heatmap", label: "Heatmap" },
  { value: "databar", label: "Data Bar" },
];
