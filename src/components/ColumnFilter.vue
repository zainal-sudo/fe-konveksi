<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { IconSearch, IconFilter, IconX } from "@tabler/icons-vue";

import DsDatePicker from "@/components/DsDatePicker.vue";
export type FilterType = "text" | "number" | "date" | "select";

export interface TextFilter {
  operator:
    | "contains"
    | "equals"
    | "not_contains"
    | "starts_with"
    | "ends_with"
    | "empty"
    | "not_empty"
    | "search"; // quick search (LIKE)
  value: string;
}

export interface NumberFilter {
  operator: "=" | "!=" | "<" | ">" | "<=" | ">=" | "between";
  value: number | null;
  valueTo: number | null; // for "between"
}

export interface DateFilter {
  operator: "between" | "equals" | "before" | "after";
  value: string; // yyyy-mm-dd
  valueTo: string; // for "between"
}

export interface SelectFilter {
  allowed: Set<string>;
}

export type ColumnFilterValue = TextFilter | NumberFilter | DateFilter | SelectFilter;

const props = defineProps<{
  filterType: FilterType;
  columnKey: string;
  title: string;
  items: Record<string, any>[];
  modelValue: ColumnFilterValue | null;
  dropdownStyle?: Record<string, string>;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ColumnFilterValue | null];
  close: [];
}>();

// ── Text filter state ────────────────────────────────────────────────────
const textOperator = ref<TextFilter["operator"]>("contains");
const textValue = ref("");

// ── Quick search (LIKE) state ────────────────────────────────────────────
const quickSearch = ref("");

// ── Number filter state ──────────────────────────────────────────────────
const numOperator = ref<NumberFilter["operator"]>("=");
const numValue = ref<string>("");
const numValueTo = ref<string>("");

// ── Date filter state ────────────────────────────────────────────────────
const dateOperator = ref<DateFilter["operator"]>("between");
const dateValue = ref("");
const dateValueTo = ref("");

// ── Select filter state ──────────────────────────────────────────────────
const selectAllChecked = ref(true);
const selectValues = ref<Record<string, boolean>>({});

// Track last column key to only sync from model when column changes
const lastSyncedKey = ref("");

// Initialize from modelValue — only when column changes (not on every emit)
const initFromModel = () => {
  const v = props.modelValue;
  if (!v) {
    textOperator.value = "contains";
    textValue.value = "";
    numOperator.value = "=";
    numValue.value = "";
    numValueTo.value = "";
    dateOperator.value = "between";
    dateValue.value = "";
    dateValueTo.value = "";
    quickSearch.value = "";
    // For select: default all checked
    if (props.filterType === "select") {
      const newObj: Record<string, boolean> = {};
      for (const v2 of uniqueSelectValues.value) newObj[v2] = true;
      selectValues.value = newObj;
      selectAllChecked.value = true;
    } else {
      selectValues.value = {};
      selectAllChecked.value = true;
    }
    return;
  }

  if (props.filterType === "text" && "operator" in v && "value" in v) {
    const tf = v as TextFilter;
    if (tf.operator === "search") {
      quickSearch.value = tf.value;
      textOperator.value = "contains";
      textValue.value = "";
    } else {
      textOperator.value = tf.operator;
      textValue.value = tf.value;
      quickSearch.value = "";
    }
  } else if (props.filterType === "number" && "operator" in v) {
    numOperator.value = (v as NumberFilter).operator;
    numValue.value = String((v as NumberFilter).value ?? "");
    numValueTo.value = String((v as NumberFilter).valueTo ?? "");
    quickSearch.value = "";
  } else if (props.filterType === "date" && "operator" in v) {
    dateOperator.value = (v as DateFilter).operator;
    dateValue.value = (v as DateFilter).value;
    dateValueTo.value = (v as DateFilter).valueTo;
    quickSearch.value = "";
  } else if (props.filterType === "select" && "allowed" in v) {
    const allowed = (v as SelectFilter).allowed;
    const newObj: Record<string, boolean> = {};
    for (const v2 of uniqueSelectValues.value) {
      newObj[v2] = allowed.has(v2);
    }
    selectValues.value = newObj;
    selectAllChecked.value = Object.values(newObj).every(Boolean);
    quickSearch.value = "";
  }
};

// ── Unique values for select ─────────────────────────────────────────────
const uniqueSelectValues = computed(() => {
  const vals = new Set<string>();
  for (const item of props.items) {
    vals.add(String(item[props.columnKey] ?? ""));
  }
  return Array.from(vals).sort((a, b) =>
    a.localeCompare(b, "id", { numeric: true }),
  );
});

// Ensure selectValues always has ALL unique values as keys
const ensureAllKeys = () => {
  const obj = { ...selectValues.value };
  let changed = false;
  for (const v of uniqueSelectValues.value) {
    if (!(v in obj)) {
      obj[v] = true;
      changed = true;
    }
  }
  if (changed) selectValues.value = obj;
};

// Initialize select values & sync from model when column changes
watch(
  () => [props.items, props.columnKey],
  () => {
    if (props.filterType === "select") {
      const newObj: Record<string, boolean> = {};
      for (const v of uniqueSelectValues.value) {
        newObj[v] = selectValues.value[v] ?? true;
      }
      selectValues.value = newObj;
      selectAllChecked.value = Object.values(newObj).every(Boolean);
    }
    ensureAllKeys();
    // Sync from model when column key changes (not on every model emit)
    if (props.columnKey !== lastSyncedKey.value) {
      lastSyncedKey.value = props.columnKey;
      initFromModel();
    }
  },
  { immediate: true },
);

// ── Click outside to close ──────────────────────────────────────────────
const dropdownRef = ref<HTMLElement | null>(null);
const onDocClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".cf-dropdown") && !target.closest(".col-filter-btn") && !target.closest(".vpf-filter-btn") && !target.closest(".vpf-popup") && !target.closest(".ds-date-menu")) {
    emit("close");
  }
};
onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

// ── Filtered unique values for select search ─────────────────────────────
const filteredSelectValues = computed(() => {
  const q = quickSearch.value.trim().toLowerCase();
  const all = uniqueSelectValues.value;
  return q ? all.filter((v) => v.toLowerCase().includes(q)) : all;
});

// ── Select actions ───────────────────────────────────────────────────────
// ── Live emit for select checkboxes ─────────────────────────────────────
// Centang/hilang centang langsung menerapkan filter (tanpa perlu OK),
// sama seperti quick search. Logika identik dengan cabang select applyFilter.
const emitSelectLive = () => {
  const allCount = uniqueSelectValues.value.length;
  const checkedCount = Object.values(selectValues.value).filter(Boolean).length;
  if (checkedCount !== allCount) {
    const allowed = new Set<string>();
    for (const [key, val] of Object.entries(selectValues.value)) {
      if (val) allowed.add(key);
    }
    emit("update:modelValue", { allowed } as SelectFilter);
  } else {
    const q = quickSearch.value.trim();
    if (q) {
      emit("update:modelValue", { operator: "search", value: q } as TextFilter);
    } else {
      emit("update:modelValue", null);
    }
  }
};

const toggleSelectAll = async () => {
  ensureAllKeys();
  await nextTick();
  const newVal = !selectAllChecked.value;
  selectAllChecked.value = newVal;
  const newObj: Record<string, boolean> = {};
  for (const v of uniqueSelectValues.value) {
    newObj[v] = newVal;
  }
  selectValues.value = newObj;
  emitSelectLive();
};

const toggleSelectVal = (val: string) => {
  ensureAllKeys();
  const newObj = { ...selectValues.value, [val]: !(selectValues.value[val] ?? true) };
  selectValues.value = newObj;
  selectAllChecked.value = Object.values(newObj).every(Boolean);
  emitSelectLive();
};

// ── Quick search (LIKE) — live filter per kolom ──────────────────────────
const emitQuickSearch = () => {
  const q = quickSearch.value.trim();
  if (q) {
    emit("update:modelValue", { operator: "search", value: q } as TextFilter);
  } else {
    emit("update:modelValue", null);
  }
};
watch(quickSearch, emitQuickSearch);

// ── Apply filter ─────────────────────────────────────────────────────────
const applyFilter = () => {
  const q = quickSearch.value.trim();
  if (props.filterType === "select") {
    // Seleksi nilai eksplisit menang; jika tidak ada yang diubah, pakai pencarian cepat
    const allCount = uniqueSelectValues.value.length;
    const checkedCount = Object.values(selectValues.value).filter(Boolean).length;
    if (checkedCount !== allCount) {
      const allowed = new Set<string>();
      for (const [key, val] of Object.entries(selectValues.value)) {
        if (val) allowed.add(key);
      }
      emit("update:modelValue", { allowed } as SelectFilter);
    } else if (q) {
      emit("update:modelValue", { operator: "search", value: q } as TextFilter);
    } else {
      emit("update:modelValue", null);
    }
    emit("close");
    return;
  }
  if (q) {
    emit("update:modelValue", { operator: "search", value: q } as TextFilter);
    emit("close");
    return;
  }
  if (props.filterType === "text") {
    if (!textValue.value && textOperator.value !== "empty" && textOperator.value !== "not_empty") {
      emit("update:modelValue", null);
    } else {
      emit("update:modelValue", {
        operator: textOperator.value,
        value: textValue.value,
      } as TextFilter);
    }
  } else if (props.filterType === "number") {
    const num = numValue.value !== "" ? Number(numValue.value) : null;
    if (num === null && numOperator.value !== "between") {
      emit("update:modelValue", null);
    } else if (numOperator.value === "between") {
      const to = numValueTo.value !== "" ? Number(numValueTo.value) : null;
      if (num === null && to === null) {
        emit("update:modelValue", null);
      } else {
        emit("update:modelValue", {
          operator: "between",
          value: num,
          valueTo: to,
        } as NumberFilter);
      }
    } else {
      emit("update:modelValue", {
        operator: numOperator.value,
        value: num,
        valueTo: null,
      } as NumberFilter);
    }
  } else if (props.filterType === "date") {
    if (!dateValue.value && dateOperator.value !== "between") {
      emit("update:modelValue", null);
    } else if (dateOperator.value === "between") {
      if (!dateValue.value && !dateValueTo.value) {
        emit("update:modelValue", null);
      } else {
        emit("update:modelValue", {
          operator: "between",
          value: dateValue.value,
          valueTo: dateValueTo.value,
        } as DateFilter);
      }
    } else {
      emit("update:modelValue", {
        operator: dateOperator.value,
        value: dateValue.value,
        valueTo: "",
      } as DateFilter);
    }
  }
  emit("close");
};

const clearFilter = () => {
  quickSearch.value = "";
  emit("update:modelValue", null);
  emit("close");
};

const isActive = computed(() => props.modelValue !== null);

const textOperators = [
  { value: "contains", label: "Mengandung" },
  { value: "equals", label: "Sama dengan" },
  { value: "not_contains", label: "Tidak mengandung" },
  { value: "starts_with", label: "Diawali" },
  { value: "ends_with", label: "Diakhiri" },
  { value: "empty", label: "Kosong" },
  { value: "not_empty", label: "Tidak kosong" },
];

const numberOperators = [
  { value: "=", label: "=" },
  { value: "!=", label: "≠" },
  { value: "<", label: "<" },
  { value: ">", label: ">" },
  { value: "<=", label: "≤" },
  { value: ">=", label: "≥" },
  { value: "between", label: "Antara" },
];

const dateOperators = [
  { value: "between", label: "Antara" },
  { value: "equals", label: "Sama dengan" },
  { value: "before", label: "Sebelum" },
  { value: "after", label: "Sesudah" },
];
</script>

<template>
  <div
    class="cf-dropdown"
    :style="dropdownStyle"
    @click.stop
  >
      <!-- Header -->
      <div class="cf-header">
        <IconFilter :size="12" :stroke-width="2" class="cf-header-icon" />
        <span class="cf-header-title">{{ title }}</span>
        <button v-if="isActive" class="cf-clear-btn" @click="clearFilter" title="Hapus filter">
          <IconX :size="12" :stroke-width="2" />
        </button>
      </div>

      <!-- Quick search (LIKE) — filter baris per kolom -->
      <div class="cf-section cf-section-search">
        <!-- <div class="cf-sec-label">Cari cepat</div> -->
        <div class="cf-search-row">
          <IconSearch :size="12" class="cf-search-icon" />
          <input
            v-model="quickSearch"
            type="text"
            class="cf-search-input"
            placeholder="Cari baris di kolom ini..."
            @keydown.enter="applyFilter"
          />
        </div>
      </div>

      <!-- TEXT filter -->
      <template v-if="filterType === 'text'">
        <div class="cf-body">
          <div class="cf-sec-label">Filter lanjutan</div>
          <div class="cf-row">
            <select v-model="textOperator" class="cf-select">
              <option v-for="op in textOperators" :key="op.value" :value="op.value">
                {{ op.label }}
              </option>
            </select>
          </div>
          <div v-if="textOperator !== 'empty' && textOperator !== 'not_empty'" class="cf-row">
            <input
              v-model="textValue"
              type="text"
              class="cf-input"
              placeholder="Nilai..."
              @keydown.enter="applyFilter"
            />
          </div>
        </div>
      </template>

      <!-- NUMBER filter -->
      <template v-else-if="filterType === 'number'">
        <div class="cf-body">
          <div class="cf-sec-label">Filter lanjutan</div>
          <div class="cf-row">
            <select v-model="numOperator" class="cf-select">
              <option v-for="op in numberOperators" :key="op.value" :value="op.value">
                {{ op.label }}
              </option>
            </select>
          </div>
          <div v-if="numOperator !== 'between'" class="cf-row">
            <input
              v-model="numValue"
              type="number"
              class="cf-input"
              placeholder="Nilai..."
              @keydown.enter="applyFilter"
            />
          </div>
          <div v-else class="cf-row-between">
            <label class="cf-label">Dari</label>
            <input
              v-model="numValue"
              type="number"
              class="cf-input"
              placeholder="0"
              @keydown.enter="applyFilter"
            />
            <label class="cf-label">Sampai</label>
            <input
              v-model="numValueTo"
              type="number"
              class="cf-input"
              placeholder="0"
              @keydown.enter="applyFilter"
            />
          </div>
        </div>
      </template>

      <!-- DATE filter -->
      <template v-else-if="filterType === 'date'">
        <div class="cf-body">
          <div class="cf-sec-label">Filter lanjutan</div>
          <div class="cf-row">
            <select v-model="dateOperator" class="cf-select">
              <option v-for="op in dateOperators" :key="op.value" :value="op.value">
                {{ op.label }}
              </option>
            </select>
          </div>
          <div v-if="dateOperator !== 'between'" class="cf-row">
            <DsDatePicker v-model="dateValue" variant="form" class="cf-input" @keydown.enter="applyFilter" />
          </div>
          <div v-else class="cf-row-between">
            <label class="cf-label">Dari</label>
            <DsDatePicker v-model="dateValue" variant="form" class="cf-input" @keydown.enter="applyFilter" />
            <label class="cf-label">Sampai</label>
            <DsDatePicker v-model="dateValueTo" variant="form" class="cf-input" @keydown.enter="applyFilter" />
          </div>
        </div>
      </template>

      <!-- SELECT filter (checkbox) -->
      <template v-else-if="filterType === 'select'">
        <div class="cf-body cf-body-select">
          <div class="cf-sec-label">Pilih nilai</div>
          <div v-if="quickSearch.trim()" class="cf-live-note">
            Baris ikut terfilter: mengandung "{{ quickSearch }}"
          </div>
          <div class="cf-select-actions">
            <button class="cf-action-btn" @click="toggleSelectAll">
              {{ selectAllChecked ? "Sembunyikan Semua" : "Tampilkan Semua" }}
            </button>
          </div>
          <div class="cf-divider" />
          <div class="cf-select-list">
            <label
              v-for="val in filteredSelectValues"
              :key="val"
              class="cf-select-item"
            >
              <input
                type="checkbox"
                :checked="selectValues[val]"
                @change="toggleSelectVal(val)"
              />
              <span class="cf-select-val">{{ val === "" ? "(Kosong)" : val }}</span>
            </label>
            <div v-if="filteredSelectValues.length === 0" class="cf-select-empty">
              Tidak ada hasil
            </div>
          </div>
        </div>
      </template>

      <!-- Footer -->
      <div class="cf-footer">
        <button v-if="isActive" class="cf-clear-footer-btn" @click="clearFilter">
          Bersihkan
        </button>
        <div class="cf-footer-spacer" />
        <button class="cf-ok-btn" @click="applyFilter">OK</button>
      </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles for non-select parts */
</style>

<style>
/* ── ColumnFilter Dropdown — global (teleported to body) ── */
.cf-dropdown {
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  width: 190px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "Plus Jakarta Sans", system-ui, sans-serif;
  z-index: 9999;
}
.cf-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: #F0F3F8;
  border-bottom: 1px solid var(--ds-border, #A0AAB8);
}
.cf-header-icon {
  color: var(--ds-primary, #3B5998);
}
.cf-header-title {
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.cf-clear-btn {
  border: none;
  background: none;
  color: #c62828;
  cursor: pointer;
  padding: 1px;
  display: flex;
  align-items: center;
}
.cf-clear-btn:hover {
  background: rgba(198, 40, 40, 0.1);
  border-radius: 2px;
}

/* Body */
.cf-body {
  padding: 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cf-body-select {
  padding: 0;
}
.cf-row {
  display: flex;
}
.cf-row-between {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cf-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.cf-sep {
  display: none;
}

/* Inputs */
.cf-input {
  width: 100%;
  height: 26px;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.cf-input:focus {
  border-color: var(--ds-primary, #3B5998);
}
.cf-input-half {
  width: 100%;
}
.cf-select {
  width: 100%;
  height: 26px;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
.cf-select:focus {
  border-color: var(--ds-primary, #3B5998);
}

/* Search row (select type) */
.cf-search-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px 3px;
}
.cf-search-icon {
  color: rgba(var(--v-theme-on-surface), 0.35);
  flex-shrink: 0;
}
.cf-search-input {
  flex: 1;
  height: 24px;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.cf-search-input:focus {
  border-color: var(--ds-primary, #3B5998);
}

/* Section: pembatas antar bagian dropdown */
.cf-section {
  padding: 5px 6px 6px;
  border-bottom: 1px solid var(--ds-border-light, #C4CAD3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cf-section-search .cf-search-row {
  padding: 0;
}
.cf-sec-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.cf-body-select .cf-sec-label {
  padding: 6px 6px 0;
}
.cf-live-note {
  font-size: 10px;
  line-height: 1.4;
  color: var(--ds-primary, #3B5998);
  background: var(--ds-primary-50, #E8EDF5);
  padding: 3px 6px;
  margin: 4px 6px 2px;
}

/* Select actions */
.cf-select-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 3px;
}
.cf-action-btn {
  background: none;
  border: none;
  font-size: 10px;
  color: var(--ds-primary, #3B5998);
  cursor: pointer;
  padding: 1px 0;
}
.cf-action-btn:hover {
  text-decoration: underline;
}

/* Divider */
.cf-divider {
  height: 1px;
  background: var(--ds-border, #A0AAB8);
}

/* Select list */
.cf-select-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 2px 0;
}
.cf-select-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.1s;
}
.cf-select-item:hover {
  background: #E8EDF5;
}
.cf-select-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--ds-primary, #3B5998);
}
.cf-select-val {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cf-select-empty {
  padding: 6px 8px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-align: center;
}

/* Footer */
.cf-footer {
  padding: 4px 6px;
  border-top: 1px solid var(--ds-border, #A0AAB8);
  display: flex;
  align-items: center;
  gap: 4px;
}
.cf-footer-spacer {
  flex: 1;
}
.cf-clear-footer-btn {
  background: none;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  color: #c62828;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}
.cf-clear-footer-btn:hover {
  background: rgba(198, 40, 40, 0.08);
}
.cf-ok-btn {
  background: var(--ds-primary, #3B5998);
  color: white;
  border: none;
  border-radius: 0;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cf-ok-btn:hover {
  opacity: 0.88;
}
</style>
