<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  IconSearch,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-vue";

export interface SearchColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    columns: SearchColumn[];
    items: any[];
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: string[]; // kolom yang ikut disearch, default semua
    serverSearch?: boolean; // true = search dikirim ke parent via @search
    itemsPerPage?: number;
    // Multi-select: tambahkan kolom checkbox + tombol konfirmasi (emits
    // select-multiple). Tidak mengubah perilaku pemakai yang tak set prop ini.
    multiselect?: boolean;
    itemKey?: string;
  }>(),
  {
    loading: false,
    searchable: true,
    searchPlaceholder: "Cari...",
    searchKeys: () => [],
    serverSearch: false,
    itemsPerPage: 50,
    multiselect: false,
    itemKey: "kode",
  },
);

const emit = defineEmits<{
  "update:modelValue": [val: boolean];
  select: [item: any];
  search: [query: string]; // hanya emit kalau serverSearch=true
  "select-multiple": [items: any[]];
}>();

// ── Multi-select state ────────────────────────────────────────────────
// Disimpan di Map agar pilihan tetap ada walau daftar berubah efek
// search/halaman (serverSearch mengganti props.items).
const selectedMap = ref<Map<string, any>>(new Map());

const keyOf = (item: any): string =>
  props.multiselect && props.itemKey ? String(item[props.itemKey]) : JSON.stringify(item);

const isSelected = (item: any) => selectedMap.value.has(keyOf(item));

const toggleRow = (item: any) => {
  const k = keyOf(item);
  if (selectedMap.value.has(k)) selectedMap.value.delete(k);
  else selectedMap.value.set(k, item);
};

const visibleItems = computed(() => filteredItems.value); // hasil search/halaman aktif

const allVisibleSelected = computed(
  () =>
    visibleItems.value.length > 0 &&
    visibleItems.value.every((it) => selectedMap.value.has(keyOf(it))),
);

const toggleAllVisible = () => {
  if (allVisibleSelected.value) {
    visibleItems.value.forEach((it) => selectedMap.value.delete(keyOf(it)));
  } else {
    visibleItems.value.forEach((it) => selectedMap.value.set(keyOf(it), it));
  }
};

const confirmMulti = () => {
  emit("select-multiple", Array.from(selectedMap.value.values()));
};

const searchQuery = ref("");
const currentPage = ref(1);

const filteredItems = computed(() => {
  if (props.serverSearch || !searchQuery.value) return props.items;
  const q = searchQuery.value.toLowerCase();
  const keys = props.searchKeys.length
    ? props.searchKeys
    : props.columns.map((c) => c.key);
  return props.items.filter((item) =>
    keys.some((k) =>
      String(item[k] ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
});

// Hitung total halaman
const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / props.itemsPerPage) || 1;
});

// Potong data sesuai halaman aktif
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  const end = start + props.itemsPerPage;
  return filteredItems.value.slice(start, end);
});

// Reset halaman ketika pencarian berubah
watch(searchQuery, () => {
  currentPage.value = 1;
});

// Reset halaman & pencarian ketika modal dibuka
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      searchQuery.value = "";
      currentPage.value = 1;
      selectedMap.value = new Map(); // reset pilihan multi tiap buka modal
    }
  },
);

const onSearchInput = () => {
  if (props.serverSearch) emit("search", searchQuery.value);
};

const close = () => {
  searchQuery.value = "";
  emit("update:modelValue", false);
};

const select = (item: any) => {
  emit("select", item);
  searchQuery.value = "";
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const formatValue = (val: any) => {
  if (typeof val === "number") {
    return new Intl.NumberFormat("id-ID").format(val);
  }
  return val ?? "";
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="850"
    scrollable
  >
    <v-card rounded="lg" class="search-modal-card">
      <!-- Header -->
      <div class="sm-header">
        <IconSearch :size="15" :stroke-width="1.8" class="sm-header-icon" />
        <span class="sm-header-title">{{ title }}</span>
        <button class="sm-close-btn" @click="close">
          <IconX :size="14" :stroke-width="2.2" />
        </button>
      </div>

      <!-- Toolbar opsional (mis. input qty default multi-select) -->
      <div v-if="$slots.toolbar" class="sm-toolbar">
        <slot name="toolbar" />
      </div>

      <!-- Search input -->
      <div v-if="searchable" class="sm-search-bar">
        <div class="sm-search-wrap">
          <IconSearch :size="13" :stroke-width="1.8" class="sm-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="sm-search-input"
            @input="onSearchInput"
            autofocus
          />
        </div>
      </div>

      <!-- Table -->
      <v-card-text class="sm-body pa-0">
        <table class="sm-table">
          <thead>
            <tr>
              <th
                v-if="multiselect"
                style="width: 34px; text-align: center"
              >
                <input
                  type="checkbox"
                  class="sm-check"
                  :checked="allVisibleSelected"
                  @click.stop="toggleAllVisible"
                  @change="toggleAllVisible"
                />
              </th>
              <th
                v-for="col in columns"
                :key="col.key"
                :style="{ width: col.width, textAlign: col.align || 'left' }"
              >
                {{ col.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading state — tampil di dalam tabel, bukan replace tabel -->
            <tr v-if="loading">
              <td :colspan="columns.length + (multiselect ? 1 : 0)" class="sm-empty">
                <div class="d-flex align-center justify-center gap-2">
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    size="16"
                    width="2"
                  />
                  <span>Memuat data...</span>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="(item, idx) in paginatedItems"
              :key="idx"
              class="sm-row"
              :class="{ 'sm-row-selected': multiselect && isSelected(item) }"
              @click="multiselect ? toggleRow(item) : select(item)"
            >
              <td
                v-if="multiselect"
                style="text-align: center"
                @click.stop
              >
                <input
                  type="checkbox"
                  class="sm-check"
                  :checked="isSelected(item)"
                  @change="toggleRow(item)"
                />
              </td>
              <td
                v-for="col in columns"
                :key="col.key"
                :style="{ textAlign: col.align || 'left' }"
              >
                <slot
                  :name="`cell.${col.key}`"
                  :item="item"
                  :value="item[col.key]"
                >
                  {{ formatValue(item[col.key]) }}
                </slot>
              </td>
            </tr>
            <tr v-if="!loading && !paginatedItems.length">
              <td :colspan="columns.length + (multiselect ? 1 : 0)" class="sm-empty">
                Tidak ada data{{
                  searchQuery ? ` untuk "${searchQuery}"` : ""
                }}.
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>

      <!-- Footer info -->
      <div class="sm-footer">
        <span class="sm-count" v-if="loading">Memuat...</span>
        <span class="sm-count" v-else-if="multiselect && selectedMap.size">
          <span class="sm-selected-badge">{{ selectedMap.size }} dipilih</span>
          {{ (currentPage - 1) * itemsPerPage + 1 }} -
          {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }}
          dari {{ filteredItems.length }}
        </span>
        <span class="sm-count" v-else-if="filteredItems.length > 0">
          {{ (currentPage - 1) * itemsPerPage + 1 }} -
          {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }}
          dari {{ filteredItems.length }}
        </span>
        <span class="sm-count" v-else>0 data</span>

        <div class="sm-footer-right">
          <button
            v-if="multiselect"
            class="sm-confirm-btn"
            :disabled="!selectedMap.size"
            @click="confirmMulti"
          >
            Tambah Terpilih
            <span v-if="selectedMap.size" class="sm-confirm-n"
              >({{ selectedMap.size }})</span
            >
          </button>

          <div class="sm-pagination" v-if="totalPages > 1">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="prevPage"
            >
              <IconChevronLeft :size="16" />
            </button>
            <span class="page-info"
              >Hal {{ currentPage }} / {{ totalPages }}</span
            >
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              <IconChevronRight :size="16" />
            </button>
          </div>

          <v-btn size="small" variant="text" @click="close">Tutup</v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.search-modal-card {
  overflow: hidden;
}

/* Header */
.sm-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 10px;
  border-top: 3px solid #3B5998;
  background: rgb(var(--v-theme-surface));
  flex-shrink: 0;
}
.sm-header-icon {
  color: #3B5998;
  flex-shrink: 0;
}
.sm-header-title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  flex: 1;
}
.sm-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.45);
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.15s;
}
.sm-close-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.07);
  color: #c62828;
}

/* Toolbar opsional */
.sm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(59, 89, 152, 0.04);
  flex-shrink: 0;
}

/* Search bar */
.sm-search-bar {
  padding: 8px 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}
.sm-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 0 8px;
  height: 32px;
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.15s;
}
.sm-search-wrap:focus-within {
  border-color: #3B5998;
}
.sm-search-icon {
  color: rgba(var(--v-theme-on-surface), 0.4);
  flex-shrink: 0;
}
.sm-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
}

/* Body */
.sm-body {
  overflow-y: auto;
  max-height: 380px;
  min-height: 120px;
}
.sm-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  justify-content: center;
}

/* Table */
.sm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sm-table thead tr {
  background: #3B5998;
  position: sticky;
  top: 0;
  z-index: 1;
}
.sm-table th {
  color: white;
  font-weight: 700;
  font-size: 11px;
  padding: 6px 10px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.sm-table td {
  padding: 5px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  vertical-align: middle;
  white-space: nowrap;
}
.sm-row {
  cursor: pointer;
  transition: background 0.1s;
}
.sm-row:hover td {
  background: rgba(46, 46, 125, 0.07);
}
.sm-row:active td {
  background: rgba(46, 46, 125, 0.14);
}

/* Zebra */
.sm-table tbody tr:nth-of-type(even) td {
  background: rgba(var(--v-theme-on-surface), 0.015);
}
.sm-table tbody tr:nth-of-type(even):hover td {
  background: rgba(46, 46, 125, 0.07);
}

.sm-empty {
  text-align: center;
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
  font-size: 12px;
}

/* Footer */
.sm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.02);
  flex-shrink: 0;
}
.sm-count {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

/* Pagination di Footer */
.sm-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 2px;
}
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.15s;
}
.page-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.page-info {
  font-size: 11px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  padding: 0 4px;
}

/* ── Multi-select ────────────────────────────────────────────────────── */
.sm-check {
  cursor: pointer;
  accent-color: #3B5998;
  width: 14px;
  height: 14px;
  vertical-align: middle;
}
.sm-row-selected td {
  background: rgba(46, 46, 125, 0.06);
}
.sm-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sm-selected-badge {
  background: #3B5998;
  color: white;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 8px;
  margin-right: 6px;
  font-size: 10px;
}
.sm-confirm-btn {
  height: 28px;
  padding: 0 12px;
  background: #3B5998;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.sm-confirm-btn:hover:not(:disabled) {
  background: #2e4782;
}
.sm-confirm-btn:disabled {
  background: #c5cae9;
  cursor: not-allowed;
}
.sm-confirm-n {
  opacity: 0.85;
  font-weight: 600;
}
</style>
