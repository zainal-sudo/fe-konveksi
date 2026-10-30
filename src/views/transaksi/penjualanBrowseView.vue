<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { penjualanApi } from "@/api/transaksi/penjualanApi";
import { exportToExcel } from "@/utils/exportExcel";
import {
  IconShoppingCart,
  IconPrinter,
  IconFileSpreadsheet,
  IconRefresh,
} from "@tabler/icons-vue";

import { useQzPrint } from "@/composables/useQzPrint";
import PrinterDialog from "@/components/PrinterDialog.vue";
import PrintPreviewDialog from "@/components/PrintPreviewDialog.vue";
import { generatePreviewFaktur, generateEscPosFaktur } from "@/utils/fakturPrint";

const router = useRouter();
const toast = useToast();
const MENU_ID = "33";

const { connect, getSavedPrinter, printRaw } = useQzPrint();

// ── Pengaturan Periode Tanggal ────────────────────────────────────────
const STORAGE_KEY = "finance_periode_penjualan";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const getSavedPeriode = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.startDate && saved?.endDate) return saved;
  } catch {}
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: getLocal(firstDay), endDate: getLocal(now) };
};

const p = getSavedPeriode();
const startDate = ref(p.startDate);
const endDate = ref(p.endDate);

watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ startDate: s, endDate: e }));
  } catch {}
  loadData();
});

// ── Konfigurasi Tabel Data PO ─────────────────────────────────────────
const items = ref<any[]>([]);
const isLoading = ref(false);
const selected = ref<any[]>([]);

const selectedItem = computed(() => selected.value[0] ?? null);
const isSingleSelected = computed(() => selected.value.length === 1);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px", align: "center" },
  { title: "TANGGAL", key: "Tanggal", width: "110px", align: "center" },
  { title: "NAMA CUSTOMER", key: "Customer", minWidth: "220px" },
  { title: "KETERANGAN / MEMO", key: "Memo", minWidth: "250px" },
  { title: "PAJAK", key: "Pajak", width: "90px", align: "center" },
  { title: "TOTAL BELANJA", key: "Total", width: "140px", align: "end" },
  { title: "PPN", key: "Ppn", width: "120px", align: "end" },
  { title: "CASH", key: "Cash", width: "110px", align: "end" },
  { title: "ONGKIR", key: "Ongkir", width: "110px", align: "end" },
  { title: "PIUTANG", key: "Piutang", width: "110px", align: "end" },
  { title: "CARD", key: "Card", width: "110px", align: "end" },
];

const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = await penjualanApi.getBrowse(startDate.value, endDate.value);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data penjualan.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const expanded = ref<any[]>([]);
const detailMap = ref<Record<string, any[]>>({});
const detailError = ref<Record<string, boolean>>({});
const detailLoading = ref<Record<string, boolean>>({});

const getDetail = (nomor: string) => detailMap.value[nomor] ?? [];

const fetchDetail = async (nomor: string) => {
  detailLoading.value[nomor] = true;
  detailError.value[nomor] = false;
  try {
    detailMap.value[nomor] = await penjualanApi.getDetail(nomor);
  } catch (e: any) {
    delete detailMap.value[nomor];
    detailError.value[nomor] = true;
    toast.error(e.response?.data?.message || `Gagal memuat detail penjualan ${nomor}.`);
  } finally {
    detailLoading.value[nomor] = false;
  }
};

const retryDetail = (nomor: string) => {
  if (!nomor) return;
  fetchDetail(nomor);
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const entry of newExpanded) {
    const nomor = typeof entry === "string" ? entry : entry?.Nomor;
    if (!nomor) continue;
    if (detailMap.value[nomor] !== undefined) continue;
    if (detailLoading.value[nomor]) continue;
    await fetchDetail(nomor);
  }
};

// ── Logika Aksi Tombol Utama (CRUD) ───────────────────────────────────
const onBaru = () => {
  router.push({ name: "penjualanCreate" });
};

const onUbah = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  if (selectedItem.value.Status === "Closed") {
    toast.error("Penjualan berstatus 'Closed' tidak dapat diubah.");
    return;
  }
  router.push({
    name: "penjualanEdit",
    params: { nomor: selectedItem.value.Nomor }
  });
};

const onHapus = async () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  if (selectedItem.value.Status === "Closed") {
    toast.error("Penjualan berstatus 'Closed' tidak dapat dihapus.");
    return;
  }
  if (!confirm(`Hapus penjualan ${selectedItem.value.Nomor}?`)) return;

  try {
    await penjualanApi.delete(selectedItem.value.Nomor);
    toast.success("Data penjualan berhasil dihapus.");
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Cetak Faktur Penjualan (Dot Matrix / QZ Tray) ───────────────────────
const isPrinting = ref(false);
const showPrinterDialog = ref(false);
const showPreviewDialog = ref(false);
const previewLines = ref<string[]>([]);
const cachedPrintData = ref<any | null>(null);

const doCetak = async () => {
  if (!isSingleSelected.value) {
    toast.warning("Pilih satu data penjualan terlebih dahulu.");
    return;
  }
  const item = selectedItem.value!;
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    showPrinterDialog.value = true;
    return;
  }

  isPrinting.value = true;
  try {
    const data = await penjualanApi.getPrintData(item.Nomor);
    cachedPrintData.value = data;
    previewLines.value = generatePreviewFaktur(data);
    showPreviewDialog.value = true;
  } catch (e: any) {
    toast.error(e.message || "Gagal memuat data cetak penjualan.");
  } finally {
    isPrinting.value = false;
  }
};

const onPrinterSaved = async () => {
  showPrinterDialog.value = false;
  if (isSingleSelected.value && cachedPrintData.value) {
    previewLines.value = generatePreviewFaktur(cachedPrintData.value);
    showPreviewDialog.value = true;
  }
};

const onPrintFromPreview = async () => {
  showPreviewDialog.value = false;
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter || !cachedPrintData.value) {
    toast.warning("Printer belum diset.");
    return;
  }

  isPrinting.value = true;
  try {
    const commands = generateEscPosFaktur(cachedPrintData.value);
    await connect();
    await printRaw(savedPrinter, commands);
    toast.success("Berhasil dikirim ke printer!");
  } catch (e: any) {
    toast.error(e.message || "Gagal mencetak ke printer.");
  } finally {
    isPrinting.value = false;
    cachedPrintData.value = null;
  }
};

const doExport = async () => {
  if (items.value.length === 0) return toast.warning("Tidak ada data untuk diexport.");
  try {
    await exportToExcel({
      title: "Penjualan (SO)",
      filenamePrefix: "SO",
      sheetName: "Penjualan",
      columns: [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
        { header: "Customer", key: "Customer", width: 28 },
        { header: "Memo", key: "Memo", width: 30 },
        { header: "Pajak", key: "Pajak", width: 10, align: "center" },
        { header: "Total", key: "Total", width: 18, currency: true },
        { header: "PPN", key: "Ppn", width: 16, currency: true },
        { header: "Cash", key: "Cash", width: 14, currency: true },
        { header: "Ongkir", key: "Ongkir", width: 14, currency: true },
        { header: "Piutang", key: "Piutang", width: 14, currency: true },
        { header: "Card", key: "Card", width: 14, currency: true },
      ],
      rows: items.value,
    });
    toast.success("Berhasil export data penjualan ke Excel!");
  } catch (e) {
    console.error(e);
    toast.error("Gagal export data penjualan ke Excel.");
  }
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const rowPropsFn = (data: any) => {
  const row = data.item?.raw || data.item;
  if (!row) return { class: "" };
  let cls = "";
  if (row.Status === "Closed") cls += " row-closed";
  return { class: cls.trim() };
};
</script>

<template>
  <BaseBrowse
    title="Penjualan (SO)"
    :icon="IconShoppingCart"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :show-expand="true"
    :expanded="expanded"
    id-key="Nomor"
    item-value="Nomor"
    :summary-columns="[
      { key: 'Total' },
      { key: 'Ppn' },
      { key: 'Cash' },
      { key: 'Ongkir' },
      { key: 'Piutang' },
      { key: 'Card' }
    ]"
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
    </template>

    <template #extra-actions>
      <v-btn size="small" color="primary" variant="flat" @click="onBaru">
        + Baru
      </v-btn>
      <v-btn size="small" variant="outlined" :disabled="!selectedItem" @click="onUbah">
        Ubah
      </v-btn>
      <v-btn size="small" color="error" variant="tonal" :disabled="!selectedItem" @click="onHapus">
        Hapus
      </v-btn>
      <v-btn size="small" variant="tonal" color="primary" :loading="isPrinting" :disabled="!isSingleSelected" @click="doCetak">
        <template #prepend><IconPrinter :size="13" :stroke-width="1.8" /></template>
        Cetak
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend><IconFileSpreadsheet :size="13" :stroke-width="1.8" /></template>
        Export
      </v-btn>
    </template>

    <template #item.Nomor="{ item }">
      <span class="font-weight-medium">{{ item.Nomor }}</span>
    </template>

    <template #item.Tanggal="{ item }">
      <div class="tc">{{ item.Tanggal }}</div>
    </template>

    <template #item.Total="{ item }">
      <div class="tr font-weight-bold" :class="Number(item.Total) < 0 ? 'val-red' : 'val-green'">
        Rp {{ fmtCurrency(item.Total) }}
      </div>
    </template>

    <template #item.Ppn="{ item }">
      <div class="tr text-blue-darken-4">{{ fmtCurrency(item.Ppn) }}</div>
    </template>

    <template #item.Cash="{ item }">
      <div class="tr text-green-darken-4">{{ fmtCurrency(item.Cash) }}</div>
    </template>

    <template #item.Ongkir="{ item }">
      <div class="tr text-orange-darken-3">{{ fmtCurrency(item.Ongkir) }}</div>
    </template>

    <template #item.Piutang="{ item }">
      <div class="tr text-red-darken-3">{{ fmtCurrency(item.Piutang) }}</div>
    </template>

    <template #item.Card="{ item }">
      <div class="tr text-purple-darken-3">{{ fmtCurrency(item.Card) }}</div>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="width:36px" class="tc">No</th>
              <th style="width:130px">Barcode / Kode</th>
              <th style="width:auto">Nama Barang</th>
              <th style="width:80px" class="tc">Satuan</th>
              <th style="width:70px" class="tr">Qty</th>
              <th style="width:80px" class="tr">Qty Kirim</th>
              <th style="width:110px" class="tr">Harga Satuan</th>
              <th style="width:70px" class="tr">Disc (%)</th>
              <th style="width:120px" class="tr">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="detailLoading[item.nomor || item.Nomor]">
              <td colspan="9" class="tc" style="padding:16px">
                <v-progress-circular indeterminate size="20" width="2" color="primary" />
                <span style="margin-left:8px; color:#6b7280;">Memuat detail...</span>
              </td>
            </tr>
            <tr v-else-if="detailError[item.nomor || item.Nomor]">
              <td colspan="9" class="tc" style="padding:16px">
                <span style="color:#dc2626;">Gagal memuat detail barang.</span>
                <v-btn size="x-small" variant="tonal" color="primary" class="ml-2"
                       @click="retryDetail(item.nomor || item.Nomor)">
                  <template #prepend><IconRefresh :size="12" /></template>
                  Coba Lagi
                </v-btn>
              </td>
            </tr>
            <template v-else>
              <tr v-for="(d, idx) in getDetail(item.nomor || item.Nomor)" :key="idx">
                <td class="tc" style="color:#6b7280; font-weight:bold;">{{ idx + 1 }}</td>
                <td><span class="mono">{{ d.barcode || d.brgKode }}</span></td>
                <td class="font-weight-bold" style="color:#1f2937;">{{ d.brgNama || d.NamaBarang }}</td>
                <td class="tc">{{ d.satuan || d.Satuan }}</td>
                <td class="tr font-weight-bold val-yellow">{{ d.qty || d.Qty }}</td>
                <td class="tr font-weight-bold text-blue-darken-3">
                  {{ d.QtyKirim || 0 }}
                </td>
                <td class="tr font-weight-bold" :class="(d.harga || d.Harga) < 0 ? 'val-red' : 'val-green'">
                  Rp {{ fmtCurrency(d.harga || d.Harga) }}
                </td>
                <td class="tr text-red">{{ d.discPr || d.DiscPr || 0 }}%</td>
                <td class="tr font-weight-bold"
                  :class="((d.qty || d.Qty) * (d.harga || d.Harga) - (((d.qty || d.Qty) * (d.harga || d.Harga) * (d.discPr || d.DiscPr || 0)) / 100)) < 0 ? 'val-red' : 'val-green'">
                  Rp {{ fmtCurrency((d.qty || d.Qty) * (d.harga || d.Harga) - (((d.qty || d.Qty) * (d.harga || d.Harga) * (d.discPr || d.DiscPr || 0)) / 100)) }}
                </td>
              </tr>
              <tr v-if="!getDetail(item.nomor || item.Nomor).length">
                <td colspan="9" class="tc" style="color:#9e9e9e; font-style:italic; padding:12px">
                  Tidak ada detail barang penjualan.
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>


  </BaseBrowse>

  <!-- ── Printer Dialog ── -->
  <PrinterDialog
    v-model="showPrinterDialog"
    @saved="onPrinterSaved"
  />

  <!-- ── Print Preview Dialog ── -->
  <PrintPreviewDialog
    v-model="showPreviewDialog"
    title="Preview Faktur Penjualan"
    :lines="previewLines"
    :is-loading="isPrinting"
    @print="onPrintFromPreview"
  />
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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

.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.val-green { color: #15803d; }
.val-red { color: #dc2626; }
.val-yellow { color: #a16207; }

:deep(.row-closed td) {
  color: #9e9e9e !important;
}

.badge-closed {
  background: #e0e0e0;
  color: #616161;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-open {
  background: #E8E8F5;
  color: #3B5998;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
</style>
