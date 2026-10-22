<script setup lang="ts">
/**
 * DataPivot: komponen pivot utama BSM.
 *
 * Design Read: tabel analitik internal untuk staf yang membaca ribuan baris per
 * hari, bahasa visual desktop-klasik (mengikuti DESIGN.md), dial
 * ENERGY 1 / RHYTHM 1 / MOTION 1.
 *
 * Fitur: field header area ala DevExpress (Nilai kiri-atas, Baris di bawahnya,
 * Kolom di kanan), filter menempel pada field yang di-drag, multi row/column/
 * value field + grand total, drill-down, chart, reorder + sort by value,
 * simpan/muat layout per user, conditional formatting.
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { usePivotTable } from "@/lib/pivot/usePivotTable";
import { AGGREGATION_OPTIONS } from "@/lib/pivot/aggregate";
import type { PivotSort, ConditionalFormat, AggregationFunction } from "@/lib/pivot/types";
import { CONDITIONAL_FORMAT_OPTIONS } from "@/lib/pivot/conditionFormat";
import { getDrillThroughRows, type DrillThroughDescriptor } from "@/lib/pivot/drillthrough";
import { loadLayout, saveLayout, clearLayout } from "@/lib/pivot/layout";
import ColumnFilter, {
  type FilterType,
  type ColumnFilterValue,
  type TextFilter,
  type NumberFilter,
  type DateFilter,
  type SelectFilter,
} from "@/components/ColumnFilter.vue";
import PivotFieldArea from "./PivotFieldArea.vue";
import PivotFieldList from "./PivotFieldList.vue";
import PivotGrid from "./PivotGrid.vue";
import PivotChart from "./PivotChart.vue";
import PivotDrillModal from "./PivotDrillModal.vue";
import { prettyField } from "@/lib/pivot/fieldLabel";

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    theme?: "light" | "dark";
    fontSize?: "xs" | "sm" | "base";
    defaultRowFields?: string[];
    defaultColumnFields?: string[];
    defaultValueFields?: { field: string; aggregation: string }[];
    viewKey?: string;
    userKode?: string;
    /** Cek view aktif dari luar (mis. tab Grafik di view luar) */
    view?: "grid" | "chart";
  }>(),
  { theme: "light", fontSize: "sm", viewKey: "" },
);

// ── Filter per field (menempel di field, bukan baris filter terpisah) ────
const filters = ref<Record<string, ColumnFilterValue>>({});
const activeFilterField = ref<string | null>(null);
const filterDropdownStyle = ref<Record<string, string>>({});

const allFields = computed(() => Object.keys(props.data[0] ?? {}));

const detectFieldType = (field: string): FilterType => {
  if (!props.data.length) return "select";
  const sample = props.data.slice(0, 50);
  const datePattern = /^\d{4}-\d{2}-\d{2}/;
  const dateCount = sample.filter((item) => {
    const v = String((item as Record<string, unknown>)[field] ?? "");
    return v && datePattern.test(v);
  }).length;
  if (dateCount > sample.length * 0.7) return "date";
  const numCount = sample.filter((item) => {
    const v = String((item as Record<string, unknown>)[field] ?? "");
    return v !== "" && !isNaN(Number(v));
  }).length;
  if (numCount > sample.length * 0.7) return "number";
  return "select";
};

const fieldFilterTypes = computed(() => {
  const result: Record<string, FilterType> = {};
  for (const field of allFields.value) result[field] = detectFieldType(field);
  return result;
});

const isActiveFilter = (field: string): boolean =>
  filters.value[field] !== null && filters.value[field] !== undefined;

const matchTextFilter = (val: unknown, f: TextFilter): boolean => {
  const s = String(val ?? "").toLowerCase();
  const fv = f.value.toLowerCase();
  switch (f.operator) {
    case "contains":
    case "search":
      return s.includes(fv);
    case "equals":
      return s === fv;
    case "not_contains":
      return !s.includes(fv);
    case "starts_with":
      return s.startsWith(fv);
    case "ends_with":
      return s.endsWith(fv);
    case "empty":
      return s === "";
    case "not_empty":
      return s !== "";
    default:
      return true;
  }
};
const matchNumberFilter = (val: unknown, f: NumberFilter): boolean => {
  const n = Number(val);
  if (isNaN(n)) return false;
  switch (f.operator) {
    case "=":
      return n === f.value;
    case "!=":
      return n !== f.value;
    case "<":
      return n < (f.value ?? 0);
    case ">":
      return n > (f.value ?? 0);
    case "<=":
      return n <= (f.value ?? 0);
    case ">=":
      return n >= (f.value ?? 0);
    case "between": {
      const from = f.value ?? -Infinity;
      const to = f.valueTo ?? Infinity;
      return n >= from && n <= to;
    }
    default:
      return true;
  }
};
const matchDateFilter = (val: unknown, f: DateFilter): boolean => {
  const s = String(val ?? "").substring(0, 10);
  if (f.operator === "between") {
    return s >= (f.value || "0000-00-00") && s <= (f.valueTo || "9999-99-99");
  }
  if (f.operator === "equals") return s === f.value;
  if (f.operator === "before") return s < f.value;
  if (f.operator === "after") return s > f.value;
  return true;
};
const matchSelectFilter = (val: unknown, f: SelectFilter): boolean =>
  f.allowed.has(String(val ?? ""));

const matchFilter = (val: unknown, filter: ColumnFilterValue): boolean => {
  if ("allowed" in filter) return matchSelectFilter(val, filter as SelectFilter);
  if ("operator" in filter) {
    const op = (filter as { operator: string }).operator;
    if (["contains", "search", "equals", "not_contains", "starts_with", "ends_with", "empty", "not_empty"].includes(op)) {
      return matchTextFilter(val, filter as TextFilter);
    }
    if (["between", "before", "after"].includes(op) && typeof (filter as { value?: unknown }).value === "string") {
      return matchDateFilter(val, filter as DateFilter);
    }
    if (["=", "!=", "<", ">", "<=", ">="].includes(op) || op === "between") {
      return matchNumberFilter(val, filter as NumberFilter);
    }
  }
  return true;
};

const tableData = computed(() => {
  let result = props.data;
  for (const [field, filter] of Object.entries(filters.value)) {
    if (!isActiveFilter(field)) continue;
    result = result.filter((item) => matchFilter((item as Record<string, unknown>)[field], filter));
  }
  return result;
});

const activeFilterFields = computed(() =>
  Object.keys(filters.value).filter((f) => isActiveFilter(f)),
);

function openFilter(field: string, event: MouseEvent) {
  // Jangan sampai klik tombol ini ikut menyentuh listener document (onDocClick)
  // lalu menutup popup yang baru saja dibuka.
  event?.stopPropagation();
  if (activeFilterField.value === field) {
    activeFilterField.value = null;
    return;
  }
  activeFilterField.value = field;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const dropdownWidth = 190;
  const padding = 8;
  let left = rect.left;
  if (left + dropdownWidth > window.innerWidth - padding) left = window.innerWidth - dropdownWidth - padding;
  left = Math.max(padding, left);
  const spaceBelow = window.innerHeight - rect.bottom - padding;
  const spaceAbove = rect.top - padding;
  const top = spaceBelow >= 300 || spaceBelow >= spaceAbove ? rect.bottom + 4 : Math.max(padding, rect.top - spaceAbove);
  filterDropdownStyle.value = { position: "fixed", top: `${top}px`, left: `${left}px` };
}
function onFilterUpdate(field: string, val: ColumnFilterValue | null) {
  if (val === null) {
    const next = { ...filters.value };
    delete next[field];
    filters.value = next;
  } else {
    filters.value = { ...filters.value, [field]: val };
  }
}
const onDocClick = (e: MouseEvent) => {
  const t = e.target as HTMLElement;
  if (
    !t.closest(".cf-dropdown") &&
    !t.closest("[class^='pfa']") &&
    !t.closest("[class^='pfl']") &&
    !t.closest(".dp-filter-popup")
  ) {
    activeFilterField.value = null;
  }
};
onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

// ── Pivot engine ────────────────────────────────────────────────────────
const dataRef = computed(() => tableData.value);
const pivot = usePivotTable(dataRef);
const {
  rowFields,
  columnFields,
  valueFields,
  showRowTotals,
  showColumnTotals,
  conditionalFormat,
  sort,
  availableFields,
  isConfigured,
  pivotResult,
  addRowField,
  removeRowField,
  addColumnField,
  removeColumnField,
  addValueField,
  removeValueField,
  updateValueFieldAggregation,
  moveField,
  clearConfig,
  toggleCollapsedPath,
  applyLayout,
} = pivot;

const showFieldPool = ref(false);
const activeView = ref<"grid" | "chart">("grid");
const chartType = ref<"bar" | "line" | "pie">("bar");
const lastSavedAt = ref<string | null>(null);

// Sinkronkan view aktif dengan kontrol dari luar (tab "Grafik" di view)
watch(
  () => props.view,
  (v) => {
    if (v === "grid" || v === "chart") activeView.value = v;
  },
);

// ── Nilai awal: layout tersimpan user > default dari view ───────────────
const defaultsApplied = ref(false);

function applyDefaults() {
  if (defaultsApplied.value) return;
  const names = availableFields.value.map((f) => f.field);
  if (!names.length) return;
  defaultsApplied.value = true;
  for (const f of props.defaultRowFields ?? []) if (names.includes(f)) addRowField(f);
  for (const f of props.defaultColumnFields ?? []) if (names.includes(f)) addColumnField(f);
  for (const vf of props.defaultValueFields ?? []) {
    if (names.includes(vf.field)) addValueField(vf.field, vf.aggregation as AggregationFunction);
  }
}

function tryLoadSavedLayout(): boolean {
  if (!props.viewKey) return false;
  const saved = loadLayout(props.viewKey, props.userKode);
  if (!saved) return false;
  const names = new Set(availableFields.value.map((f) => f.field));
  const allExist = [...saved.rowFields, ...saved.columnFields, ...saved.valueFields.map((v) => v.field)].every(
    (f) => names.has(f),
  );
  if (!allExist) return false;
  applyLayout(saved);
  lastSavedAt.value = saved.savedAt;
  return true;
}

watch(
  () => props.data,
  (d) => {
    if (!d.length || defaultsApplied.value) return;
    if (tryLoadSavedLayout()) {
      defaultsApplied.value = true;
      return;
    }
    applyDefaults();
  },
  { immediate: true },
);

// ── Sortir ─────────────────────────────────────────────────────────────
const sortOptions = computed(() => {
  const opts: { value: string; label: string; sort: PivotSort | null }[] = [
    { value: "none", label: "Urut label baris", sort: null },
    { value: "value-desc", label: "Urut total nilai (besar → kecil)", sort: { target: "value", direction: "desc" } },
    { value: "value-asc", label: "Urut total nilai (kecil → besar)", sort: { target: "value", direction: "asc" } },
  ];
  for (const f of rowFields.value) {
    opts.push({ value: `row-${f}-asc`, label: `Urut ${f} (A→Z)`, sort: { target: "row", field: f, direction: "asc" } });
    opts.push({ value: `row-${f}-desc`, label: `Urut ${f} (Z→A)`, sort: { target: "row", field: f, direction: "desc" } });
  }
  return opts;
});
const currentSortValue = computed(() => {
  const s = sort.value;
  if (!s) return "none";
  if (s.target === "value") return `value-${s.direction}`;
  return `row-${s.field}-${s.direction}`;
});
function onSortChange(value: string) {
  sort.value = sortOptions.value.find((o) => o.value === value)?.sort ?? null;
}

// ── Layout ─────────────────────────────────────────────────────────────
function snapshot() {
  return {
    rowFields: [...rowFields.value],
    columnFields: [...columnFields.value],
    valueFields: valueFields.value.map((v) => ({ ...v })),
    showRowTotals: showRowTotals.value,
    showColumnTotals: showColumnTotals.value,
    conditionalFormat: conditionalFormat.value,
    sort: sort.value,
  };
}
function saveLayoutNow() {
  if (!props.viewKey) return;
  saveLayout(props.viewKey, snapshot(), props.userKode);
  lastSavedAt.value = new Date().toISOString();
}
function loadSavedLayout() {
  tryLoadSavedLayout();
}
function resetLayout() {
  if (props.viewKey) clearLayout(props.viewKey, props.userKode);
  clearConfig();
  defaultsApplied.value = false;
  applyDefaults();
  lastSavedAt.value = null;
}

// ── Drill-down ─────────────────────────────────────────────────────────
const drillVisible = ref(false);
const drillRows = ref<Record<string, unknown>[]>([]);
const drillDescriptor = ref<DrillThroughDescriptor | null>(null);

function onDrill(payload: { rowPath: string[]; columnPath: string[]; valueIndex: number }) {
  const { rows, descriptor } = getDrillThroughRows(
    tableData.value,
    pivot.config.value,
    payload.rowPath,
    payload.columnPath,
    payload.valueIndex,
  );
  drillRows.value = rows;
  drillDescriptor.value = descriptor;
  drillVisible.value = true;
}

defineExpose({
  pivotResult,
  rowFields,
  columnFields,
  valueFields,
  conditionalFormat,
  sort,
  isConfigured,
  saveLayoutNow,
  loadSavedLayout,
  resetLayout,
});
</script>

<template>
  <div class="dp-wrap">
    <!-- Field tersedia (panel atas, bisa disembunyikan via tombol Field) -->
    <div v-if="showFieldPool" class="dp-pool">
      <PivotFieldList
        :available-fields="availableFields"
        :row-fields="rowFields"
        :column-fields="columnFields"
        :value-fields="valueFields"
        :show-row-totals="showRowTotals"
        :show-column-totals="showColumnTotals"
        :active-filter-fields="activeFilterFields"

        @update:show-row-totals="showRowTotals = $event"
        @update:show-column-totals="showColumnTotals = $event"
      />
    </div>

    <!-- Toolbar -->
    <div class="dp-toolbar">
      <button
        type="button"
        class="dp-btn"
        :class="{ active: showFieldPool }"
        @click="showFieldPool = !showFieldPool"
      >
        Field
      </button>

      <div class="dp-tabs">
        <button type="button" class="dp-btn" :class="{ active: activeView === 'grid' }" @click="activeView = 'grid'">
          Grid
        </button>
        <button type="button" class="dp-btn" :class="{ active: activeView === 'chart' }" @click="activeView = 'chart'">
          Chart
        </button>
      </div>

      <label class="dp-inline">
        Urut:
        <select :value="currentSortValue" @change="onSortChange(($event.target as HTMLSelectElement).value)">
          <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>

      <label class="dp-inline">
        Format:
        <select v-model="conditionalFormat">
          <option v-for="o in CONDITIONAL_FORMAT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>

      <label v-if="activeView === 'chart'" class="dp-inline">
        Grafik:
        <select v-model="chartType">
          <option value="bar">Batang</option>
          <option value="line">Garis</option>
          <option value="pie">Pie</option>
        </select>
      </label>

      <span class="dp-spacer" />
      <button
        v-if="activeFilterFields.length"
        type="button"
        class="dp-btn dp-btn-danger"
        title="Hapus semua filter field"
        @click="filters = {}"
      >
        Reset filter ({{ activeFilterFields.length }})
      </button>
      <span class="dp-rows">{{ tableData.length.toLocaleString() }} / {{ data.length.toLocaleString() }} baris</span>

      <template v-if="viewKey">
        <button type="button" class="dp-btn" title="Simpan susunan field untuk akun Anda" @click="saveLayoutNow">
          Simpan layout
        </button>
        <button type="button" class="dp-btn" @click="loadSavedLayout">Muat</button>
        <button type="button" class="dp-btn dp-btn-danger" @click="resetLayout">Reset</button>
      </template>
    </div>

    <!-- Field header area ala DevExpress -->
    <PivotFieldArea
      :row-fields="rowFields"
      :column-fields="columnFields"
      :value-fields="valueFields"
      :aggregation-options="AGGREGATION_OPTIONS"
:active-filter-fields="activeFilterFields"
      :filterable-fields="allFields"
      @assign="(p) => (p.area === 'row' ? addRowField(p.field) : p.area === 'column' ? addColumnField(p.field) : addValueField(p.field))"
      @remove="(p) => (p.area === 'row' ? removeRowField(p.field) : p.area === 'column' ? removeColumnField(p.field) : removeValueField(p.field))"
      @move="(p) => moveField(p.from, p.to)"
      @update-aggregation="(p) => updateValueFieldAggregation(p.field, p.aggregation as AggregationFunction)"
      @open-filter="(p) => openFilter(p.field, p.event)"
    />

    <div class="dp-main">
      <template v-if="!isConfigured">
        <div class="dp-state">
          Susun dulu field Nilai, Baris, dan Kolom di area atas untuk membentuk pivot.
        </div>
      </template>
      <template v-else-if="!data.length">
        <div class="dp-state">Belum ada data untuk periode ini.</div>
      </template>
      <template v-else-if="!pivotResult">
        <div class="dp-state">
          Tidak ada baris yang cocok dengan filter. Tekan "Reset filter" di toolbar untuk menghapus semua filter.
        </div>
      </template>
      <template v-else-if="activeView === 'grid'">
        <PivotGrid
          :result="pivotResult!"
          :row-fields="rowFields"
          :column-fields="columnFields"
          :value-fields="valueFields"
          :conditional-format="conditionalFormat"
          :show-row-totals="showRowTotals"
          :show-column-totals="showColumnTotals"
          :font-size="fontSize"
          @drill="onDrill"
          @toggle-collapse="toggleCollapsedPath"
        />
      </template>
      <template v-else>
        <PivotChart
          :result="pivotResult"
          :row-fields="rowFields"
          :column-fields="columnFields"
          :value-fields="valueFields"
          :chart-type="chartType"
        />
      </template>
    </div>

    <PivotDrillModal v-model="drillVisible" :rows="drillRows" :descriptor="drillDescriptor" />

    <Teleport to="body">
      <div v-if="activeFilterField" class="dp-filter-popup" :style="filterDropdownStyle" @click.stop>
        <ColumnFilter
          :filter-type="fieldFilterTypes[activeFilterField] ?? 'select'"
          :column-key="activeFilterField"
          :title="prettyField(activeFilterField)"
          :items="data"
          :model-value="filters[activeFilterField] ?? null"
          @update:model-value="onFilterUpdate(activeFilterField, $event)"
          @close="activeFilterField = null"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dp-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-height: 0;
}
.dp-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 3px 4px;
  background: var(--ds-surface-window, #e8ecf1);
  border: 1px solid var(--ds-border-light, #c4cad3);
  flex-shrink: 0;
}
.dp-tabs {
  display: inline-flex;
  gap: 0;
}
.dp-btn {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
  color: var(--ds-text, #1b2d4a);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.dp-btn:hover {
  border-color: var(--ds-primary, #3b5998);
  color: var(--ds-primary, #3b5998);
}
.dp-btn.active {
  background: var(--ds-primary, #3b5998);
  border-color: var(--ds-primary, #3b5998);
  color: #fff;
}
.dp-btn-danger:hover {
  border-color: #c62828;
  color: #c62828;
}
.dp-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ds-text-secondary, #5a6a7e);
}
.dp-inline select {
  height: 24px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
  font-size: 11px;
}
.dp-spacer {
  flex: 1 1 auto;
}
.dp-rows {
  font-size: 10px;
  color: var(--ds-text-secondary, #5a6a7e);
  white-space: nowrap;
}
.dp-pool {
  flex-shrink: 0;
  max-height: 132px;
  overflow-y: auto;
  border: 1px solid var(--ds-border, #a0aab8);
  background: var(--ds-surface, #f0f3f8);
}
.dp-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dp-state {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--ds-text-secondary, #5a6a7e);
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--ds-border, #a0aab8);
}
</style>

<style>
.dp-filter-popup {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--ds-border, #a0aab8);
  border-radius: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
