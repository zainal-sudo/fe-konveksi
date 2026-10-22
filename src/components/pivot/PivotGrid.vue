<script setup lang="ts">
/**
 * Grid pivot.
 *
 * Keputusan tampilan (mengikuti DESIGN.md): flat, sudut 0, garis grid penuh,
 * header Steel Blue, densitas tinggi. Dipilih karena ini alat kerja yang dibaca
 * ribuan baris per hari, sehingga kejelasan grid lebih penting daripada dekorasi.
 */
import { computed, onBeforeUnmount, ref } from "vue";
import type { PivotCell, PivotResult } from "@/lib/pivot/types";
import type { ConditionalFormat } from "@/lib/pivot/types";
import { computeColumnRanges, formatCell } from "@/lib/pivot/conditionFormat";
import { computeRowSpans } from "@/lib/pivot/rowspan";
import { prettyField, prettyAggValueLabel } from "@/lib/pivot/fieldLabel";

const props = withDefaults(
  defineProps<{
    result: PivotResult;
    rowFields: string[];
    columnFields: string[];
    valueFields: { field: string; label?: string; aggregation: string }[];
    conditionalFormat: ConditionalFormat;
    showRowTotals: boolean;
    showColumnTotals: boolean;
    fontSize?: "xs" | "sm" | "base";
  }>(),
  { fontSize: "sm" },
);

const emit = defineEmits<{
  (e: "drill", payload: { rowPath: string[]; columnPath: string[]; valueIndex: number }): void;
  (e: "toggle-collapse", key: string): void;
}>();

const headerLevels = computed(() => Math.max(1, props.result.headers.length));
const dataWidth = computed(() => props.result.data[0]?.length ?? 0);

const ranges = computed(() => computeColumnRanges(props.result.data));

const rowSpans = computed(() => {
  const idx = props.result.rowHeaders.map((_, i) => i);
  return computeRowSpans(props.result.rowHeaders, idx, props.rowFields.length);
});

const hasRowTotals = computed(
  () => props.showRowTotals && props.result.rowTotals.length > 0,
);
const hasColumnTotals = computed(
  () => props.showColumnTotals && props.result.columnTotals.length > 0,
);

const fontPx = computed(() =>
  props.fontSize === "xs" ? "10px" : props.fontSize === "base" ? "12px" : "11px",
);

// Untuk setiap kolom data, tentukan indeks value-field & path kolom (untuk drill).
const columnMeta = computed(() => {
  const colKeys = props.columnFields.length > 0 ? props.result.headers[0] ?? [] : [];
  const vCount = Math.max(1, props.valueFields.length);
  const meta: { valueIndex: number; columnPath: string[] }[] = [];
  for (let c = 0; c < dataWidth.value; c++) {
    meta.push({
      valueIndex: c % vCount,
      columnPath: props.columnFields.length
        ? props.columnFields.map((_, level) => props.result.headers[level]?.[c] ?? "")
        : [],
    });
  }
  void colKeys;
  return meta;
});

function cellFormat(cell: PivotCell | undefined, colIndex: number) {
  return formatCell(cell?.value ?? null, ranges.value[colIndex], props.conditionalFormat);
}

function onCellClick(rowIndex: number, colIndex: number) {
  const meta = columnMeta.value[colIndex];
  emit("drill", {
    rowPath: props.result.rowMeta[rowIndex]?.path ?? props.result.rowHeaders[rowIndex],
    columnPath: meta?.columnPath ?? [],
    valueIndex: meta?.valueIndex ?? 0,
  });
}

function groupStartAt(rowIndex: number, depth: number) {
  return props.result.rowMeta[rowIndex]?.groupStarts.find((g) => g.depth === depth);
}

// ── Resize lebar kolom (drag di tepi kanan header) ────────────────────
// Lebar diterapkan langsung via :style pada th (bukan <colgroup>): dengan
// auto-layout, width header = lebar kolom, tanpa efek domino ke kolom lain.
const colWidths = ref<Record<number, number>>({});

let resizeState: { idx: number; startX: number; startW: number } | null = null;

function onResizeMove(e: MouseEvent) {
  if (!resizeState) return;
  let w = resizeState.startW + (e.clientX - resizeState.startX);
  if (w < 40) w = 40;
  colWidths.value = { ...colWidths.value, [resizeState.idx]: w };
}
function stopResize() {
  resizeState = null;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", stopResize);
}
function startResize(idx: number, e: MouseEvent) {
  const th = (e.currentTarget as HTMLElement).closest("th");
  resizeState = {
    idx,
    startX: e.clientX,
    startW: th?.offsetWidth ?? colWidths.value[idx] ?? 0,
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", stopResize);
}
const colWidth = (idx: number): string | undefined =>
  colWidths.value[idx] ? `${colWidths.value[idx]}px` : undefined;
const thStyle = (idx: number): Record<string, string> | undefined =>
  colWidth(idx) ? { width: colWidth(idx)! } : undefined;
onBeforeUnmount(() => {
  if (resizeState) stopResize();
});
</script>

<template>
  <div class="pivot-scroll" :style="{ fontSize: fontPx }">
    <table class="pivot-table">
      <thead>
        <tr v-for="(level, li) in result.headers.length ? result.headers : [[]]" :key="`h-${li}`">
          <template v-if="li === 0">
            <th
              v-for="(rf, rfi) in rowFields"
              :key="`rf-${rfi}`"
              class="pivot-corner"
              :rowspan="headerLevels"
              :style="thStyle(rfi)"
            >
              {{ prettyField(rf) }}
              <span class="pivot-resize" @mousedown.stop.prevent="startResize(rfi, $event)" />
            </th>
          </template>
          <th
            v-for="(h, hi) in level"
            :key="`c-${li}-${hi}`"
            class="pivot-col-head"
            :class="{ 'val-head': li === result.headers.length - 1 && valueFields.length > 1 }"
            :style="result.headers.length && li === result.headers.length - 1 ? thStyle(rowFields.length + hi) : undefined"
          >
            {{ li === result.headers.length - 1 && valueFields.length > 1 ? prettyAggValueLabel(h) : h }}
            <span
              v-if="result.headers.length && li === result.headers.length - 1"
              class="pivot-resize"
              @mousedown.stop.prevent="startResize(rowFields.length + hi, $event)"
            />
          </th>
          <template v-if="li === 0 && hasRowTotals">
            <th class="pivot-corner pivot-total-head" :rowspan="headerLevels" :style="thStyle(rowFields.length + dataWidth)">
              Total
              <span class="pivot-resize" @mousedown.stop.prevent="startResize(rowFields.length + dataWidth, $event)" />
            </th>
          </template>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, ri) in result.data" :key="`r-${ri}`" :class="{ subtotal: result.rowMeta[ri]?.isSubtotal }">
          <template v-for="(span, ci) in rowSpans[ri]" :key="`rh-${ri}-${ci}`">
            <th v-if="span.render" class="pivot-row-head" :rowspan="span.rowspan">
              <button
                v-if="groupStartAt(ri, ci)"
                class="pivot-chevron"
                type="button"
                :aria-label="
                  groupStartAt(ri, ci)?.isCollapsed ? 'Perluas grup' : 'Ciutkan grup'
                "
                @click="emit('toggle-collapse', groupStartAt(ri, ci)!.key)"
              >
                {{ groupStartAt(ri, ci)?.isCollapsed ? "▸" : "▾" }}
              </button>
              <span>{{ result.rowHeaders[ri][ci] }}</span>
            </th>
          </template>
          <td
            v-for="(cell, ci) in row"
            :key="`d-${ri}-${ci}`"
            class="pivot-cell"
            :style="cellFormat(cell, ci).bg ? { background: cellFormat(cell, ci).bg } : undefined"
            :class="{ clickable: true }"
            :title="`${cell.count} baris sumber`"
            @click="onCellClick(ri, ci)"
          >
            <span
              v-if="conditionalFormat === 'databar' && cellFormat(cell, ci).barRatio !== undefined"
              class="pivot-bar"
              :style="{ width: `${(cellFormat(cell, ci).barRatio ?? 0) * 100}%` }"
            />
            <span class="pivot-cell-value">{{ cell.formattedValue }}</span>
          </td>
          <td v-if="hasRowTotals" class="pivot-cell pivot-total">
            {{ result.rowTotals[ri]?.formattedValue ?? "" }}
          </td>
        </tr>

        <tr v-if="hasColumnTotals" class="pivot-grand-row">
          <th class="pivot-row-head" :colspan="Math.max(1, rowFields.length)">Total</th>
          <td v-for="(cell, ci) in result.columnTotals" :key="`ct-${ci}`" class="pivot-cell pivot-total">
            {{ cell.formattedValue }}
          </td>
          <td v-if="hasRowTotals" class="pivot-cell pivot-total">
            {{ result.grandTotal?.formattedValue ?? "" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pivot-scroll {
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
  text-align: left;
  align-content: flex-start;
}
.pivot-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.pivot-table th,
.pivot-table td {
  border: 1px solid var(--ds-border-light, #c4cad3);
  padding: 2px 6px;
  white-space: nowrap;
  height: 22px;
}
.pivot-corner,
.pivot-col-head {
  background: var(--ds-primary, #3b5998);
  color: #fff;
  font-weight: 700;
  font-size: 10px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 2;
}
.pivot-corner {
  left: 0;
  z-index: 3;
}
.pivot-row-head {
  background: var(--ds-surface, #f0f3f8);
  color: var(--ds-text, #1b2d4a);
  font-weight: 600;
  text-align: left;
  vertical-align: top;
  padding-top: 3px;
  position: sticky;
  left: 0;
  z-index: 1;
}
.pivot-cell {
  text-align: right;
  position: relative;
  color: var(--ds-text, #1b2d4a);
}
.pivot-cell.clickable {
  cursor: pointer;
}
.pivot-cell.clickable:hover {
  outline: 1px solid var(--ds-primary, #3b5998);
  outline-offset: -1px;
}
.pivot-cell-value {
  position: relative;
  z-index: 1;
}
.pivot-bar {
  position: absolute;
  left: 0;
  top: 1px;
  bottom: 1px;
  background: rgba(59, 89, 152, 0.18);
  pointer-events: none;
}
.pivot-total {
  background: var(--ds-primary-50, #e8edf5);
  font-weight: 700;
}
.pivot-total-head {
  background: var(--ds-primary-dark, #2c4472);
}
tr.subtotal .pivot-row-head,
tr.subtotal .pivot-cell {
  background: var(--ds-primary-50, #e8edf5);
  font-weight: 700;
}
.pivot-grand-row th,
.pivot-grand-row td {
  background: var(--ds-primary-50, #e8edf5);
  font-weight: 700;
}
.pivot-chevron {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--ds-primary, #3b5998);
  font-size: 10px;
  padding: 0 3px 0 0;
  line-height: 1;
}
.pivot-chevron:focus-visible {
  outline: 2px solid var(--ds-primary, #3b5998);
  outline-offset: 1px;
}
.pivot-resize {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: 4;
  touch-action: none;
}
.pivot-resize:hover {
  background: rgba(255, 255, 255, 0.45);
}
</style>
