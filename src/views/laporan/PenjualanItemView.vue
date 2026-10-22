<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconList, IconTable, IconChartBar } from "@tabler/icons-vue";
import {
  penjualanItemApi,
  type PenjualanItemRow,
} from "@/api/laporan/penjualanItemApi";
import { cabangApi, type Cabang } from "@/api/master/cabangApi";
import { useAuthStore } from "@/stores/authStore";
import DataPivot from "@/components/pivot/DataPivot.vue";

const toast = useToast();
const auth = useAuthStore();

// User pusat (cabang "00"/kosong) boleh memilih all cabang / pusat / cabang
const isPusat = computed(() => {
  const c = auth.userCabang;
  return !c || String(c) === "00";
});

// ── Periode / Filter Session Storage ──────────────────────────────────
const STORAGE_KEY = "finance_filter_penjualan_item";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getSaved = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.startDate && s?.endDate) return s;
  } catch {
    /* silent */
  }
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const saved = getSaved();

const filterState = ref({
  startDate: saved?.startDate ?? getLocal(firstDay),
  endDate: saved?.endDate ?? getLocal(now),
  cabang: saved?.cabang ?? "all",
});

// Daftar cabang untuk dropdown filter (hanya dipakai user pusat)
const cabangList = ref<Cabang[]>([]);
const loadCabangList = async () => {
  if (!isPusat.value) return;
  try {
    cabangList.value = await cabangApi.getAll();
  } catch {
    /* silent */
  }
};

const startDate = computed({
  get: () => filterState.value.startDate,
  set: (v) => {
    filterState.value = { ...filterState.value, startDate: v };
  },
});
const endDate = computed({
  get: () => filterState.value.endDate,
  set: (v) => {
    filterState.value = { ...filterState.value, endDate: v };
  },
});

const cabangFilter = computed({
  get: () => filterState.value.cabang,
  set: (v) => {
    filterState.value = { ...filterState.value, cabang: v };
  },
});

watch(
  filterState,
  (val) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {
      /* silent */
    }
    loadData();
  },
  { deep: true }
);

const filterValues = computed(() => ({ ...filterState.value }));

// ── Tab ───────────────────────────────────────────────────────────────
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<PenjualanItemRow[]>([]);
const isLoading = ref(false);
const selected = ref<PenjualanItemRow[]>([]);

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Bulan", title: "Bulan", width: "60px", align: "center" as const },
  { key: "Tahun", title: "Tahun", width: "60px", align: "center" as const },
  { key: "Nota", title: "Nota", width: "160px" },
  { key: "Tanggal", title: "Tanggal", width: "100px", align: "center" as const },
  { key: "Customer", title: "Customer", width: "200px" },
  { key: "Cabang", title: "Cabang", width: "120px" },
  { key: "Kode", title: "Kode Brg", width: "110px" },
  { key: "Nama", title: "Nama Barang", width: "220px" },
  { key: "Satuan", title: "Satuan", width: "80px", align: "center" as const },
  { key: "Kategori", title: "Kategori", width: "130px" },
  { key: "Qty", title: "Qty", width: "90px", align: "right" as const },
  { key: "Nilai", title: "Nilai", width: "130px", align: "right" as const },
  { key: "Disc", title: "Disc", width: "110px", align: "right" as const },
  { key: "Hpp", title: "HPP", width: "130px", align: "right" as const },
  { key: "Margin", title: "Margin", width: "130px", align: "right" as const },
];

// Baris TOTAL di bawah grid (kolom qty, nilai, margin)
const summaryColumns = [
  { key: "Qty", label: "Total Qty" },
  { key: "Nilai", label: "Total Nilai" },
  { key: "Margin", label: "Total Margin" },
];

// ── Load Data ─────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = await penjualanItemApi.getPenjualanItem(
      filterState.value.startDate,
      filterState.value.endDate,
      isPusat.value ? filterState.value.cabang : "self"
    );
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
  loadCabangList();
});

// ── Formatting ────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(Number(v || 0));

const fmtDate = (v: string) => {
  if (!v) return "-";
  const parts = String(v).split("T")[0].split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : v;
};

// ── Pivot (engine kustom ala BSM — baris subtotal + collapse ▸/▾) ─────
// Bangun plainData untuk pivot/chart (Bulan & Tahun dibuat string agar
// menjadi label, bukan angka rata-rata)
const buildPlainData = (): Record<string, any>[] =>
  items.value.map((r) => ({
    Bulan: String(r.Bulan),
    Tahun: String(r.Tahun),
    Nota: r.Nota ?? "",
    Tanggal: r.Tanggal ?? "",
    Customer: r.Customer ?? "",
    Cabang: r.Cabang ?? "",
    Kode: r.Kode ?? "",
    Nama: r.Nama ?? "",
    Satuan: r.Satuan ?? "",
    Kategori: r.Kategori ?? "",
    Qty: Number(r.Qty) || 0,
    Nilai: Number(r.Nilai) || 0,
    Disc: Number(r.Disc) || 0,
    Hpp: Number(r.Hpp) || 0,
    Margin: Number(r.Margin) || 0,
  }));

const pivotData = computed(() => buildPlainData());

const pivotValueFieldsDefault = [{ field: "Nilai", aggregation: "sum" }];
</script>

<template>
  <!-- ── Grid tab ── -->
  <div v-show="activeTab === 'grid'">
    <BaseBrowse
      title="Laporan Penjualan per Item"
      :icon="IconList"
      :headers="headers"
      :items="items"
      :is-loading="isLoading"
      :fixed-layout="false"
      item-value="Nota"
      v-model:selected="selected"
      :filter-values="filterValues"
      summary-key="Nilai"
      summary-label="Total Nilai Penjualan"
      :summary-columns="summaryColumns"
      @refresh="loadData"
    >
      <!-- ── Filter Periode ── -->
      <template #filter-left>
        <div class="filter-group">
          <span class="filter-lbl">Periode</span>
          <input v-model="startDate" type="date" class="date-inp" />
          <span class="filter-sep">s/d</span>
          <input v-model="endDate" type="date" class="date-inp" />
        </div>
        <div v-if="isPusat" class="filter-group">
          <span class="filter-lbl">Cabang</span>
          <select v-model="cabangFilter" class="cab-sel">
            <option value="all">All Cabang</option>
            <option v-for="c in cabangList" :key="c.kode" :value="c.kode">
              {{ c.nama || c.kode }}
            </option>
          </select>
        </div>
      </template>

      <template #filter-right-prepend>
        <div class="filter-divider" />
        <div class="tab-wrap">
          <button class="tab-btn active">
            <IconTable :size="13" :stroke-width="1.8" /> Grid Data
          </button>
          <button class="tab-btn" @click="activeTab = 'pivot'">
            <IconList :size="13" :stroke-width="1.8" /> Pivot
          </button>
          <button class="tab-btn" @click="activeTab = 'chart'">
            <IconChartBar :size="13" :stroke-width="1.8" /> Grafik
          </button>
        </div>
      </template>

      <!-- ── Custom Cells ── -->
      <template #item.Tanggal="{ value }">
        <span>{{ fmtDate(value) }}</span>
      </template>

      <template #item.Qty="{ value }">
        <span class="num-cell">{{ fmt(Number(value)) }}</span>
      </template>

      <template #item.Nilai="{ value }">
        <span class="num-cell text-primary font-weight-medium">
          {{ fmt(Number(value)) }}
        </span>
      </template>

      <template #item.Disc="{ value }">
        <span class="num-cell">{{ fmt(Number(value)) }}</span>
      </template>

      <template #item.Hpp="{ value }">
        <span class="num-cell">{{ fmt(Number(value)) }}</span>
      </template>

      <template #item.Margin="{ value }">
        <span class="num-cell" :class="Number(value) < 0 ? 'text-error font-weight-bold' : ''">
          {{ fmt(Number(value)) }}
        </span>
      </template>
    </BaseBrowse>
  </div>

  <!-- ── Pivot & Chart tab ── -->
  <div v-show="activeTab !== 'grid'" class="lap-layout">
    <div class="lap-header">
      <div class="page-title-section">
        <div class="title-icon-wrap">
          <IconList :size="16" :stroke-width="1.8" />
        </div>
        <h1 class="page-title">Laporan Penjualan per Item</h1>
      </div>
    </div>

    <div class="lap-card">
      <!-- Filter bar pivot/chart -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-lbl">Periode</span>
          <input v-model="startDate" type="date" class="date-inp" />
          <span class="filter-sep">s/d</span>
          <input v-model="endDate" type="date" class="date-inp" />
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :loading="isLoading"
            @click="loadData"
          >
            Tampilkan
          </v-btn>
        </div>
        <div class="filter-divider" />
        <div class="tab-wrap">
          <button class="tab-btn" @click="activeTab = 'grid'">
            <IconTable :size="13" :stroke-width="1.8" /> Grid Data
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'pivot' }"
            @click="activeTab = 'pivot'"
          >
            <IconList :size="13" :stroke-width="1.8" /> Pivot
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'chart' }"
            @click="activeTab = 'chart'"
          >
            <IconChartBar :size="13" :stroke-width="1.8" /> Grafik
          </button>
        </div>
      </div>

      <!-- Pivot -->
      <!-- Pivot & Grafik: komponen pivot yang sama (grafik mengikuti susunan pivot) -->
      <div v-show="activeTab === 'pivot' || activeTab === 'chart'" class="tab-inner">
        <div v-if="isLoading" class="tab-loading">
          <v-progress-circular indeterminate color="primary" size="36" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="!items.length" class="tab-empty">
          Tidak ada data untuk periode ini.
        </div>
        <div v-else class="pivot-datawrap">
          <DataPivot
            :data="pivotData"
            view-key="penjualan-item"
            :default-row-fields="['Cabang', 'Customer', 'Kode', 'Nama']"
            :default-column-fields="['Tahun', 'Bulan']"
            :default-value-fields="pivotValueFieldsDefault"
            :view="activeTab === 'chart' ? 'chart' : 'grid'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Filter ── */
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
  margin: 0 4px;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 130px;
}
.date-inp:focus {
  border-color: #3B5998;
}
.cab-sel {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  width: 140px;
  background: #fff;
  cursor: pointer;
}
.cab-sel:focus {
  border-color: #3B5998;
}

/* ── Tab selector ── */
.tab-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(var(--v-border-color), 0.06);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 3px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.tab-btn:hover {
  background: rgba(46, 46, 125, 0.08);
  color: #3B5998;
}
.tab-btn.active {
  background: #3B5998;
  color: white;
}

/* ── Pivot/Chart layout ── */
.lap-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  padding: 8px 12px;
  gap: 6px;
}
.lap-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 36px;
}
.page-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(46, 46, 125, 0.1);
  color: #3B5998;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.lap-card {
  flex: 1;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-top: 3px solid #3B5998;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.tab-inner {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.pivot-datawrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
}
.tab-loading,
.tab-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 200px;
  font-size: 12px;
  color: #9e9e9e;
}

/* ── Pivot ── */
.pivot-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.pivot-hint {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 12px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  background: rgba(46, 46, 125, 0.03);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pivot-container {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

:deep(.pvtUi),
:deep(.pvtUi *) {
  font-size: 11px !important;
  font-family: inherit !important;
}
:deep(.pvtUi) {
  border: none !important;
  background: transparent !important;
}
:deep(.pvtAxisContainer),
:deep(.pvtVals) {
  background: rgba(46, 46, 125, 0.04) !important;
  border: 1px solid rgba(46, 46, 125, 0.15) !important;
  border-radius: 4px !important;
  min-height: 48px !important;
  padding: 4px !important;
}
:deep(.pvtAttr) {
  background: rgba(46, 46, 125, 0.1) !important;
  color: #3B5998 !important;
  border: 1px solid rgba(46, 46, 125, 0.25) !important;
  border-radius: 3px !important;
  padding: 2px 7px !important;
  font-weight: 600 !important;
  cursor: grab !important;
}
:deep(.pvtTable th) {
  background: #3B5998 !important;
  color: white !important;
  font-weight: 700 !important;
  padding: 5px 9px !important;
  white-space: nowrap !important;
}
:deep(.pvtTable td) {
  padding: 3px 9px !important;
  text-align: right !important;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}
:deep(.pvtTotal),
:deep(.pvtGrandTotal) {
  font-weight: 700 !important;
  background: rgba(46, 46, 125, 0.07) !important;
}

/* Box filter pivot: selalu fixed agar tidak "terlempar" (PivotTable 2.x
   menghitung position() relatif offset parent yang berbeda di layout
   bersarang); posisi tepat di bawah field diatur oleh handler click */
:deep(.pvtFilterBox) {
  position: fixed !important;
  width: 300px !important;
  max-height: 420px !important;
  overflow: auto !important;
}


.num-cell {
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* ── Pivot Filter Dialog ── */
.pvtFilterBox {
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
  padding: 0 !important;
  min-width: 220px !important;
  overflow: hidden !important;
  font-family: inherit !important;
}
.pvtFilterBox h4 {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: white !important;
  background: #3B5998 !important;
  margin: 0 !important;
  padding: 8px 12px !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}
.pvtFilterBox p {
  display: flex !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  margin: 0 !important;
  border-bottom: 1px solid #f0f0f0 !important;
  background: #f9fafb !important;
}
.pvtFilterBox p a {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #3B5998 !important;
  text-decoration: none !important;
  padding: 2px 8px !important;
  border: 1px solid #c8c8e6 !important;
  border-radius: 4px !important;
  background: white !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
}
.pvtFilterBox p a:hover {
  background: #3B5998 !important;
  color: white !important;
}
.pvtFilterBox .pvtCheckContainer {
  max-height: 240px !important;
  overflow-y: auto !important;
  padding: 6px 4px !important;
  scrollbar-width: thin !important;
}
.pvtFilterBox .pvtCheckContainer p {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 4px 10px !important;
  margin: 0 !important;
  border: none !important;
  background: transparent !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  transition: background 0.1s !important;
}
.pvtFilterBox .pvtCheckContainer p:hover {
  background: rgba(46, 46, 125, 0.06) !important;
}
.pvtFilterBox .pvtCheckContainer p label {
  font-size: 11px !important;
  color: #374151 !important;
  cursor: pointer !important;
  user-select: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  width: 100% !important;
}
.pvtFilterBox .pvtCheckContainer input[type="checkbox"] {
  accent-color: #3B5998 !important;
  width: 13px !important;
  height: 13px !important;
  flex-shrink: 0 !important;
  cursor: pointer !important;
}
.pvtFilterBox .pvtButton {
  display: flex !important;
  gap: 6px !important;
  justify-content: flex-end !important;
  padding: 8px 12px !important;
  border-top: 1px solid #f0f0f0 !important;
  background: #f9fafb !important;
}
.pvtFilterBox button {
  height: 28px !important;
  padding: 0 14px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 5px !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
}
.pvtFilterBox button:first-of-type {
  background: #3B5998 !important;
  color: white !important;
}
.pvtFilterBox button:first-of-type:hover {
  background: #3B5998 !important;
}
.pvtFilterBox button:last-of-type {
  background: white !important;
  color: #374151 !important;
  border: 1px solid #d1d5db !important;
}
.pvtFilterBox button:last-of-type:hover {
  background: #f3f4f6 !important;
}
</style>
