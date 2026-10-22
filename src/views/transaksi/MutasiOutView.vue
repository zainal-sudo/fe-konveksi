<script setup lang="ts">
import { ref, watch, computed, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { mutasiCabangOutApi } from "@/api/transaksi/mutasiCabangOutApi";
import { exportToExcel } from "@/utils/exportExcel";
import { IconTruckDelivery, IconFileSpreadsheet } from "@tabler/icons-vue";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const MENU_ID = "15"; // frmMutasiCabang — Mutasi Cabang Out

const STORAGE_KEY = "konveksi_periode_mutasi_cabang_out";
const getLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getSavedPeriode = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.startDate && saved?.endDate) return saved;
  } catch {}
  const now = new Date();
  return {
    startDate: getLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: getLocal(now),
  };
};

const p = getSavedPeriode();
const startDate = ref(p.startDate);
const endDate = ref(p.endDate);

// ── Filter cabang (pusat boleh pilih; user cabang terkunci) ──────────
const cabangOptions = ref<{ kode: string; nama: string }[]>([]);
const isCabangUser = computed(() => (authStore.userCabang || "00") !== "00");
const filterCabang = ref(isCabangUser.value ? String(authStore.userCabang) : "ALL");

watch([startDate, endDate, filterCabang], ([s, e]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ startDate: s, endDate: e }));
  } catch {}
  loadData();
});

const items = ref<any[]>([]);
const isLoading = ref(false);
const selected = ref<any[]>([]);
const selectedItem = computed(() => selected.value[0] ?? null);

const headers = [
  { title: "NO. MUTASI", key: "Nomor", width: "150px", align: "center" },
  { title: "TANGGAL", key: "Tanggal", width: "110px", align: "center" },
  { title: "CABANG ASAL", key: "Asal", width: "140px" },
  { title: "TUJUAN", key: "Tujuan", width: "140px" },
  { title: "GUDANG", key: "Gudang", width: "130px" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "180px" },
  { title: "STATUS", key: "Realisasi", width: "130px", align: "center" },
];

const loadCabang = async () => {
  if (isCabangUser.value) return;
  try {
    const api = await import("@/api/transaksi/mutasiCabangOutFormApi");
    cabangOptions.value = await api.mutasiCabangOutFormApi.getCabang();
  } catch {
    /* silent */
  }
};

const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = await mutasiCabangOutApi.getBrowse(
      startDate.value,
      endDate.value,
      isCabangUser.value ? String(authStore.userCabang) : filterCabang.value
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data Mutasi Cabang Out.");
  } finally {
    isLoading.value = false;
  }
};

const browseRef = ref<any>(null);

onActivated(() => {
  const pk = getSavedPeriode();
  startDate.value = pk.startDate;
  endDate.value = pk.endDate;
  if (browseRef.value) browseRef.value.search = "";
  loadCabang();
  loadData();
});
onMounted(() => {
  loadCabang();
  loadData();
});

// ── Expand detail ────────────────────────────────────────────────────
const expanded = ref<any[]>([]);
const detailMap = ref<Record<string, any[]>>({});
const getDetail = (nomor: string) => detailMap.value[nomor] ?? [];

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const item of newExpanded) {
    const nomor = item.Nomor;
    if (detailMap.value[nomor] !== undefined) continue;
    try {
      detailMap.value[nomor] = await mutasiCabangOutApi.getDetail(nomor);
    } catch {
      detailMap.value[nomor] = [];
    }
  }
};

// ── Actions ──────────────────────────────────────────────────────────
const onBaru = () => router.push({ name: "MutasiOutCreate" });
const onUbah = () => {
  if (!selectedItem.value) return toast.warning("Pilih data terlebih dahulu.");
  if (selectedItem.value.Realisasi === "Sudah Diterima")
    return toast.error("Mutasi sudah Diterima cabang tujuan, tidak dapat diubah.");
  router.push({
    name: "MutasiOutEdit",
    params: { nomor: encodeURIComponent(selectedItem.value.Nomor) },
  });
};

const doExport = async () => {
  if (items.value.length === 0) return toast.warning("Tidak ada data untuk diexport.");
  await exportToExcel({
    title: "Mutasi Cabang Out",
    filenamePrefix: "MutasiCabangOut",
    sheetName: "Mutasi Out",
    columns: [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Cabang Asal", key: "Asal", width: 22 },
      { header: "Tujuan", key: "Tujuan", width: 22 },
      { header: "Gudang", key: "Gudang", width: 18 },
      { header: "Keterangan", key: "Keterangan", width: 28 },
      { header: "Status", key: "Realisasi", width: 16, align: "center" },
    ],
    rows: items.value,
  });
};
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Mutasi Cabang Out"
    :icon="IconTruckDelivery"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :show-expand="true"
    :expanded="expanded"
    id-key="Nomor"
    item-value="Nomor"
    @update:expanded="onUpdateExpanded"
    v-model:selected="selected"
    @refresh="loadData"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" />
      </div>

      <div class="filter-divider" v-if="!isCabangUser" />

      <div class="filter-group" v-if="!isCabangUser">
        <span class="filter-lbl">Cabang</span>
        <select v-model="filterCabang" class="date-inp" style="width: 130px">
          <option value="ALL">ALL</option>
          <option v-for="c in cabangOptions" :key="c.kode" :value="c.kode">
            {{ c.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="primary" variant="flat" @click="onBaru">+ Baru</v-btn>
      <v-btn size="small" variant="outlined" :disabled="!selectedItem" @click="onUbah">Ubah</v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend><IconFileSpreadsheet :size="13" /></template>
        Export
      </v-btn>
    </template>

    <template #item.Nomor="{ item }">
      <span class="font-weight-bold text-primary">{{ item.Nomor }}</span>
    </template>

    <template #item.Realisasi="{ value }">
      <span :class="value === 'Sudah Diterima' ? 'badge-closed' : 'badge-open'">
        {{ value }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="width: 90px">Kode</th>
              <th style="min-width: 200px">Nama Barang</th>
              <th style="width: 80px" class="tr">Jumlah</th>
              <th style="width: 100px" class="tc">Expired</th>
              <th style="width: 160px">Keterangan</th>
              <th style="width: 100px">Gudang</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in getDetail(item.Nomor)" :key="i">
              <td><span class="mono">{{ d.Kode }}</span></td>
              <td class="font-weight-bold">{{ d.Nama }}</td>
              <td class="tr font-weight-bold">{{ d.Jumlah }}</td>
              <td class="tc">{{ d.Expired || "-" }}</td>
              <td>{{ d.Keterangan }}</td>
              <td>{{ d.Gudang }}</td>
            </tr>
            <tr v-if="getDetail(item.Nomor).length === 0">
              <td colspan="6" class="empty-td">Tidak ada detail barang.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 6px; }
.filter-lbl { font-size: 12px; font-weight: 600; color: #374151; }
.filter-sep { font-size: 12px; color: #9ca3af; }
.filter-divider { width: 1px; height: 24px; background: rgba(var(--v-border-color), var(--v-border-opacity)); flex-shrink: 0; margin: 0 4px; }
.date-inp { height: 32px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 8px; font-size: 12px; width: 130px; background: white; }
.badge-closed {
  background: #f0f2f5; color: #6b7280; padding: 1px 8px;
  font-size: 10px; font-weight: 700;
}
.badge-open {
  background: rgba(59, 89, 152, 0.1); color: #3B5998; padding: 1px 8px;
  font-size: 10px; font-weight: 700;
}
.detail-wrap { padding: 4px 0; }
.detail-tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
.detail-tbl thead tr { background: #3B5998; }
.detail-tbl th { color: white; font-weight: 700; padding: 4px 8px; white-space: nowrap; text-align: left; }
.detail-tbl td { padding: 3px 8px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.detail-tbl tbody tr:hover td { background: rgba(59, 89, 152, 0.04); }
.mono { font-family: monospace; font-size: 10px; color: #6b7280; }
.tc { text-align: center; }
.tr { text-align: right; }
.empty-td { text-align: center; color: #9e9e9e; font-style: italic; padding: 12px; }
</style>
