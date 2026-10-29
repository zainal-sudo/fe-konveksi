<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconList } from "@tabler/icons-vue";
import { hutangApi, type HutangRow } from "@/api/laporan/hutangApi";
import { exportToExcel } from "@/utils/exportExcel";

const toast = useToast();

// ── Per tanggal (as-of date) ──────────────────────────────────────────
const STORAGE_KEY = "finance_filter_laporan_hutang";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getSaved = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.tanggal) return s;
  } catch {
    /* silent */
  }
  return null;
};

const saved = getSaved();
const tanggal = ref(saved?.tanggal ?? getLocal(new Date()));

watch(tanggal, (t) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tanggal: t }));
  } catch {
    /* silent */
  }
  loadData();
});

// ── Data ──────────────────────────────────────────────────────────────
const items = ref<HutangRow[]>([]);
const isLoading = ref(false);
const selected = ref<HutangRow[]>([]);

const filterValues = computed(() => ({
  tanggal: tanggal.value,
}));

// ── Summary footer di kolom ──────────────────────────────────────────
const summaryColumns = [
  { key: "Total", label: "Total" },
  { key: "Retur", label: "Retur" },
  { key: "Bayar", label: "Bayar" },
  { key: "SisaHutang", label: "Sisa Hutang" },
];

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { key: "Nomor", title: "Nomor", width: "150px" },
  { key: "Tanggal", title: "Tanggal", width: "95px", align: "center" as const },
  {
    key: "JthTempo",
    title: "Jatuh Tempo",
    width: "100px",
    align: "center" as const,
  },
  { key: "SupKode", title: "Kode Sup", width: "90px" },
  { key: "Supplier", title: "Nama Supplier", width: "230px" },
  { key: "Tax", title: "Tax", width: "75px", align: "center" as const },
  { key: "NoBukti", title: "No Bukti", width: "90px", align: "center" as const },
  { key: "Total", title: "Total", width: "130px", align: "right" as const },
  { key: "Retur", title: "Retur", width: "120px", align: "right" as const },
  { key: "Bayar", title: "Bayar", width: "130px", align: "right" as const },
  { key: "SisaHutang", title: "Sisa Hutang", width: "140px", align: "right" as const },
  {
    key: "Overdue",
    title: "Overdue (hr)",
    width: "80px",
    align: "center" as const,
  },
  {
    key: "RangeOverdue",
    title: "Range Overdue",
    width: "95px",
    align: "center" as const,
  },
  { key: "Cabang", title: "Cabang", width: "75px", align: "center" as const },
];

// ── Load ──────────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = await hutangApi.getHutang(tanggal.value);
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// ── Export ────────────────────────────────────────────────────────────
const doExport = async () => {
  if (!items.value.length)
    return toast.warning("Tidak ada data untuk diexport.");
  await exportToExcel({
    title: `Laporan Hutang per ${tanggal.value}`,
    filenamePrefix: "LaporanHutang",
    sheetName: "Laporan Hutang",
    columns: [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" as const },
      { header: "Jatuh Tempo", key: "JthTempo", width: 12, align: "center" as const },
      { header: "Kode Sup", key: "SupKode", width: 12 },
      { header: "Nama Supplier", key: "Supplier", width: 30 },
      { header: "Tax", key: "Tax", width: 10, align: "center" as const },
      { header: "No Bukti", key: "NoBukti", width: 12, align: "center" as const },
      { header: "Total", key: "Total", width: 16, currency: true },
      { header: "Retur", key: "Retur", width: 14, currency: true },
      { header: "Bayar", key: "Bayar", width: 16, currency: true },
      { header: "Sisa Hutang", key: "SisaHutang", width: 16, currency: true },
      { header: "Overdue (hr)", key: "Overdue", width: 12, align: "center" as const },
      { header: "Range Overdue", key: "RangeOverdue", width: 14, align: "center" as const },
      { header: "Cabang", key: "Cabang", width: 10, align: "center" as const },
    ],
    rows: items.value,
  });
};

// ── Formatting ────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID").format(Number(v || 0));

const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Row props: highlight yang sudah lewat jatuh tempo ────────────────
const rowPropsFn = (data: any) => {
  const row: HutangRow = data?.item?.raw ?? data?.item ?? data;
  if (row?.Overdue !== null && row?.Overdue !== undefined && Number(row.Overdue) >= 0) {
    return { style: "color:#c62828; font-weight:600" };
  }
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Laporan Hutang"
    :icon="IconList"
    menu-id="0"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :fixed-layout="false"
    item-value="Nomor"
    v-model:selected="selected"
    :row-props-fn="rowPropsFn"
    :filter-values="filterValues"
    summary-key="SisaHutang"
    summary-label="Total Sisa Hutang"
    :summary-columns="summaryColumns"
    @refresh="loadData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Per Tanggal</span>
        <input v-model="tanggal" type="date" class="date-inp" />
      </div>
    </template>

    <!-- ── Tombol aksi ── -->
    <template #extra-actions>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend>
          <v-icon size="14">mdi-file-excel</v-icon>
        </template>
        Export
      </v-btn>
    </template>

    <!-- ── Custom cells ── -->
    <template #item.Tanggal="{ value }">{{ fmtDate(value) }}</template>
    <template #item.JthTempo="{ value }">{{ fmtDate(value) }}</template>
    <template #item.Total="{ value }">
      <span style="font-variant-numeric: tabular-nums">{{
        fmt(Number(value))
      }}</span>
    </template>
    <template #item.Retur="{ value }">
      <span style="font-variant-numeric: tabular-nums; color: #c62828">
        {{ fmt(Number(value)) }}
      </span>
    </template>
    <template #item.Bayar="{ value }">
      <span style="font-variant-numeric: tabular-nums; color: #1565c0">
        {{ fmt(Number(value)) }}
      </span>
    </template>
    <template #item.SisaHutang="{ value }">
      <span class="sisa-cell">{{ fmt(Number(value)) }}</span>
    </template>
    <template #item.RangeOverdue="{ value }">
      <span
        :class="
          value === 'Belum' ? 'badge-belum' : 'badge-overdue'
        "
      >
        {{ value }}
      </span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
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

.sisa-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: #3B5998;
}

.badge-belum {
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-overdue {
  background: #fce4ec;
  color: #c62828;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
