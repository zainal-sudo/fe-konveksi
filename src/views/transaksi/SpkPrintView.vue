<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { spkFormApi } from "@/api/transaksi/spkFormApi";
import { spkApi, type SpkKomposisiRow } from "@/api/transaksi/spkApi";
import { spkDetailApi } from "@/api/transaksi/spkDetailApi";
import { useQzPrint } from "@/composables/useQzPrint";
import { useCompanyInfo } from "@/composables/useCompanyInfo";
import PrinterDialog from "@/components/PrinterDialog.vue";
import PrintPreviewDialog from "@/components/PrintPreviewDialog.vue";
import { IconPrinter, IconRefresh, IconArrowLeft } from "@tabler/icons-vue";
import logoUrl from "@/assets/logo.png";


const route = useRoute();
const router = useRouter();
const toast = useToast();
const { connect, getSavedPrinter, printPages, generateEscPosSPK } = useQzPrint();
const { companyInfo, fetchCompanyInfo } = useCompanyInfo();

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push("/transaksi/spk");
};

const perusahaan = computed(() => {
  const c = companyInfo.value;
  if (!c) return { nama: "", alamat: "", inisial: "" };
  const alamatLengkap = [c.alamat, c.kota].filter((v) => v && v !== "-").join(", ");
  const inisial = (c.nama || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
  return {
    nama: c.nama,
    alamat: alamatLengkap || "-",
    inisial: inisial || "??",
  };
});

interface HistoryDetailItem {
  mesin: string;
  operator: string;
  jumlah: number;
}
interface HistoryRow {
  Nomor: string;
  Tanggal: string;
  Urutan: number;
  Tahap: string;
  Jumlah: number;
  Detail?: HistoryDetailItem[];
}

interface PrintData {
  nomor: string;
  nama: string;
  brgNama: string;
  satuan: string;
  custNama: string;
  // ⚠️ tanggal_fmt = tanggal SPK / tanggal PEMBUATAN SPK (kolom
  // spk_tanggal), BUKAN tanggal produksi (spk_tanggal_produksi).
  // Keduanya terpisah sejak revisi 2026-10-09; sejak revisi 2026-10-05
  // nilai ini dicetak berlabel "Tanggal SPK" di kolom KIRI.
  tanggal_fmt: string;
  dateline_fmt: string;
  idBatch: string;
  jumlah: number;
  jumlahJadi: number;
  keterangan: string;
  // ── Field baru (revisi 2026-10-09) ───────────────────────────────
  tanggalProduksi_fmt: string;
  shift: number;
  noPo: string;
  tanggalPo_fmt: string;
  isClosed: boolean;
  memoClose: string;
}

const data = ref<PrintData | null>(null);
const komposisi = ref<SpkKomposisiRow[]>([]);
const history = ref<HistoryRow[]>([]);
const isLoading = ref(true);
const isPrinting = ref(false);
const showPrinterDialog = ref(false);
const showPreviewDialog = ref(false);
const previewLines = ref<string[]>([]);
const printerName = ref<string | null>(null);

const fmt = (v: number) => new Intl.NumberFormat("en-US").format(v || 0);
const fmtQty = (v: number) => {
  if (!v) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(v);
};

const totalQty = (row: SpkKomposisiRow) => {
  if (!data.value) return 0;
  return row.qtyPerUnit * (data.value.jumlah || 0);
};

// Flatten history (1 baris per mesin/operator, seperti tabel di layar)
// jadi baris-baris rata untuk preview teks / ESC-POS / tabel Proses di kertas.
// CATATAN: dipakai untuk menghitung JUMLAH BARIS proses saja (mengikuti
// jumlah tahap/mesin/operator dari histori) — isi kolom Tanggal Proses,
// Qty Masuk, Qty Keluar, Mesin, Operator, Paraf SENGAJA dikosongkan di
// tabel cetak (lihat <tbody> tabel Proses di bawah), supaya diisi manual.
const flatHistoryRows = computed(() => {
  const rows: { nomor: string; tanggal: string; urutan: number; tahap: string; jumlah: number; mesin: string; operator: string }[] = [];
  for (const h of history.value) {
    if (h.Detail && h.Detail.length) {
      h.Detail.forEach((d, i) => {
        rows.push({
          nomor: i === 0 ? h.Nomor : "",
          tanggal: i === 0 ? h.Tanggal : "",
          urutan: h.Urutan,
          tahap: i === 0 ? h.Tahap : "",
          jumlah: i === 0 ? h.Jumlah : 0,
          mesin: d.mesin || "-",
          operator: d.operator || "-",
        });
      });
    } else {
      rows.push({
        nomor: h.Nomor, tanggal: h.Tanggal, urutan: h.Urutan, tahap: h.Tahap,
        jumlah: h.Jumlah, mesin: "-", operator: "-",
      });
    }
  }
  return rows;
});

// Jumlah baris kosong minimum supaya tabel tidak terlihat "gepeng" saat
// datanya sedikit, meniru kolom kosong yang siap diisi tangan di form kertas.
const MIN_BAHAN_ROWS = 9;
const MIN_PROSES_ROWS = 7;

const bahanBlankRows = computed(() =>
  Math.max(0, MIN_BAHAN_ROWS - komposisi.value.length)
);
const prosesBlankRows = computed(() =>
  Math.max(0, MIN_PROSES_ROWS - flatHistoryRows.value.length)
);

// ── Generate preview text (plain), dipakai sebelum kirim ke QZ Tray ──
const generatePreviewSPK = (): string[] => {
  if (!data.value) return [];
  const d = data.value;
  const lines: string[] = [];
  const totalW = 132;
  const colL = 66;

  const padRight = (str: string, len: number): string =>
    str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
  const padLeft = (str: string, len: number): string =>
    str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
  const center = (str: string, len: number): string => {
    if (str.length >= len) return str.substring(0, len);
    const totalPad = len - str.length;
    const left = Math.floor(totalPad / 2);
    return " ".repeat(left) + str + " ".repeat(totalPad - left);
  };

  lines.push(perusahaan.value.nama.toUpperCase());
  lines.push(perusahaan.value.alamat);
  lines.push("");
  lines.push(center("SURAT PERINTAH KERJA", totalW));
  lines.push("");

  const infoLines = [
    `No. SPK  : ${d.nomor}`,
    `Nama SPK : ${d.nama}`,
    `Tanggal  : ${d.tanggal_fmt}`,
    // ⬅️ DateLine opsional (revisi 2026-10-13): label tetap dicetak, nilai
    // boleh kosong. Baris TIDAK dihapus — posisinya berpasangan dengan
    // "Target" di kolom kanan (lihat loop 4 baris di bawah).
    `Dateline : ${d.dateline_fmt}`,
  ];
  const infoLines2 = [
    `Barang   : ${d.brgNama}`,
    `Customer : ${d.custNama}`,
    `Lot      : ${d.idBatch}`,
    `Target   : ${fmt(d.jumlah)} ${d.satuan}`,
  ];
  for (let i = 0; i < 4; i++) {
    lines.push(padRight(infoLines[i] || "", colL) + (infoLines2[i] || ""));
  }
  lines.push("");
  lines.push("=".repeat(totalW));

  lines.push("BAHAN BAKU & KEMASAN");
  lines.push("-".repeat(totalW));
  const bNo = 4, bNama = 55, bLot = 25, bQty = 15, bTot = 18, bSat = 10;
  lines.push(
    padRight("No", bNo) + padRight("Bahan Baku", bNama) + padRight("LOT", bLot) +
    padLeft("Qty/Box", bQty) + padLeft("Total Qty", bTot) + padLeft("Satuan", bSat)
  );
  lines.push("-".repeat(totalW));
  if (komposisi.value.length === 0) {
    lines.push(center("(belum ada data komposisi bahan)", totalW));
  } else {
    komposisi.value.forEach((row, idx) => {
      lines.push(
        padRight(String(idx + 1), bNo) +
        padRight(row.bahanNama, bNama) +
        padRight("", bLot) +
        padLeft(fmtQty(row.qtyPerUnit), bQty) +
        padLeft(fmtQty(totalQty(row)), bTot) +
        padLeft(row.satuan, bSat)
      );
    });
  }
  lines.push("-".repeat(totalW));
  lines.push("");

  lines.push("PROSES PRODUKSI");
  lines.push("-".repeat(totalW));
  const pNo = 4, pNomor = 16, pTgl = 12, pTahap = 40, pJml = 13, pMesin = 22, pOp = 20;
  lines.push(
    padRight("No", pNo) + padRight("Nomor LHK", pNomor) + padRight("Tanggal", pTgl) +
    padRight("Tahap", pTahap) + padLeft("Jml Lolos", pJml) + " " +
    padRight("Mesin", pMesin) + padRight("Operator", pOp)
  );
  lines.push("-".repeat(totalW));
  if (flatHistoryRows.value.length === 0) {
    lines.push(center("(belum ada laporan LHK)", totalW));
  } else {
    // Kolom Tanggal/Jumlah/Mesin/Operator SENGAJA dikosongkan di preview
    // cetak, hanya nomor urut + nama Tahap yang tetap tampil dari data.
    flatHistoryRows.value.forEach((row, idx) => {
      lines.push(
        padRight(String(idx + 1), pNo) +
        padRight("", pNomor) +
        padRight("", pTgl) +
        padRight(row.urutan ? `${row.urutan}. ${row.tahap}` : row.tahap, pTahap) +
        padLeft("", pJml) + " " +
        padRight("", pMesin) +
        padRight("", pOp)
      );
    });
  }
  lines.push("-".repeat(totalW));
  lines.push("");

  lines.push(`Keterangan : ${d.keterangan || "-"}`);
  lines.push("");
  lines.push("");
  const signColW = Math.floor(totalW / 3);
  lines.push(
    padRight(center("Dibuat,", signColW), signColW) +
    padRight(center("Diperiksa,", signColW), signColW) +
    center("Disetujui,", signColW)
  );
  lines.push(
    padRight(center("Staff PPIC", signColW), signColW) +
    padRight(center("Plt. Manager PPIC", signColW), signColW) +
    center("Plt. Manager Produksi", signColW)
  );
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push(
    padRight(center("(............................)", signColW), signColW) +
    padRight(center("(............................)", signColW), signColW) +
    center("(............................)", signColW)
  );

  return lines;
};

const printColorMode = ref<"bw" | "color">("bw");

const cetakHitamPutih = async () => {
  printColorMode.value = "bw";
  await nextTick();
  window.print();
};

const cetakBerwarna = async () => {
  printColorMode.value = "color";
  await nextTick();
  window.print();
};

// ── Cetak via QZ Tray ──
const cetakPrinter = () => {
  if (!data.value) return;
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    showPrinterDialog.value = true;
    return;
  }
  printerName.value = savedPrinter;
  previewLines.value = generatePreviewSPK();
  showPreviewDialog.value = true;
};

const onPrinterSaved = (name: string) => {
  printerName.value = name;
  showPrinterDialog.value = false;
  if (data.value) {
    previewLines.value = generatePreviewSPK();
    showPreviewDialog.value = true;
  }
};

const onGantiPrinter = () => {
  showPreviewDialog.value = false;
  showPrinterDialog.value = true;
};

const onPrintFromPreview = async (pageNumbers: number[]) => {
  if (!data.value) return;
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    toast.warning("Printer belum diset.");
    showPreviewDialog.value = false;
    showPrinterDialog.value = true;
    return;
  }

  try {
    isPrinting.value = true;
    const connected = await connect();
    if (!connected) {
      toast.error("Gagal menghubungkan ke QZ Tray. Pastikan QZ Tray sudah berjalan di komputer.");
      return;
    }

    // Kolom Tanggal/Jumlah/Mesin/Operator dikirim kosong ke ESC/POS juga,
    // supaya hasil cetak fisik konsisten dengan preview di layar.
    const pagesCommands = generateEscPosSPK({
      perusahaan: perusahaan.value.nama,
      alamat: perusahaan.value.alamat,
      nomor: data.value.nomor,
      nama: data.value.nama,
      brgNama: data.value.brgNama,
      satuan: data.value.satuan,
      custNama: data.value.custNama,
      tanggal: data.value.tanggal_fmt,
      dateline: data.value.dateline_fmt,
      idBatch: data.value.idBatch,
      jumlah: data.value.jumlah,
      keterangan: data.value.keterangan,
      komposisi: komposisi.value.map((r) => ({
        bahanNama: r.bahanNama,
        qtyPerUnit: r.qtyPerUnit,
        totalQty: totalQty(r),
        satuan: r.satuan,
      })),
      history: flatHistoryRows.value.map((row) => ({
        nomor: "",
        tanggal: "",
        urutan: row.urutan,
        tahap: row.tahap,
        jumlah: 0,
        mesin: "",
        operator: "",
      })),
    });

    await printPages(savedPrinter, pagesCommands, pageNumbers);
    toast.success("Berhasil dikirim ke printer!");
    showPreviewDialog.value = false;
  } catch (e: any) {
    console.error("Print error:", e);
    toast.error(e.message || "Gagal mencetak ke printer.");
  } finally {
    isPrinting.value = false;
  }
};

onMounted(async () => {
  try {
    isLoading.value = true;
    const nomor = decodeURIComponent(route.params.nomor as string);

    const [resForm] = await Promise.all([
      spkFormApi.getDetailForm(nomor),
      fetchCompanyInfo(),
    ]);

    if (resForm) {
      data.value = {
        nomor: resForm.nomor || nomor,
        nama: resForm.nama || "",
        brgNama: resForm.brgNama || "",
        satuan: resForm.satuan || "",
        custNama: resForm.custNama || "-",
        tanggal_fmt: resForm.tanggal || "",
        // ⬅️ Revisi 2026-10-13: DateLine opsional. Value as-is TANPA fallback
        // "-" supaya kosong di form tetap kosong di cetak — sesuai keputusan
        // "kalau tidak diisi, di cetaknya juga kosong". Barisnya disembunyikan
        // oleh v-if di template supaya tidak tercetak "Tanggal Pengiriman : -".
        dateline_fmt: resForm.dateline || "",
        idBatch: resForm.idBatch || "-",
        jumlah: Number(resForm.jumlah || 0),
        jumlahJadi: Number(resForm.jumlahJadi || 0),
        keterangan: resForm.keterangan || "",
        tanggalProduksi_fmt: resForm.tanggalProduksi || "-",
        shift: [1, 2, 3].includes(Number(resForm.shift)) ? Number(resForm.shift) : 1,
        noPo: resForm.noPo || "",
        tanggalPo_fmt: resForm.tanggalPo || "",
        isClosed: Number(resForm.isClosed || 0) === 1,
        memoClose: resForm.memoClose || "",
      };

      const [resKomposisi, resTahap] = await Promise.all([
        spkApi.getKomposisi(String(resForm.brgKode)).catch(() => []),
        // Versi konveksi tanpa LHK: baris tabel "Proses" di kertas dihitung
        // dari tahapan tspk_dtl (master proses saat SPK dibuat).
        spkDetailApi
          .getBySpk(nomor)
          .then((tah: any[]) =>
            tah.map((t) => ({
              Nomor: nomor,
              Tanggal: "",
              Urutan: t.urutan,
              Tahap: t.nama,
              Jumlah: t.target,
              Detail: [] as HistoryDetailItem[],
            })),
          )
          .catch(() => []),
      ]);
      komposisi.value = resKomposisi || [];
      history.value = resTahap || [];

      const savedPrinter = getSavedPrinter();
      if (savedPrinter) {
        printerName.value = savedPrinter;
      }
    }
  } catch (e: any) {
    console.error(e);
    toast.error(e.response?.data?.message || "Gagal memuat dokumen cetak SPK.");
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="print-wrapper pa-6" :class="'print-mode-' + printColorMode" v-if="data">
    <div class="print-toolbar no-print d-print-none">
      <v-btn variant="text" size="small" @click="goBack">
        <IconArrowLeft :size="16" class="mr-1" />
        Kembali
      </v-btn>
      <v-btn color="secondary" variant="flat" size="small" class="text-white" @click="cetakHitamPutih">
        <IconPrinter :size="16" class="mr-1" />
        Cetak SPK
      </v-btn>
      <v-btn variant="text" size="small" @click="onGantiPrinter">
        <IconRefresh :size="14" class="mr-1" />
        {{ printerName ? `Ganti Printer (${printerName})` : "Atur Printer" }}
      </v-btn>
    </div>

    <!-- ── Kop Surat: kotak berbingkai + logo (tanpa lingkaran) ── -->
    <header class="spk-header">
      <div class="spk-header-box">
        <img :src="logoUrl" alt="Logo" class="spk-logo" />
        <div class="spk-header-text">
          <h1 class="spk-title">Surat Perintah Kerja</h1>
          <h2 class="spk-company">{{ perusahaan.nama }}</h2>
        </div>
      </div>
    </header>

    <!-- ── Info SPK: 2 kolom (revisi 2026-10-05) ── -->
    <!-- Kiri: identitas. Kanan: alur waktu (shift → produksi → target →
         PO → tanggal PO → kirim). Tanggal SPK (= tgl pembuatan SPK)
         pindah ke kolom kiri, "Tgl. Pembuatan SPK" dihapus dari kanan
         supaya tidak tercetak dobel. No. PO pindah ke kanan, dekat
         Tanggal PO. -->
    <section class="spk-top-info">
      <table class="meta-tbl">
        <tr><td class="meta-lbl">No. SPK</td><td class="meta-colon">:</td><td class="meta-val">{{ data.nomor }}</td></tr>
        <tr><td class="meta-lbl">Tanggal SPK</td><td class="meta-colon">:</td><td class="meta-val">{{ data.tanggal_fmt }}</td></tr>
        <tr><td class="meta-lbl">Nama SPK</td><td class="meta-colon">:</td><td class="meta-val">{{ data.nama }}</td></tr>
        <tr><td class="meta-lbl">Customer</td><td class="meta-colon">:</td><td class="meta-val">{{ data.custNama }}</td></tr>
        <tr><td class="meta-lbl">Produk</td><td class="meta-colon">:</td><td class="meta-val">{{ data.brgNama }}</td></tr>
        <tr><td class="meta-lbl">Lot</td><td class="meta-colon">:</td><td class="meta-val">{{ data.idBatch }}</td></tr>
      </table>
      <table class="meta-tbl">
        <tr><td class="meta-lbl">Shift</td><td class="meta-colon">:</td><td class="meta-val">{{ data.shift }}</td></tr>
        <tr><td class="meta-lbl">Tanggal Produksi</td><td class="meta-colon">:</td><td class="meta-val">{{ data.tanggalProduksi_fmt }}</td></tr>
        <tr><td class="meta-lbl">Target Produksi</td><td class="meta-colon">:</td><td class="meta-val">{{ fmt(data.jumlah) }} {{ data.satuan }}</td></tr>
        <tr><td class="meta-lbl">No. PO</td><td class="meta-colon">:</td><td class="meta-val">{{ data.noPo || "-" }}</td></tr>
        <tr><td class="meta-lbl">Tanggal PO</td><td class="meta-colon">:</td><td class="meta-val">{{ data.tanggalPo_fmt || "-" }}</td></tr>
        <!-- ⬅️ Baris ini disembunyikan kalau DateLine kosong (revisi 2026-10-13).
             Lebih baik tidak ada baris daripada tercetak "Tanggal
             Pengiriman :" kosong — dokumen resmi tidak boleh terlihat
             seperti ada data yang belum terisi. -->
                    <tr v-if="data.dateline_fmt"><td class="meta-lbl">Tanggal Pengiriman</td><td class="meta-colon">:</td><td class="meta-val">{{ data.dateline_fmt }}</td></tr>
      </table>
    </section>

    <!-- Memo (revisi 2026-10-05). Hanya muncul kalau SPK sudah di-close —
         memo hanya bisa diisi setelah status CLOSED. Isinya catatan bebas
         hasil produksi, mis. "target 100 jadi 75, mesin macet". -->
    <section v-if="data.isClosed" class="spk-memo-close">
      <span class="smc-label">Memo</span>
      <span class="smc-value">{{ data.memoClose || "-" }}</span>
    </section>

    <!-- Info tambahan sistem yang tidak ada di form kertas asli, ditaruh
         sebagai baris tipis di bawah grid supaya Nama SPK & Lot tidak
         hilang tanpa merusak layout kertas resmi. -->
    

    <!-- ── Bahan Baku & Kemasan ── -->
    <table class="form-table mt-2">
      <thead>
        <tr>
          <th style="width: 32%">Bahan Baku &amp; Kemasan</th>
          <th style="width: 25%">LOT Bahan / Kemasan</th>
          <th style="width: 11%">Qty/Box</th>
          <th style="width: 11%">Total Qty</th>
          <th style="width: 11%">Satuan</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in komposisi" :key="row.bahanKode">
          <td>{{ row.bahanNama }}</td>
          <td class="lot-cell">&nbsp;</td>
          <td class="tr">{{ fmtQty(row.qtyPerUnit) }}</td>
          <td class="tr">{{ fmtQty(totalQty(row)) }}</td>
          <td class="tc">{{ row.satuan }}</td>
        </tr>
        <tr v-for="n in bahanBlankRows" :key="'bahan-blank-' + n" class="blank-row">
          <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <!-- ── Proses ──
         Kolom Tanggal Proses, Qty Masuk, Qty Keluar, Mesin, Operator, Paraf
         SENGAJA dikosongkan (tidak diisi otomatis dari histori LHK) —
         hanya kolom Proses (nama tahap) yang tetap tampil, sisanya diisi
         tangan di kertas. -->
    <table class="form-table mt-2">
      <thead>
        <tr>
          <th style="width: 16%">Proses</th>
          <th style="width: 12%">Tanggal Proses</th>
          <th style="width: 10%">Qty Masuk</th>
          <th style="width: 10%">Qty Keluar</th>
          <th style="width: 16%">Mesin</th>
          <th style="width: 16%">Operator</th>
          <th style="width: 10%">Paraf</th>
        </tr>
      </thead>
      <tbody>
       <tr v-for="(row, idx) in flatHistoryRows" :key="idx + '-' + row.mesin + '-' + row.operator">
  <td>&nbsp;</td>
  <td class="tc">&nbsp;</td>
  <td class="tc">&nbsp;</td>
  <td class="tr">&nbsp;</td>
  <td>&nbsp;</td>
  <td>&nbsp;</td>
  <td>&nbsp;</td>
</tr>
        <tr v-for="n in prosesBlankRows" :key="'proses-blank-' + n" class="blank-row">
          <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <!-- ── Sisa Bahan Baku / Problem — jarak ke tabel Proses di atas
         disamakan (mt-2) dengan jarak antar tabel Bahan Baku → Proses ── -->
    <section class="spk-bottom-boxes mt-2">
      <div class="bottom-box">
        <div class="bottom-box-lbl">Sisa Bahan Baku / Kemasan</div>
      </div>
      <div class="bottom-box bottom-box-right">
        <div class="bottom-box-lbl tc">Problem</div>
      </div>
    </section>

    <div class="keterangan-box mt-2" v-if="data.keterangan">
      Keterangan : {{ data.keterangan }}
    </div>

    <!-- ── Tanda tangan ── -->
    <footer class="spk-footer">
      <div class="sign-col">
        <p class="sign-step">Dibuat,</p>
        <div class="sign-space"></div>
        <p class="sign-role">Staff PPIC</p>
      </div>
      <div class="sign-col">
        <p class="sign-step">Diperiksa,</p>
        <div class="sign-space"></div>
        <p class="sign-role">Plt. Manager PPIC</p>
      </div>
      <div class="sign-col">
        <p class="sign-step">Disetujui,</p>
        <div class="sign-space"></div>
        <p class="sign-role">Plt. Manager Produksi</p>
      </div>
    </footer>
  </div>

  <div v-else-if="isLoading" class="pa-6 text-center text-muted">
    Menyiapkan Dokumen Cetak SPK...
  </div>

  <PrinterDialog v-model="showPrinterDialog" @saved="onPrinterSaved" />

  <PrintPreviewDialog
    v-model="showPreviewDialog"
    title="Preview Cetak SPK"
    :lines="previewLines"
    :is-loading="isPrinting"
    @print="onPrintFromPreview"
  />
</template>

<style scoped>
/* Mode Hitam Putih: paksa semua teks jadi hitam saat print */
.print-wrapper.print-mode-bw *:not(.print-toolbar):not(.print-toolbar *) {
  color: #000 !important;
  text-decoration: none;
}

/* Mode Berwarna: biarkan warna asli elemen (mis. teks biru/oranye dari
   data), cuma hilangkan underline link */
.print-wrapper.print-mode-color *:not(.print-toolbar):not(.print-toolbar *) {
  text-decoration: none;
}
.print-toolbar .text-white,
.print-toolbar .text-white * {
  color: #fff !important;
}

.print-wrapper {
  background: white;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  max-width: 900px;
  margin: 0 auto;
}

.print-toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

@media print {
  .no-print { display: none !important; }
}

.w-100 { width: 100%; }
.tc { text-align: center; }
.tr { text-align: right; }
.mt-2 { margin-top: 12px; }

/* ── Kop surat: kotak berbingkai + logo, seperti form kertas ── */
.spk-header {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}
.spk-header-box {
  width: 100%;
  border: 2px solid #000;
  padding: 8px;
  display: flex;
  align-items: center;
}
/* Logo polos tanpa lingkaran/border, cukup dibatasi tinggi maksimal
   supaya proporsional di dalam kop surat. */
.spk-logo {
  height: 48px;
  width: auto;
  max-width: 90px;
  object-fit: contain;
  flex-shrink: 0;
}
.spk-header-text {
  flex-grow: 1;
  text-align: center;
}
.spk-title {
  font-weight: bold;
  font-size: 14px;
  line-height: 1.2;
  text-transform: uppercase;
}
.spk-company {
  font-weight: bold;
  font-size: 13px;
  text-transform: uppercase;
}

/* ── Grid info 2 kolom ── */
.spk-top-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 6px;
}
.meta-tbl { border-collapse: collapse; font-size: 10.5pt; width: 100%; }
.meta-tbl td { padding: 2px 4px; vertical-align: top; }
.meta-lbl { width: 130px; font-weight: bold; white-space: nowrap; }
.meta-colon { width: 10px; }

/* ── Memo after status (revisi 2026-10-09) ──
   Catatan: tiga field di atas (No. PO / Shift / Tanggal PO) otomatis
   dari kolom SPK, bukan diisi tangan. Kalau kosong sudah tampil "-". */
.spk-memo-close {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 10.5pt;
  border: 1px solid #000;
  padding: 4px 6px;
  margin-bottom: 6px;
}
.smc-label {
  font-weight: bold;
  white-space: nowrap;
  width: 130px;
}
.smc-value {
  flex: 1;
}

.spk-extra-info {
  font-size: 10px;
  color: #444;
  border-top: 1px dashed #999;
  border-bottom: 1px dashed #999;
  padding: 3px 2px;
  margin-bottom: 4px;
}

/* ── Tabel form (Bahan Baku & Proses) — sama seperti tabel form kertas ── */
.form-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  table-layout: fixed;
}
.form-table th, .form-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: middle;
  overflow-wrap: break-word;
}
.form-table th {
  background-color: #f8fafc;
  font-weight: bold;
  text-align: center;
}
.form-table .blank-row td {
  height: 22px;
}
.lot-cell { height: 22px; }

/* ── Sisa Bahan / Problem ── */
.spk-bottom-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #000;
  border-left: 1px solid #000;
  border-right: 1px solid #000;
  font-size: 10px;
}
.bottom-box {
  border-bottom: 1px solid #000;
  padding: 6px;
  min-height: 90px;
}
.bottom-box-right {
  border-left: 1px solid #000;
}
.bottom-box-lbl {
  font-weight: 600;
  margin-bottom: 4px;
}

.keterangan-box { font-size: 10.5px; padding: 3px 0; }

/* ── Tanda tangan ── */
.spk-footer {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 28px;
  text-align: center;
  font-size: 10.5px;
}
.sign-step { margin-bottom: 44px; }
.sign-space { height: 0; }
.sign-role { font-weight: 600; }

@media print {
  body { background: white; margin: 0; }
  .print-toolbar { display: none !important; }
  /* Margin halaman HARUS 0. Chrome menaruh header/footer bawaan browser
     (tanggal + jam, judul dokumen "CETAK SPK - RETAIL", dan URL endpoint)
     di dalam kotak margin @page — kalau marginnya non-zero, semua itu
     ikut tercetak. Dengan margin 0 browser tidak punya tempat untuk
     menaruhnya, jadi header/footer hilang total dan tidak ada URL yang
     bocor ke kertas. Jarak tepi dipindah ke padding wrapper. */
  @page {
    size: A4 portrait;
    margin: 0;
  }
  .print-wrapper {
    padding: 12mm 14mm 18mm;
    max-width: 210mm;
    margin: 0;
  }
}
</style>