<script setup lang="ts">
import { prettyField } from "@/lib/pivot/fieldLabel";
/**
 * Panel "Field tersedia": panel atas (di atas toolbar) ala DevExpress.
 * Tiap field = chip: label rapi + badge area terpakai + titik filter.
 * Chip di-drag langsung ke zona Baris/Kolom/Nilai di PivotFieldArea.
 * (Filter field TIDAK dari panel — hanya dari chip area Nilai/Baris/Kolom.)
 */
interface FieldInfo {
  field: string;
  isNumeric: boolean;
}

const props = defineProps<{
  availableFields: FieldInfo[];
  rowFields: string[];
  columnFields: string[];
  valueFields: { field: string }[];
  showRowTotals: boolean;
  showColumnTotals: boolean;
  activeFilterFields: string[];
}>();

const emit = defineEmits<{
  (e: "update:show-row-totals", value: boolean): void;
  (e: "update:show-column-totals", value: boolean): void;
}>();

const usedIn = (field: string): string | null => {
  if (props.rowFields.includes(field)) return "Baris";
  if (props.columnFields.includes(field)) return "Kolom";
  if (props.valueFields.some((v) => v.field === field)) return "Nilai";
  return null;
};
const hasFilter = (field: string) => props.activeFilterFields.includes(field);

// Panel hanya menampilkan field yang BELUM dipakai di area Baris/Kolom/Nilai —
// chip yang sudah dipakai "berpindah" ke area (tanpa sisa duplikat di panel).
const pooledFields = computed(() =>
  props.availableFields.filter((f) => !usedIn(f.field)),
);

// ── Drag dari panel ke zona Baris/Kolom/Nilai ─────────────────────────
import { computed, ref } from "vue";
const draggingField = ref<string | null>(null);
function onDragStart(e: DragEvent, field: string) {
  e.dataTransfer?.setData("application/x-bsm-field", field);
  e.dataTransfer?.setData("text/plain", field);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
  draggingField.value = field;
}
function onDragEnd() {
  draggingField.value = null;
}
</script>

<template>
  <div class="pfl">
    <span class="pfl-title">Field tersedia</span>
    <div class="pfl-pool">
      <div
        v-for="f in pooledFields"
        :key="f.field"
        class="pfl-field"
        :class="{ 'has-filter': hasFilter(f.field), dragging: draggingField === f.field }"
        draggable="true"
        @dragstart="onDragStart($event, f.field)"
        @dragend="onDragEnd"
      >
        <span class="pfl-field-name" :title="f.field">{{ prettyField(f.field) }}</span>
        <span v-if="hasFilter(f.field)" class="pfl-dot" title="Filter aktif">●</span>
      </div>
      <div v-if="pooledFields.length === 0" class="pfl-empty">Semua field sudah dipakai.</div>
    </div>

    <div class="pfl-totals">
      <label>
        <input
          type="checkbox"
          :checked="showRowTotals"
          @change="emit('update:show-row-totals', ($event.target as HTMLInputElement).checked)"
        />
        Total baris
      </label>
      <label>
        <input
          type="checkbox"
          :checked="showColumnTotals"
          @change="emit('update:show-column-totals', ($event.target as HTMLInputElement).checked)"
        />
        Total kolom
      </label>
    </div>
  </div>
</template>

<style scoped>
.pfl {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 11px;
  flex-wrap: wrap;
}
.pfl-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--ds-primary-dark, #2c4472);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.pfl-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}
.pfl-field {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
  max-width: 100%;
}
.pfl-field.has-filter {
  opacity: 1;
  border-color: var(--ds-primary, #3b5998);
  box-shadow: 0 0 0 1px var(--ds-primary, #3b5998);
}
.pfl-field.dragging {
  opacity: 0.45;
}
.pfl-field[draggable="true"] {
  cursor: grab;
}
.pfl-field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ds-text, #1b2d4a);
  font-weight: 600;
}
.pfl-dot {
  color: var(--ds-error, #dc2626);
  font-size: 7px;
  line-height: 1;
}

.pfl-empty {
  color: var(--ds-text-muted, #8494a7);
  font-size: 10px;
  font-style: italic;
}
.pfl-totals {
  display: flex;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
  border-left: 1px solid var(--ds-border-light, #c4cad3);
  padding-left: 10px;
}
.pfl-totals label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ds-text, #1b2d4a);
  cursor: pointer;
  white-space: nowrap;
}
</style>