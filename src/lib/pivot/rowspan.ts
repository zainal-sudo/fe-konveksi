/**
 * Hitung rowspan sel header baris (layout grouped), sehingga nilai induk
 * yang berulang digabung jadi satu sel spanning alih-alih diulang.
 */
export interface RowSpanCell {
  rowspan: number;
  render: boolean;
}

export function computeRowSpans(
  rowHeaders: string[][],
  sortedIndices: number[],
  rowFieldCount: number,
): RowSpanCell[][] {
  if (rowHeaders.length === 0 || rowFieldCount === 0) return [];
  const rowCount = sortedIndices.length;
  const result: RowSpanCell[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: rowFieldCount }, () => ({ rowspan: 1, render: true })),
  );

  for (let col = 0; col < rowFieldCount; col++) {
    let runStart = 0;
    while (runStart < rowCount) {
      const runEnd = findRunEnd(result, rowHeaders, sortedIndices, col, runStart, rowCount);
      result[runStart][col] = { rowspan: runEnd - runStart, render: true };
      for (let pos = runStart + 1; pos < runEnd; pos++) {
        result[pos][col] = { rowspan: 0, render: false };
      }
      runStart = runEnd;
    }
  }
  return result;
}

function findRunEnd(
  result: RowSpanCell[][],
  rowHeaders: string[][],
  sortedIndices: number[],
  col: number,
  runStart: number,
  rowCount: number,
): number {
  const startValue = rowHeaders[sortedIndices[runStart]][col];
  let pos = runStart + 1;
  while (pos < rowCount) {
    if (col > 0 && result[pos][col - 1].render) break;
    if (rowHeaders[sortedIndices[pos]][col] !== startValue) break;
    pos++;
  }
  return pos;
}
