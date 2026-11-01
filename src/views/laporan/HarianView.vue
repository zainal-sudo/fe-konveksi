<script setup lang="ts">
import { ref, computed, watch, onActivated } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import {
  harianApi,
  type HarianBrowseData,
} from "@/api/laporan/harianApi";
import {
  generatePreviewHarian,
  generateEscPosHarian,
} from "@/utils/harianPrint";
import { useQzPrint } from "@/composables/useQzPrint";
import PrinterDialog from "@/components/PrinterDialog.vue";
import PrintPreviewDialog from "@/components/PrintPreviewDialog.vue";
import {
  IconRefresh,
  IconPrinter,
  IconFileText,
} from "@tabler/icons-vue";

const toast = useToast();

// ── Tanggal (persist sessionStorage) ─────────────────────────────────
const ST_TGL = "laporan_harian_tanggal";
const ST_TAB = "laporan_harian_tab";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const tanggal = ref(
  (() => {
    try { return sessionStorage.getItem(ST_TGL) || getLocal(new Date()); }
    catch { return getLocal(new Date()); }
  })()
);

watch(tanggal, (v) => {
  try { sessionStorage.setItem(ST_TGL, v); } catch {}
});

// ── Tab ──────────────────────────────────────────────────────────────
type TabKey = "penjualan" | "penerimaanLain" | "pembayaranLain" | "bayarCustomer";

const TABS: { key: TabKey; label: string }[] = [
  { key: "penjualan", label: "Penjualan" },
  { key: "penerimaanLain", label: "Penerimaan Lain" },
  { key: "pembayaranLain", label: "Pembayaran Lain" },
  { key: "bayarCustomer", label: "Pembayaran Customer" },
];

const activeTab = ref<TabKey>(
  (() => {
    try { return (sessionStorage.getItem(ST_TAB) as TabKey) || "penjualan"; }
    catch { return "penjualan" as TabKey; }
  })()
);

watch(activeTab, (v) => {
  try { sessionStorage.setItem(ST_TAB, v); } catch {}
});

// ── Data ─────────────────────────────────────────────────────────────
const isLoading = ref(false);
const data = ref<HarianBrowseData>({
  penjualan: [],
  penerimaanLain: [],
  pembayaranLain: [],
  bayarCustomer: [],
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    data.value = await harianApi.getBrowse(tanggal.value);
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message || "Gagal memuat data laporan harian.");
  } finally {
    isLoading.value = false;
  }
};

onActivated(fetchData);
watch(tanggal, () => fetchData());

// ── Totals ───────────────────────────────────────────────────────────
const tPenjualan = computed(() => {
  const rows = data.value.penjualan;
  return {
    total: rows.reduce((s, r) => s + (Number(r.Total) || 0), 0),
    cash: rows.reduce((s, r) => s + (Number(r.Cash) || 0), 0),
    card: rows.reduce((s, r) => s + (Number(r.Card) || 0), 0),
    voucher: rows.reduce((s, r) => s + (Number(r.Voucher) || 0), 0),
    piutang: rows.reduce((s, r) => s + (Number(r.Piutang) || 0), 0),
  };
});

const tNilai = (rows: HarianLainRow[]) =>
  rows.reduce((s, r) => s + (Number(r.Nilai) || 0), 0);
const tPenerimaanLain = computed(() => tNilai(data.value.penerimaanLain));
const tPembayaranLain = computed(() => tNilai(data.value.pembayaranLain));

const tBayarCustomer = computed(() =>
  data.value.bayarCustomer.reduce(
    (s, r) => s + (Number(r.TOTAL_BAYAR) || 0), 0
  )
);

const rowsOf = (key: TabKey): any[] => (data.value as any)[key] || [];

// ── Cetak Dot Matrix (QZ Tray, paritas faktur penjualan) ─────────────
const { connect, printPages, getSavedPrinter } = useQzPrint();
const isPrinting = ref(false);
const showPrinterDialog = ref(false);
const showPreviewDialog = ref(false);
const previewLines = ref<string[]>([]);
const cachedPrintData = ref<any | null>(null);

const doCetak = async () => {
  isPrinting.value = true;
  try {
    const printData = await harianApi.getPrintData(tanggal.value);
    cachedPrintData.value = printData;
    if (!getSavedPrinter()) {
      showPrinterDialog.value = true;
      return;
    }
    previewLines.value = generatePreviewHarian(printData);
    showPreviewDialog.value = true;
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message || "Gagal memuat data cetak.");
  } finally {
    isPrinting.value = false;
  }
};

const onPrinterSaved = () => {
  showPrinterDialog.value = false;
  if (cachedPrintData.value) {
    previewLines.value = generatePreviewHarian(cachedPrintData.value);
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
    const pagesCommands = generateEscPosHarian(cachedPrintData.value);
    await connect();
    await printPages(savedPrinter, pagesCommands);
    toast.success("Berhasil dikirim ke printer!");
  } catch (e: any) {
    toast.error(e.message || "Gagal mencetak ke printer.");
  } finally {
    isPrinting.value = false;
    cachedPrintData.value = null;
  }
};

// ── Formatting ───────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const fmtDate = (val: string | null) => {
  if (!val) return "-";
  try {
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return val;
    return getLocal(dt);
  } catch { return val; }
};
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div class="head-info">
        <div class="head-ico">
          <IconFileText :size="22" :stroke-width="1.6" />
        </div>
        <div>
          <div class="head-title">Laporan Harian</div>
          <div class="head-sub">Rekap transaksi kas & transfer per tanggal</div>
        </div>
      </div>
      <div class="head-tools">
        <div class="filter-group">
          <span class="filter-lbl">Tanggal</span>
          <input v-model="tanggal" type="date" class="date-inp" />
        </div>
        <button class="tb-btn" :disabled="isLoading" @click="fetchData">
          <IconRefresh :size="13" :stroke-width="2" />
          Refresh
        </button>
        <button class="tb-btn tb-btn-primary" @click="doCetak">
          <IconPrinter :size="13" :stroke-width="2" />
          Cetak
        </button>
      </div>
    </div>

    <div class="tab-row">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="tbl-wrap">
      <!-- Penjualan -->
      <table v-if="activeTab === 'penjualan'" class="data-tbl">
        <thead>
          <tr>
            <th style="width: 40px" class="tc">No</th>
            <th style="width: 110px">Nomor</th>
            <th style="width: 90px" class="tc">Tanggal</th>
            <th style="min-width: 160px">Customer</th>
            <th style="width: 60px" class="tc">Pajak</th>
            <th style="width: 110px" class="tr">Total</th>
            <th style="width: 100px" class="tr">Cash</th>
            <th style="width: 100px" class="tr">Card</th>
            <th style="width: 110px" class="tr">Voucher</th>
            <th style="width: 110px" class="tr">Piutang</th>
            <th style="width: 70px" class="tc">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rowsOf('penjualan')" :key="r.Nomor">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="mono">{{ r.Nomor }}</td>
            <td class="tc">{{ fmtDate(r.Tanggal) }}</td>
            <td>{{ r.Customer || "-" }}</td>
            <td class="tc">{{ r.Pajak }}</td>
            <td class="tr num">{{ fmt(r.Total) }}</td>
            <td class="tr num">{{ fmt(r.Cash) }}</td>
            <td class="tr num">{{ fmt(r.Card) }}</td>
            <td class="tr num">{{ fmt(r.Voucher) }}</td>
            <td class="tr num">{{ fmt(r.Piutang) }}</td>
            <td class="tc">{{ r.Status }}</td>
          </tr>
          <tr v-if="!rowsOf('penjualan').length">
            <td colspan="11" class="empty-td">Tidak ada data penjualan.</td>
          </tr>
          <tr v-if="rowsOf('penjualan').length" class="sum-row">
            <td colspan="5" class="tr bold">Total</td>
            <td class="tr bold num">{{ fmt(tPenjualan.total) }}</td>
            <td class="tr bold num">{{ fmt(tPenjualan.cash) }}</td>
            <td class="tr bold num">{{ fmt(tPenjualan.card) }}</td>
            <td class="tr bold num">{{ fmt(tPenjualan.voucher) }}</td>
            <td class="tr bold num">{{ fmt(tPenjualan.piutang) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Penerimaan Lain -->
      <table v-if="activeTab === 'penerimaanLain'" class="data-tbl">
        <thead>
          <tr>
            <th style="width: 40px" class="tc">No</th>
            <th style="width: 110px">Nomor</th>
            <th style="width: 90px" class="tc">Tanggal</th>
            <th style="min-width: 220px">Keterangan</th>
            <th style="width: 70px" class="tc">Closed</th>
            <th style="width: 120px" class="tr">Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rowsOf('penerimaanLain')" :key="r.Nomor">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="mono">{{ r.Nomor }}</td>
            <td class="tc">{{ fmtDate(r.Tanggal) }}</td>
            <td>{{ r.Keterangan || "-" }}</td>
            <td class="tc">{{ r.IsClosed }}</td>
            <td class="tr num">{{ fmt(r.Nilai) }}</td>
          </tr>
          <tr v-if="!rowsOf('penerimaanLain').length">
            <td colspan="6" class="empty-td">Tidak ada penerimaan lain.</td>
          </tr>
          <tr v-if="rowsOf('penerimaanLain').length" class="sum-row">
            <td colspan="5" class="tr bold">Total Nilai</td>
            <td class="tr bold num">{{ fmt(tPenerimaanLain) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pembayaran Lain -->
      <table v-if="activeTab === 'pembayaranLain'" class="data-tbl">
        <thead>
          <tr>
            <th style="width: 40px" class="tc">No</th>
            <th style="width: 110px">Nomor</th>
            <th style="width: 90px" class="tc">Tanggal</th>
            <th style="min-width: 220px">Keterangan</th>
            <th style="width: 70px" class="tc">Closed</th>
            <th style="width: 120px" class="tr">Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rowsOf('pembayaranLain')" :key="r.Nomor">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="mono">{{ r.Nomor }}</td>
            <td class="tc">{{ fmtDate(r.Tanggal) }}</td>
            <td>{{ r.Keterangan || "-" }}</td>
            <td class="tc">{{ r.IsClosed }}</td>
            <td class="tr num">{{ fmt(r.Nilai) }}</td>
          </tr>
          <tr v-if="!rowsOf('pembayaranLain').length">
            <td colspan="6" class="empty-td">Tidak ada pembayaran lain.</td>
          </tr>
          <tr v-if="rowsOf('pembayaranLain').length" class="sum-row">
            <td colspan="5" class="tr bold">Total Nilai</td>
            <td class="tr bold num">{{ fmt(tPembayaranLain) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pembayaran Customer -->
      <table v-if="activeTab === 'bayarCustomer'" class="data-tbl">
        <thead>
          <tr>
            <th style="width: 40px" class="tc">No</th>
            <th style="width: 110px">Nomor</th>
            <th style="width: 90px" class="tc">Tanggal</th>
            <th style="min-width: 160px">Customer</th>
            <th style="min-width: 150px">Kas / Bank</th>
            <th style="width: 120px" class="tr">Total Bayar</th>
            <th style="width: 70px" class="tc">Posting</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rowsOf('bayarCustomer')" :key="r.NOMOR">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="mono">{{ r.NOMOR }}</td>
            <td class="tc">{{ fmtDate(r.TANGGAL) }}</td>
            <td>{{ r.CUS_NAMA || "-" }}</td>
            <td>{{ r.REK_NAMA || r.REK_KODE || "-" }}</td>
            <td class="tr num">{{ fmt(r.TOTAL_BAYAR) }}</td>
            <td class="tc">{{ r.POSTING ? "Ya" : "Tidak" }}</td>
          </tr>
          <tr v-if="!rowsOf('bayarCustomer').length">
            <td colspan="7" class="empty-td">Tidak ada pembayaran customer.</td>
          </tr>
          <tr v-if="rowsOf('bayarCustomer').length" class="sum-row">
            <td colspan="5" class="tr bold">Total Bayar</td>
            <td class="tr bold num">{{ fmt(tBayarCustomer) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Printer Dialog ── -->
    <PrinterDialog v-model="showPrinterDialog" @saved="onPrinterSaved" />

    <!-- ── Print Preview Dialog (teks, paritas faktur) ── -->
    <PrintPreviewDialog
      v-model="showPreviewDialog"
      title="Preview Laporan Harian"
      :lines="previewLines"
      :is-loading="isPrinting"
      @print="onPrintFromPreview"
    />
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 16px 20px;
  background: #f4f6fa;
  min-height: calc(100vh - 56px);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.head-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.head-ico {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-primary, #3b5998);
  color: white;
}

.head-title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
}

.head-sub {
  font-size: 12px;
  color: #6b7280;
}

.head-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.date-inp {
  height: 32px;
  border: 1px solid var(--ds-border, #a0aab8);
  border-radius: 0;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 140px;
  background: white;
}

.date-inp:focus {
  border-color: var(--ds-primary, #3b5998);
}

.tb-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tb-btn-primary {
  background: var(--ds-primary, #3b5998);
  border-color: var(--ds-primary, #3b5998);
  color: white;
}

.tab-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.tab-btn {
  height: 30px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--ds-border, #a0aab8);
  border-bottom: none;
  background: #e5e7eb;
  color: #6b7280;
  cursor: pointer;
}

.tab-btn.active {
  background: white;
  color: var(--ds-primary, #3b5998);
}

.tbl-wrap {
  background: white;
  padding-bottom: 1px;
  border: 1px solid var(--ds-border, #a0aab8);
}

.data-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-tbl thead tr {
  background: var(--ds-primary, #3b5998);
}

.data-tbl th {
  color: white;
  font-weight: 700;
  padding: 6px 8px;
  white-space: nowrap;
  text-align: left;
}

.data-tbl th.tr { text-align: right; }
.data-tbl th.tc { text-align: center; }

.data-tbl td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.data-tbl tbody tr:hover td {
  background: var(--ds-primary-50, #e8edf5);
}

.sum-row td {
  background: #f9fafb;
  border-top: 2px solid var(--ds-primary, #3b5998);
}

.tc { text-align: center; }
.tr { text-align: right; }
.mono { font-family: monospace; }
.bold { font-weight: 700; }
.num { font-variant-numeric: tabular-nums; }

.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
}
</style>
