<script setup lang="ts">
import { ref } from "vue";
import { prettyField } from "@/lib/pivot/fieldLabel";
/**
 * Field header area (ala DevExpress PivotGrid).
 *
 * Susunan sesuai perilaku Delphi: Nilai di kiri-atas, Baris tepat di bawahnya,
 * Kolom di sebelah kanan. Filter menempel pada field yang di-drag
 * (tombol di tiap chip), bukan baris filter terpisah.
 * Tiap zona punya header strip sendiri agar label tidak menabrak chip.
 */
type Area = "row" | "column" | "value";

interface FieldChip {
  field: string;
  label?: string;
  aggregation?: string;
}

const props = defineProps<{
  rowFields: string[];
  columnFields: string[];
  valueFields: FieldChip[];
  aggregationOptions: { value: string; label: string }[];
  /** Field yang sedang punya filter aktif (di-highlight). */
  activeFilterFields: string[];
  /** Field yang punya filter tersedia untuk dibuka. */
  filterableFields: string[];
}>();

const emit = defineEmits<{
  (e: "assign", payload: { field: string; area: Area }): void;
  (e: "remove", payload: { area: Area; field: string }): void;
  (
    e: "move",
    payload: { from: { area: Area; index: number }; to: { area: Area; index: number } },
  ): void;
  (e: "update-aggregation", payload: { field: string; aggregation: string }): void;
  (e: "open-filter", payload: { field: string; event: MouseEvent }): void;
}>();

const dragging = ref<{ area: Area | null; index: number; field: string } | null>(null);

function onDragStart(area: Area, index: number, field: string) {
  dragging.value = { area, index, field };
}
function onDrop(targetArea: Area, targetIndex: number, event: DragEvent) {
  const d = dragging.value;
  dragging.value = null;
  // Drag dari dalam area → move antar area (perilaku lama).
  if (d && d.area !== null) {
    emit("move", {
      from: { area: d.area, index: d.index },
      to: { area: targetArea, index: targetIndex },
    });
    return;
  }
  // Drag dari luar (panel "Field tersedia") → assign ke zona tujuan.
  const field = event.dataTransfer?.getData("application/x-bsm-field") || event.dataTransfer?.getData("text/plain");
  if (field) emit("assign", { field, area: targetArea });
}
const hasFilter = (field: string) => props.activeFilterFields.includes(field);
const canFilter = (field: string) => props.filterableFields.includes(field);
</script>

<template>
  <div class="pfa">
    <div class="pfa-left">
      <!-- Nilai -->
      <div
        class="pfa-zone pfa-data"
        @dragover.prevent
        @drop="onDrop('value', valueFields.length, $event)"
      >
        <div class="pfa-zone-head">Nilai</div>
        <div class="pfa-zone-body">
          <div
            v-for="(vf, i) in valueFields"
            :key="`v-${vf.field}`"
            class="pfa-chip"
            draggable="true"
            @dragstart="onDragStart('value', i, vf.field)"
            @dragover.prevent
            @drop.stop="onDrop('value', i, $event)"
          >
            <span class="pfa-name" :title="vf.field">{{ prettyField(vf.field) }}</span>
            <select
              class="pfa-agg"
              :value="vf.aggregation"
              title="Agregasi"
              @change="emit('update-aggregation', { field: vf.field, aggregation: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="o in aggregationOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <button
              v-if="canFilter(vf.field)"
              type="button"
              class="pfa-filter"
              :class="{ on: hasFilter(vf.field) }"
              title="Filter field ini"
              @click="emit('open-filter', { field: vf.field, event: $event })"
            >
              ▼
            </button>
            <button type="button" class="pfa-x" title="Hapus" @click="emit('remove', { area: 'value', field: vf.field })">×</button>
          </div>
        </div>
      </div>

      <!-- Baris -->
      <div
        class="pfa-zone pfa-row"
        @dragover.prevent
        @drop="onDrop('row', rowFields.length, $event)"
      >
        <div class="pfa-zone-head">Baris</div>
        <div class="pfa-zone-body">
          <div
            v-for="(f, i) in rowFields"
            :key="`r-${f}`"
            class="pfa-chip"
            draggable="true"
            @dragstart="onDragStart('row', i, f)"
            @dragover.prevent
            @drop.stop="onDrop('row', i, $event)"
          >
            <span class="pfa-name" :title="f">{{ prettyField(f) }}</span>
            <button
              v-if="canFilter(f)"
              type="button"
              class="pfa-filter"
              :class="{ on: hasFilter(f) }"
              title="Filter field ini"
              @click="emit('open-filter', { field: f, event: $event })"
            >
              ▼
            </button>
            <button type="button" class="pfa-x" title="Hapus" @click="emit('remove', { area: 'row', field: f })">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kolom -->
    <div
      class="pfa-zone pfa-column"
      @dragover.prevent
      @drop="onDrop('column', columnFields.length, $event)"
    >
      <div class="pfa-zone-head">Kolom</div>
      <div class="pfa-zone-body">
        <div
          v-for="(f, i) in columnFields"
          :key="`c-${f}`"
          class="pfa-chip"
          draggable="true"
          @dragstart="onDragStart('column', i, f)"
          @dragover.prevent
          @drop.stop="onDrop('column', i, $event)"
        >
          <span class="pfa-name" :title="f">{{ prettyField(f) }}</span>
          <button
            v-if="canFilter(f)"
            type="button"
            class="pfa-filter"
            :class="{ on: hasFilter(f) }"
            title="Filter field ini"
            @click="emit('open-filter', { field: f, event: $event })"
          >
            ▼
          </button>
          <button type="button" class="pfa-x" title="Hapus" @click="emit('remove', { area: 'column', field: f })">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pfa {
  display: grid;
  grid-template-columns: minmax(240px, 320px) 1fr;
  gap: 4px;
  flex-shrink: 0;
}
.pfa-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Zona ── */
.pfa-zone {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
}
.pfa-zone-head {
  flex-shrink: 0;
  padding: 3px 8px;
  background: var(--ds-surface, #f0f3f8);
  border-bottom: 1px solid var(--ds-border-light, #c4cad3);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ds-primary-dark, #2c4472);
}
.pfa-zone-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
  padding: 6px;
  min-height: 40px;
}

/* ── Chip ── */
.pfa-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 23px;
  padding: 0 4px;
  border: 1px solid var(--ds-primary, #3b5998);
  background: #fff;
  cursor: grab;
  max-width: 100%;
  box-sizing: border-box;
}
.pfa-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-text, #1b2d4a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}
.pfa-agg {
  height: 19px;
  min-width: 0;
  max-width: 96px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: #fff;
  font-size: 10px;
  color: var(--ds-text, #1b2d4a);
}

/* ── Tombol kontrol (filter & hapus) — seragam 20px ── */
.pfa-filter,
.pfa-x {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--ds-border, #a0aab8);
  background: var(--ds-surface, #f0f3f8);
  cursor: pointer;
  font-size: 9px;
  line-height: 1;
}
.pfa-filter {
  color: var(--ds-text-muted, #8494a7);
}
.pfa-filter:hover {
  background: var(--ds-primary, #3b5998);
  border-color: var(--ds-primary, #3b5998);
  color: #fff;
}
.pfa-filter.on {
  background: var(--ds-primary, #3b5998);
  border-color: var(--ds-primary, #3b5998);
  color: #fff;
}
.pfa-x {
  color: #c62828;
  font-size: 13px;
}
.pfa-x:hover {
  background: #c62828;
  border-color: #c62828;
  color: #fff;
}
.pfa-filter:focus-visible,
.pfa-x:focus-visible {
  outline: 2px solid var(--ds-primary, #3b5998);
  outline-offset: 1px;
}
</style>