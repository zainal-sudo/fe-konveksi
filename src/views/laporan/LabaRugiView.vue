<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { IconList, IconRefresh } from "@tabler/icons-vue";
import { labaRugiApi, type LabaRugiData } from "@/api/laporan/neracaLabRugiApi";
import { cabangApi, type Cabang } from "@/api/master/cabangApi";

const toast = useToast();

const STORAGE_KEY = "finance_filter_labarugi";
const getSaved = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};
const saved = getSaved();

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const loc = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const startDate = ref(saved?.startDate ?? loc(firstDay));
const endDate = ref(saved?.endDate ?? loc(now));
const cabang = ref(saved?.cabang ?? "all");

const cabangOptions = ref<Cabang[]>([]);
const cabangLoad = async () => {
  try {
    cabangOptions.value = await cabangApi.getAll();
  } catch {
    /* silent */
  }
};
cabangLoad();

watch([startDate, endDate, cabang], () => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      })
    );
  } catch {
    /* silent */
  }
  loadData();
});

const data = ref<LabaRugiData | null>(null);
const isLoading = ref(false);

const loadData = async () => {
  if (!startDate.value || !endDate.value) return;
  isLoading.value = true;
  try {
    data.value = await labaRugiApi.getLabaRugi(
      startDate.value,
      endDate.value,
      cabang.value
    );
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat laba rugi.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

interface FlatRow {
  type: "section" | "account";
  label: string;
  kode?: string;
  saldo: number;
}

const rows = computed(() => {
  if (!data.value) return [];
  const out: FlatRow[] = [];
  for (const g of data.value.groups) {
    out.push({ type: "section", label: g.label, saldo: g.total });
    for (const a of g.accounts)
      out.push({ type: "account", label: a.nama, kode: a.kode, saldo: a.saldo });
  }
  return out;
});

const summaryRows = computed(() =>
  data.value
    ? [
        { label: "PENDAPATAN PENJUALAN (NETO)", value: data.value.total.pendapatanPenjualan },
        { label: "BIAYA PRODUKSI (HPP)", value: data.value.total.hpp },
        { label: "LABA KOTOR", value: data.value.total.labaKotor, strong: true },
        { label: "BEBAN OPERASIONAL", value: data.value.total.bebanOperasional },
        { label: "LABA OPERASIONAL", value: data.value.total.labaOperasional, strong: true },
        { label: "PENDAPATAN LAIN-LAIN", value: data.value.total.pendapatanLain },
        { label: "BEBAN NON-OPERASIONAL", value: data.value.total.bebanNonOperasional },
        { label: "LABA (RUGI) BERSIH", value: data.value.total.labaBersih, grand: true },
      ]
    : []
);
</script>

<template>
  <div class="page-wrap">
    <div class="lr-toolbar">
      <div class="lr-title">
        <IconList :size="18" class="lr-title-ico" />
        Laba Rugi
      </div>
      <div class="lr-filter">
        <span class="lr-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="lr-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
        <span class="lr-sep">Cabang</span>
        <select v-model="cabang" class="date-inp cab-inp">
          <option value="all">Semua Cabang</option>
          <option v-for="c in cabangOptions" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
        <v-btn size="small" variant="tonal" color="primary" :loading="isLoading" @click="loadData">
          <template #prepend><IconRefresh :size="13" :stroke-width="1.8" /></template>
          Refresh
        </v-btn>
      </div>
    </div>

    <div v-if="!data" class="lr-state">
      <span v-if="isLoading">Memuat...</span>
      <span v-else>Tidak ada data.</span>
    </div>

    <div v-else class="lr-tablewrap">
      <table class="lr-table">
        <thead>
          <tr>
            <th style="width: 300px">Kelompok</th>
            <th style="width: 90px">Kode</th>
            <th>Nama Akun</th>
            <th style="width: 170px" class="tr">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r, i) in rows" :key="i">
            <tr :class="r.type === 'section' ? 'lr-sec' : ''">
              <td class="tc">{{ r.type === 'section' ? r.label : '' }}</td>
              <td class="tc">{{ r.kode ?? '' }}</td>
              <td :class="{ 'lr-indented': r.type === 'account' }">{{ r.label }}</td>
              <td class="tr" :class="{ 'lr-bold': r.type === 'section' }">{{ fmt(r.saldo) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr v-for="(s, i) in summaryRows" :key="'t' + i" :class="['lr-sum', s.grand ? 'lr-grand' : s.strong ? 'lr-strong' : '']">
            <td colspan="3">{{ s.label }}</td>
            <td class="tr">{{ fmt(s.value) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  height: 100%;
  overflow: auto;
}
.lr-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.lr-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #374151;
}
.lr-title-ico {
  color: #3b5998;
}
.lr-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lr-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.lr-sep {
  font-size: 12px;
  color: #9ca3af;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 140px;
  background: #fff;
}
.cab-inp {
  min-width: 170px;
  width: 170px;
}
.date-inp:focus {
  border-color: #3b5998;
}
.lr-state {
  padding: 32px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.lr-tablewrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: auto;
  flex-shrink: 0;
}
.lr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lr-table thead tr {
  background: #3b5998;
}
.lr-table th {
  color: #fff;
  font-weight: 700;
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.lr-table td {
  padding: 3px 10px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}
.lr-table tbody tr:hover td {
  background: rgba(46, 46, 125, 0.05);
}
.lr-sec td {
  font-weight: 700;
  color: #0f172a;
  background: #f8fafc;
}
.lr-indented {
  padding-left: 10px !important;
  color: #475569;
}
.lr-bold {
  font-weight: 700;
}
.lr-table tfoot tr {
  background: #eef1f6;
}
.lr-sum td {
  font-weight: 600;
  padding: 3px 10px;
}
.lr-strong td {
  font-weight: 800;
  border-top: 1px solid #94a3b8;
}
.lr-grand td {
  background: #3b5998;
  color: #fff;
  font-weight: 800;
  border-top: 2px solid #1e3a8a;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tc {
  text-align: center;
}
</style>
