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

const LINES_PER_PAGE = 33;
const DATA_PER_PAGE = 10;
// header 10 baris + data + separator = 21 baris, sisa diisi agar baris berikutnya tepat di halaman baru
const PAGE_FILL = LINES_PER_PAGE - (10 + DATA_PER_PAGE + 1);
const totalW = 130;
const colNo = 3, colKode = 12, colNama = 40, colSat = 10, colQty = 10, colDisc = 10, colHrg = 14, colTotal = 15;

const padRight = (str: string, len: number): string => {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
};
const padLeft = (str: string, len: number): string => {
  return str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
};
const fmtFloat = (v: number) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(v || 0);

const formatHeaderLinesFaktur = (data: any): string[] => {
  return [
    padRight(data.perusahaan.nama, 79) + " " + padRight("FAKTUR PENJUALAN", 40),
    padRight(data.perusahaan.alamat + ", " + data.perusahaan.kota, totalW),
    padRight(data.perusahaan.notelp, totalW),
    "",
    padRight("Nomor      : " + data.nomor, 60) + " " + padRight("Customer : " + data.cus_nama, 60),
    padRight("Tanggal    : " + data.tanggal, 60) + " " + padRight(data.cus_alamat, 60),
    padRight("Memo       : " + data.memo, 60) + " " + padRight(data.cus_telp || "", 60),
    "-".repeat(totalW),
    padRight("No", colNo) + " " + padRight("Kode", colKode) + " " + padRight("Nama", colNama) + " " + padRight("Satuan", colSat) + " " + padLeft("Jumlah", colQty) + " " + padLeft("Disc(%)", colDisc) + " " + padLeft("Harga", colHrg) + " " + padLeft("Total", colTotal),
    "-".repeat(totalW),
  ];
};

// ── Blok pembayaran & total (dua kolom: pembayaran | total) ───────────
interface PrintMoneyLine {
  label: string;
  value: number;
  note?: string;
}

const MONEY_LABEL_W = 14;
const MONEY_VALUE_W = 15;
const MONEY_COL_W = MONEY_LABEL_W + 1 + MONEY_VALUE_W; // 30 karakter
// 4 kolom: pembayaran (kiri) | tanda tangan (tengah) | total (kanan)
const PAY_COL_W = 34;
const TOT_COL_W = 34;
const SIG_COL_W = Math.floor((totalW - PAY_COL_W - TOT_COL_W) / 2); // 31 karakter

const centerText = (text: string, width: number): string => {
  const gap = Math.max(0, Math.floor((width - text.length) / 2));
  return padRight(" ".repeat(gap) + text, width);
};

// Kolom kiri: pembayaran (sampai kembalian)
const buildPaymentColumn = (data: any): PrintMoneyLine[] => {
  const bayar = Number(data.bayar || 0);
  const voucher = Number(data.voucher || 0);
  const card = Number(data.card || 0);
  const piutang = Number(data.piutang || 0);
  const kembali = Number(data.kembali || 0);
  const dp = Number(data.dp || 0);

  const lines: PrintMoneyLine[] = [
    { label: "Tunai         :", value: bayar },
  ];
  if (voucher !== 0)
    lines.push({ label: "Voucher       :", value: voucher, note: data.noVoucher });
  if (card !== 0)
    lines.push({
      label: "Card          :",
      value: card,
      note: [data.noCard, data.bankCard].filter(Boolean).join(" - "),
    });
  if (piutang !== 0) lines.push({ label: "Piutang       :", value: piutang });
  lines.push({ label: "Kembalian     :", value: kembali });
  if (dp !== 0) lines.push({ label: "Kas di Laci   :", value: dp });
  return lines;
};

// Kolom kanan: diskon, total, ppn, ongkir, grand total
const buildTotalColumn = (data: any): PrintMoneyLine[] => {
  const total = Number(data.total || 0); // sudah termasuk pajak
  const nilai = Number(data.nilai || total); // net sebelum pajak
  const taxamount = Number(data.taxamount || 0);
  const ongkir = Number(data.ongkir || 0);
  const discFaktur = Number(data.discFaktur || 0);
  const grandTotal = Number(data.grandTotal || total + ongkir);

  const lines: PrintMoneyLine[] = [
    { label: "Disc Faktur   :", value: discFaktur },
    { label: "Total         :", value: nilai },
    { label: "Ppn           :", value: taxamount },
  ];
  if (ongkir !== 0) lines.push({ label: "Ongkir        :", value: ongkir });
  lines.push({ label: "Grand Total   :", value: grandTotal });
  return lines;
};

// Baris ringkasan 4 kolom: pembayaran (kiri) | tanda tangan (tengah) | total (kanan)
const buildSummaryRows = (data: any): string[] => {
  const payCol = buildPaymentColumn(data);
  const totCol = buildTotalColumn(data);
  const rows: string[] = [];

  // Judul kolom
  rows.push(
    padRight("PEMBAYARAN", PAY_COL_W) +
      padRight("", SIG_COL_W * 2) +
      padRight("TOTAL", TOT_COL_W)
  );

  const moneyPart = (m: PrintMoneyLine | undefined): string => {
    if (!m) return padRight("", MONEY_COL_W);
    return (
      padRight(m.label, MONEY_LABEL_W) +
      " " +
      padLeft(fmtFloat(m.value), MONEY_VALUE_W)
    );
  };

  const maxRows = Math.max(payCol.length, totCol.length);
  for (let i = 0; i < maxRows; i++) {
    // Label tanda tangan sejajar dengan baris "Tunai" (baris uang pertama)
    let mid1 = "";
    let mid2 = "";
    if (i === 0) {
      mid1 = centerText("Dibuat oleh,", SIG_COL_W);
      mid2 = centerText("Mengetahui,", SIG_COL_W);
    }
    rows.push(
      padRight(moneyPart(payCol[i]), PAY_COL_W) +
        padRight(mid1, SIG_COL_W) +
        padRight(mid2, SIG_COL_W) +
        padRight(moneyPart(totCol[i]), TOT_COL_W)
    );
  }

  // Nomor voucher / kartu (bila ada)
  const notes: string[] = [];
  if (data.noVoucher) notes.push("No. Voucher: " + data.noVoucher);
  if (data.noCard)
    notes.push(
      "No. Card: " +
        data.noCard +
        (data.bankCard ? " (" + data.bankCard + ")" : "")
    );
  if (notes.length) rows.push(notes.join("  |  "));

  // Ruang tanda tangan (kurung) tetap di bawah
  rows.push(
    padRight("", PAY_COL_W) +
      padRight(centerText("(              )", SIG_COL_W), SIG_COL_W) +
      padRight(centerText("(              )", SIG_COL_W), SIG_COL_W) +
      padRight("", TOT_COL_W)
  );

  return rows;
};


const formatDetailLineFaktur = (i: number, d: any): string => {
  const qty = Number(d.qty || d.Qty || 0);
  const harga = Number(d.harga || d.Harga || 0);
  const discpr = Number(d.discPr || d.DiscPr || 0);
  const sub = (100 - discpr) / 100 * harga * qty;
  const kode = d.barcode || d.brgKode || d.kode || "";
  const nama = d.brgNama || d.NamaBarang || d.nama || "";
  const satuan = d.satuan || d.Satuan || "";

  return (
    padRight(String(i), colNo) + " " +
    padRight(kode, colKode) + " " +
    padRight(nama.substring(0, colNama), colNama) + " " +
    padRight(satuan, colSat) + " " +
    padLeft(fmtFloat(qty), colQty) + " " +
    padLeft(fmtFloat(discpr), colDisc) + " " +
    padLeft(fmtFloat(harga), colHrg) + " " +
    padLeft(fmtFloat(sub), colTotal)
  );
};

const generatePreviewFaktur = (data: any): string[] => {
  const lines: string[] = [];
  lines.push(...formatHeaderLinesFaktur(data));

  let i = 0;
  for (const d of data.detail) {
    i++;
    lines.push(formatDetailLineFaktur(i, d));
    if (i % DATA_PER_PAGE === 0 && i < data.detail.length) {
      lines.push("-".repeat(totalW));
      for (let a = 0; a < PAGE_FILL; a++) lines.push("");
      lines.push(...formatHeaderLinesFaktur(data));
    }
  }

  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) lines.push("");
  }
  lines.push("-".repeat(totalW));
  lines.push(...buildSummaryRows(data));

  return lines;
};

const generateEscPosFaktur = (data: any): string[] => {
  const NL = "\r\n";
  const ESC = "\x1B";
  const SI = "\x0F";
  const commands: string[] = [];

  commands.push(ESC + "@");
  commands.push(SI);
  commands.push(ESC + "2");
  commands.push(ESC + "C" + String.fromCharCode(LINES_PER_PAGE));
  commands.push(ESC + "d" + "\x00");

  for (const line of formatHeaderLinesFaktur(data)) {
    commands.push(line + NL);
  }

  let i = 0;
  for (const d of data.detail) {
    i++;
    commands.push(formatDetailLineFaktur(i, d) + NL);
    if (i % DATA_PER_PAGE === 0 && i < data.detail.length) {
      commands.push("-".repeat(totalW) + NL);
      for (let a = 0; a < PAGE_FILL; a++) {
        commands.push(NL);
      }
      for (const line of formatHeaderLinesFaktur(data)) {
        commands.push(line + NL);
      }
    }
  }

  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) commands.push(NL);
  }
  commands.push("-".repeat(totalW) + NL);

  for (const row of buildSummaryRows(data)) {
    commands.push(row + NL);
  }

  return commands;
};

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

    <template #summary-row="{ filteredItems }">
      <span class="summary-lbl" style="color: white; font-weight: bold;">Total Penjualan</span>
      <span class="summary-val" style="color: white; font-weight: bold;">
        {{
          fmt(
            filteredItems.reduce(
              (s: number, r: any) => s + Number(r.Total),
              0,
            ),
          )
        }}
      </span>
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
