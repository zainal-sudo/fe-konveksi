<script setup lang="ts">
/**
 * Modal drill-down: baris sumber yang membentuk sel pivot yang diklik.
 * Memakai v-dialog agar Escape dan fokus keyboard ditangani framework.
 */
import { computed } from "vue";
import type { DrillThroughDescriptor } from "@/lib/pivot/drillthrough";

const props = defineProps<{
  modelValue: boolean;
  rows: Record<string, unknown>[];
  descriptor: DrillThroughDescriptor | null;
}>();

const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const columns = computed(() => {
  const first = props.rows[0];
  return first ? Object.keys(first) : [];
});

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

const activeModel = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});
</script>

<template>
  <v-dialog v-model="activeModel" max-width="900" scrollable>
    <v-card rounded="false">
      <v-card-item class="drill-head">
        <v-card-title class="text-body-2 font-weight-bold">
          Rincian sel
          <span v-if="descriptor" class="drill-desc">
            {{ descriptor.aggregation }} {{ descriptor.valueField }} =
            <strong>{{ descriptor.formattedValue }}</strong>
          </span>
        </v-card-title>
        <v-card-subtitle v-if="descriptor" class="text-caption">
          {{ descriptor.rowCount }} baris sumber
          <template v-if="descriptor.rowPath.length">
            | Baris: {{ descriptor.rowPath.filter(Boolean).join(" / ") }}
          </template>
          <template v-if="descriptor.columnPath.length">
            | Kolom: {{ descriptor.columnPath.filter(Boolean).join(" / ") }}
          </template>
        </v-card-subtitle>
      </v-card-item>
      <v-card-text class="drill-body">
        <div v-if="rows.length === 0" class="drill-empty">Tidak ada baris sumber.</div>
        <table v-else class="drill-table">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i">
              <td v-for="c in columns" :key="c">{{ fmt(r[c]) }}</td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="activeModel = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.drill-head {
  border-bottom: 1px solid var(--ds-border, #a0aab8);
}
.drill-desc {
  margin-left: 8px;
  color: var(--ds-text-secondary, #5a6a7e);
  font-weight: 400;
}
.drill-body {
  max-height: 60vh;
  overflow: auto;
}
.drill-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 11px;
}
.drill-table th,
.drill-table td {
  border: 1px solid var(--ds-border-light, #c4cad3);
  padding: 2px 6px;
  white-space: nowrap;
  text-align: left;
}
.drill-table th {
  position: sticky;
  top: 0;
  background: var(--ds-primary, #3b5998);
  color: #fff;
}
.drill-empty {
  color: var(--ds-text-muted, #8494a7);
  font-size: 12px;
}
</style>
