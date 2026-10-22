<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { IconList, IconRefresh } from "@tabler/icons-vue";
import { neracaApi, type NeracaData } from "@/api/laporan/neracaLabRugiApi";

const toast = useToast();

const STORAGE_KEY = "finance_filter_neraca";
const getSaved = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};
const saved = getSaved();

const now = new Date();
const endDate = ref(
  saved?.endDate ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`
);

watch(endDate, (v) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ endDate: v }));
  } catch {
    /* silent */
  }
  loadData();
});

const data = ref<NeracaData | null>(null);
const isLoading = ref(false);

const loadData = async () => {
  if (!endDate.value) return;
  isLoading.value = true;
  try {
    data.value = await neracaApi.getNeraca(endDate.value);
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat neraca.");
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

const flatten = (groups: any[]): FlatRow[] => {
  const rows: FlatRow[] = [];
  for (const g of groups) {
    rows.push({ type: "section", label: g.label, saldo: g.total });
    for (const a of g.accounts)
      rows.push({
        type: "account",
        label: a.nama,
        kode: a.kode,
        saldo: a.saldo,
      });
  }
  return rows;
};

const aktivaRows = computed(() => flatten(data.value?.aktiva ?? []));
const pasivaRows = computed(() => flatten(data.value?.pasiva ?? []));
</script>

<template>
  <div class="page-wrap">
    <!-- Toolbar -->
    <div class="nr-toolbar">
      <div class="nr-title">
        <IconList :size="18" class="nr-title-ico" />
        Neraca
      </div>
      <div class="nr-filter">
        <span class="nr-lbl">Saldo per</span>
        <input v-model="endDate" type="date" class="date-inp" />
        <v-btn size="small" variant="tonal" color="primary" :loading="isLoading" @click="loadData">
          <template #prepend><IconRefresh :size="13" :stroke-width="1.8" /></template>
          Refresh
        </v-btn>
      </div>
    </div>

    <div v-if="!data" class="nr-state">
      <span v-if="isLoading">Memuat...</span>
      <span v-else>Tidak ada data.</span>
    </div>

    <div v-else class="nr-tablewrap">
      <table class="nr-table">
        <thead>
          <tr>
            <th style="width: 90px">Kelompok</th>
            <th style="width: 80px">Kode</th>
            <th>Nama Akun</th>
            <th style="width: 170px" class="tr">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr class="nr-band"><td colspan="3">AKTIVA</td><td /></tr>
          <template v-for="(r, i) in aktivaRows" :key="'a' + i">
            <tr :class="r.type === 'section' ? 'nr-sec' : ''">
              <td class="tc">{{ r.type === 'section' ? r.label : '' }}</td>
              <td class="tc">{{ r.kode ?? '' }}</td>
              <td :class="r.type === 'account' ? 'nr-indented' : ''">{{ r.label }}</td>
              <td class="tr" :class="r.type === 'section' ? 'nr-bold' : ''">{{ fmt(r.saldo) }}</td>
            </tr>
          </template>
          <tr class="nr-total">
            <td colspan="3">TOTAL AKTIVA</td>
            <td class="tr">{{ fmt(data.total.aktiva) }}</td>
          </tr>

          <tr class="nr-band"><td colspan="3">PASSIVA (KEWAJIBAN &amp; EKUITAS)</td><td /></tr>
          <template v-for="(r, i) in pasivaRows" :key="'p' + i">
            <tr :class="r.type === 'section' ? 'nr-sec' : ''">
              <td class="tc">{{ r.type === 'section' ? r.label : '' }}</td>
              <td class="tc">{{ r.kode ?? '' }}</td>
              <td :class="r.type === 'account' ? 'nr-indented' : ''">{{ r.label }}</td>
              <td class="tr" :class="r.type === 'section' ? 'nr-bold' : ''">{{ fmt(r.saldo) }}</td>
            </tr>
          </template>
          <tr class="nr-total">
            <td colspan="3">TOTAL KEWAJIBAN &amp; EKUITAS</td>
            <td class="tr">{{ fmt(data.total.kewajiban + data.total.ekuitas) }}</td>
          </tr>

          <tr class="nr-balance" :class="data.total.balanced ? 'nr-ok' : 'nr-diff'">
            <td colspan="3">
              SELISIH {{ data.total.balanced ? "" : "(TIDAK BALANCE)" }}
            </td>
            <td class="tr">{{ fmt(data.total.selisih) }}</td>
          </tr>
        </tbody>
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
.nr-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.nr-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #374151;
}
.nr-title-ico {
  color: #3b5998;
}
.nr-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nr-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 140px;
}
.date-inp:focus {
  border-color: #3b5998;
}
.nr-state {
  padding: 32px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.nr-tablewrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: auto;
  flex-shrink: 0;
}
.nr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.nr-table thead tr {
  background: #3b5998;
}
.nr-table th {
  color: #fff;
  font-weight: 700;
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.nr-table td {
  padding: 3px 10px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}
.nr-table tbody tr:hover td {
  background: rgba(46, 46, 125, 0.05);
}
.nr-band td {
  background: #eef1f6;
  font-weight: 800;
  font-size: 12px;
  color: #1e293b;
  padding: 5px 10px;
}
.nr-sec td {
  font-weight: 700;
  color: #0f172a;
  background: #f8fafc;
}
.nr-indented {
  padding-left: 26px !important;
  color: #475569;
}
.nr-bold {
  font-weight: 700;
}
.nr-total td {
  background: #eef1f6;
  font-weight: 800;
  border-top: 2px solid #3b5998;
}
.nr-balance td {
  font-weight: 800;
}
.nr-ok {
  color: #166534;
}
.nr-diff {
  background: #fff3e0;
  color: #c2410c;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tc {
  text-align: center;
}
</style>
