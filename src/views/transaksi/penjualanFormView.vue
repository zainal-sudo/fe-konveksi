<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useTabsStore } from "@/stores/tabsStore";
import SearchModal from "@/components/SearchModal.vue";
import { nextTick } from "vue"; // Pastikan sudah di-import
import {
  IconShoppingCart,
  IconSearch,
  IconPlus,
  IconTrash,
} from "@tabler/icons-vue";
import { penjualanFormApi, type PenjualanForm, type PenjualanDetail } from "@/api/transaksi/penjualanFormApi";
import { penjualanApi } from "@/api/transaksi/penjualanApi";
import { useQzPrint } from "@/composables/useQzPrint";
import PrinterDialog from "@/components/PrinterDialog.vue";
import PrintPreviewDialog from "@/components/PrintPreviewDialog.vue";
import { generatePreviewFaktur, generateEscPosFaktur } from "@/utils/fakturPrint";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const MENU_ID = "33";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);
const isSavingNew = ref(false);
const isSavingCetak = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const savedNomor = ref("");
const saveMode = ref<"normal" | "new" | "cetak">("normal");
const tabsStore = useTabsStore();
const today = new Date().toISOString().slice(0, 10);

// ── Simpan & Cetak (Dot Matrix / QZ Tray, langsung dari form) ─────────
// Setelah simpan, faktur ditampilkan di dialog preview lalu dikirim ke
// printer. FORM TIDAK DITUTUP dan tidak pindah halaman — form di-reset
// kosong supaya user langsung bisa menginput transaksi berikutnya.
const { connect, getSavedPrinter, printRaw } = useQzPrint();
const isPrinting = ref(false);
const showPrinterDialog = ref(false);
const showPreviewDialog = ref(false);
const previewLines = ref<string[]>([]);
const cachedPrintData = ref<any | null>(null);
const pendingPrintNomor = ref("");

const emptyForm = (): PenjualanForm => ({
  isEdit: false,
  nomor: "",
  tanggal: today,
  cusKode: "",
  cusNama: "",
  cusAlamat: "",
  cusTelp: "",
  memo: "",
  isTax: 0,
  discFakturPr: 0,
  discFaktur: 0,
  amount: 0,
  taxAmount: 0,
  ongkir: 0,
  bayar: 0, // cash/tunai diterima
  kembali: 0,
  dp: 0,
  voucher: 0,
  noVoucher: "",
  card: 0,
  noCard: "",
  bankCard: "",
  piutang: 0,
  dateline: today,
  cusTop: 0,
  pemesan: "",
  detail: [],
});

const form = ref<PenjualanForm>(emptyForm());

const customerOptions = ref<any[]>([]);
const barangOptions = ref<any[]>([]);
const customerLoading = ref(false);
const barangLoading = ref(false);

const showCustomerModal = ref(false);
const showBarangModal = ref(false);
const activeDetailIndex = ref<number>(-1);

// ── Subtotal per baris (setelah disc % per item) & Subtotal Bruto ─────
const rowSubtotal = (d: PenjualanDetail) => {
  const qty = Number(d.qty) || 0;
  const harga = Number(d.harga) || 0;
  const discPr = Number(d.discPr) || 0;
  const total = qty * harga;
  const nilaiDisc = (total * discPr) / 100;
  return total - nilaiDisc;
};

const subtotalBruto = computed(() => {
  return form.value.detail.reduce((sum, d) => sum + rowSubtotal(d), 0);
});

// ── Total Qty & Total Item (kotak info di bawah grid) ────
const totalQty = computed(() => {
  return form.value.detail.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
});
const totalBaris = computed(() => form.value.detail.length);

// ── Diskon Faktur: % dan Rp DIJUMLAHKAN ──────
const totalDiskonFaktur = computed(() => {
  const bruto = subtotalBruto.value;
  const dariPersen = Math.round((bruto * (form.value.discFakturPr || 0)) / 100);
  const dariNominal = Number(form.value.discFaktur) || 0;
  return dariPersen + dariNominal;
});

const calcTotal = () => {
  const bruto = subtotalBruto.value;
  const totalDiskon = totalDiskonFaktur.value;
  const setelahDiskonFaktur = bruto - totalDiskon;

  if (form.value.isTax > 0) {
    if (form.value.isTax === 2) {
      // Exclude Pajak
      form.value.taxAmount = Math.round((setelahDiskonFaktur * 11) / 100);
      form.value.amount = setelahDiskonFaktur + form.value.taxAmount;
    } else {
      // Include Pajak
      form.value.taxAmount = Math.round((setelahDiskonFaktur * 11) / 111);
      form.value.amount = setelahDiskonFaktur;
    }
  } else {
    form.value.taxAmount = 0;
    form.value.amount = setelahDiskonFaktur;
  }
};

const loadSearchOptions = async () => {
  customerLoading.value = true;
  barangLoading.value = true;
  try {
    const [resCustomer, resBarang] = await Promise.all([
      penjualanFormApi.getCustomer(""),
      penjualanFormApi.getBarang(""),
    ]);
    customerOptions.value = resCustomer || [];
    barangOptions.value = resBarang || [];
  } catch (e) {
    console.error("Gagal memuat opsi pencarian:", e);
  } finally {
    customerLoading.value = false;
    barangLoading.value = false;
  }
};

const searchCustomer = async (query: string) => {
  customerLoading.value = true;
  try {
    customerOptions.value = await penjualanFormApi.getCustomer(query || "");
  } catch {
    /* silent */
  } finally {
    customerLoading.value = false;
  }
};

const searchBarang = async (query: string) => {
  barangLoading.value = true;
  try {
    barangOptions.value = await penjualanFormApi.getBarang(query || "");
  } catch {
    /* silent */
  } finally {
    barangLoading.value = false;
  }
};

// ── Pembayaran multi-jenis (pola kasir minimarket) ───────────────────
// Total tagihan = amount (hasil calcTotal, termasuk PPN bila ada) + ongkir.
// Jalur: cash (form.bayar) + voucher + card + piutang.
// Kembalian live = total semua jalur - total tagihan (dibatasi >= 0).
// Kas masuk laci (dp) = cash - kembalian, min 0.
const grandTotal = computed(() => (form.value.amount || 0) + (Number(form.value.ongkir) || 0));
const totalBayarJalan = computed(() => {
  return (
    (Number(form.value.bayar) || 0) +
    (Number(form.value.voucher) || 0) +
    (Number(form.value.card) || 0) +
    (Number(form.value.piutang) || 0)
  );
});
const uangKembalian = computed(() => {
  const k = totalBayarJalan.value - grandTotal.value;
  return k > 0 ? k : 0;
});
const kasNeto = computed(() => Math.max(0, (Number(form.value.bayar) || 0) - uangKembalian.value));

// ── Thousand separator untuk input pembayaran (cash/voucher/card/piutang) ──
const PAY_KEYS = ["bayar", "voucher", "card", "piutang"] as const;
type PayKey = (typeof PAY_KEYS)[number];

const payDisplays = ref<Record<PayKey, string>>({
  bayar: "",
  voucher: "",
  card: "",
  piutang: "",
});

const fmtNum = (v: number) => {
  const n = Number(v) || 0;
  return n ? new Intl.NumberFormat("id-ID").format(n) : "";
};

const onPayInput = (key: PayKey, e: Event) => {
  const raw = ((e.target as HTMLInputElement).value || "").replace(/[^0-9]/g, "");
  const num = Number(raw || 0);
  form.value[key] = num;
  payDisplays.value[key] = fmtNum(num);
};

// Sinkronkan tampilan saat data form dimuat (mode edit) atau direset
watch(
  () => [form.value.bayar, form.value.voucher, form.value.card, form.value.piutang],
  () => {
    for (const k of PAY_KEYS) {
      payDisplays.value[k] = fmtNum(Number(form.value[k]) || 0);
    }
  }
);

const recalcDateline = () => {
  const top = Number(form.value.cusTop) || 0;
  if (!top || !form.value.tanggal) return;
  const base = new Date(form.value.tanggal);
  if (isNaN(base.getTime())) return;
  base.setDate(base.getDate() + top);
  form.value.dateline = base.toISOString().slice(0, 10);
};

const selectCustomer = (cus: any) => {
  if (!cus) return;
  form.value.cusKode = cus.kode || cus.Kode || cus.cusKode || "";
  form.value.cusNama = cus.nama || cus.Nama || cus.cusNama || "";
  form.value.cusAlamat = cus.alamat || cus.Alamat || "";
  form.value.cusTelp = cus.telp || cus.Telp || "";
  form.value.cusTop = Number(cus.top ?? cus.Top ?? 0);
  showCustomerModal.value = false;
  recalcDateline();
};

const onTanggalChange = () => {
  recalcDateline();
};

const openSearchBarang = (index: number) => {
  activeDetailIndex.value = index;
  showBarangModal.value = true;
};

const openAddBarang = () => {
  const last = form.value.detail[form.value.detail.length - 1];
  if (last && !last.brgNama) {
    activeDetailIndex.value = form.value.detail.length - 1;
    showBarangModal.value = true;
    return;
  }

  form.value.detail.push({
    no: form.value.detail.length + 1,
    brgKode: 0,
    brgNama: "",
    barcode: "",
    satuan: "",
    qty: 1,
    harga: 0,
    discPr: 0,
    keterangan: "",
    isiCrt: 1,
    isiLsn: 1,
  });

  activeDetailIndex.value = form.value.detail.length - 1;
  showBarangModal.value = true;
};

const selectBarang = (brg: any) => {
  if (!brg || activeDetailIndex.value < 0) return;
  const idx = activeDetailIndex.value;
  const d = form.value.detail[idx];
  if (d) {
    d.brgKode = brg.kode || brg.Kode || brg.brgKode || "";
    d.brgNama = brg.nama || brg.Nama || brg.brgNama || "";
    d.barcode = brg.barcode || brg.Barcode || "";
    d.satuan = brg.satuan || brg.Satuan || "";
    // Harga jual dari master barang; kosong(0) → fallback harga beli master
    const hrgJual = Number(brg.hrgJual ?? brg.HrgJual ?? 0);
    const hrgBeli = Number(brg.hrgBeli ?? brg.HrgBeli ?? 0);
    d.harga = hrgJual > 0 ? hrgJual : hrgBeli;
    if (d.harga <= 0) {
      toast.info(`Master barang ${d.brgNama ?? d.brgKode} belum punya harga jual. Isi harga manual.`);
    }
    d.discPr = 0;
    d.isiCrt = brg.isiCrt || 1;
    d.isiLsn = brg.isiLsn || 1;
  }
  showBarangModal.value = false;
  activeDetailIndex.value = -1;
  calcTotal();
};

const onBarangModalClose = () => {
  const idx = activeDetailIndex.value;
  if (idx >= 0) {
    const d = form.value.detail[idx];
    if (d && !d.brgNama) {
      form.value.detail.splice(idx, 1);
      form.value.detail.forEach((row, i) => (row.no = i + 1));
    }
  }
  activeDetailIndex.value = -1;
};

watch(showBarangModal, (val) => {
  if (val) searchBarang("");
  else onBarangModalClose();
});

// Modal customer selalu muat ulang daftar saat dibuka supaya customer baru langsung muncul
watch(showCustomerModal, (val) => {
  if (val) searchCustomer("");
});

const removeRow = (index: number) => {
  form.value.detail.splice(index, 1);
  form.value.detail.forEach((d, i) => (d.no = i + 1));
  calcTotal();
};

const loadData = async () => {
  const nomor = route.params.nomor as string;
  if (!nomor) {
    // mode create: selalu mulai dari form kosong (jaga agar tidak ada sisa isian lama)
    form.value = emptyForm();
    return;
  }

  // mode edit: mulai dari form kosong dulu supaya tidak ada sisa isian lama
  form.value = emptyForm();
  isLoading.value = true;
  try {
    form.value.isEdit = true;
    const res = await penjualanFormApi.getDetailForm(decodeURIComponent(nomor));
    Object.assign(form.value, res);
    calcTotal();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengambil data penjualan.");
    router.push({ name: "penjualanBrowse" });
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  form.value = emptyForm();
  router.replace({ name: "penjualanCreate" }).catch(() => {});
};

  const validateSave = (): boolean => {
  if (!form.value.cusKode) {
    toast.warning("Customer harus dipilih.");
    return false;
  }
  if (form.value.detail.length === 0) {
    toast.warning("Detail barang tidak boleh kosong.");
    return false;
  }
  for (const d of form.value.detail) {
    if (!d.brgNama) {
      toast.warning("Ada item barang yang belum dipilih.");
      return false;
    }
    if ((d.qty || 0) <= 0) {
      toast.warning(`Qty untuk ${d.brgNama} harus lebih dari 0.`);
      return false;
    }
  }
  calcTotal();
  if (totalBayarJalan.value < grandTotal.value) {
    toast.warning(
      `Total pembayaran (${fmtCurrency(totalBayarJalan.value)}) kurang dari total tagihan (${fmtCurrency(grandTotal.value)}).`,
    );
    return false;
  }
  if ((Number(form.value.piutang) || 0) > 0) {
    const nama = (form.value.cusNama || "").toLowerCase();
    if (form.value.cusKode === "PU" || nama.includes("umum")) {
      toast.warning("Penjualan PIUTANG tidak boleh untuk customer UMUM. Pilih customer terlebih dahulu.");
      return false;
    }
  }
  return true;
};

const onValidateSave = () => {
  if (!validateSave()) return;
  saveMode.value = "normal";
  showSaveDialog.value = true;
};

const onValidateSaveAndNew = () => {
  if (!validateSave()) return;
  saveMode.value = "new";
  showSaveDialog.value = true;
};

const onValidateSaveAndCetak = () => {
  if (!validateSave()) return;
  saveMode.value = "cetak";
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  if (isSaving.value || isSavingNew.value || isSavingCetak.value) return;
  const isNewMode = saveMode.value === "new";
  const isCetakMode = saveMode.value === "cetak";
  isCetakMode ? (isSavingCetak.value = true)
    : isNewMode ? (isSavingNew.value = true) : (isSaving.value = true);

  try {
    form.value.kembali = uangKembalian.value;
    form.value.dp = kasNeto.value;
    const res = await penjualanFormApi.save(form.value);
    savedNomor.value = res?.nomor || res?.data?.nomor || form.value.nomor;
    showSaveDialog.value = false;

    if (isCetakMode) {
      // Reset form DI TEMPAT (tanpa pindah halaman / menutup tab) supaya
      // user langsung bisa input transaksi berikutnya di belakang dialog
      // preview cetak.
      resetForm();
      toast.success(`Penjualan ${savedNomor.value} tersimpan. Menyiapkan faktur cetak...`);
      await preparePrintAfterSave(savedNomor.value);
    } else if (isNewMode) {
      resetForm();
      toast.info(`Penjualan ${savedNomor.value} tersimpan. Form siap untuk entri baru.`);
    } else {
      // Langsung kembali ke browse dan tutup tab form
      const targetPath = route.path;
      router.push({ name: "penjualanBrowse" });
       await nextTick();
    tabsStore.closeTab(targetPath);

    }

  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan penjualan.");
  } finally {
    isSaving.value = false;
    isSavingNew.value = false;
    isSavingCetak.value = false;
  }
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  // reset + tutup tab supaya saat dibuka lagi selalu mount fresh
  // (tab keep-alive dengan form kosong bisa terjadi input ulang => nota ganda)
  form.value = emptyForm();
  const targetPath = route.path;
  router.push({ name: "penjualanBrowse" });
  nextTick().then(() => tabsStore.closeTab(targetPath));
};

// ── Alur cetak faktur setelah simpan (Simpan & Cetak) ─────────────────
const preparePrintAfterSave = async (nomor: string) => {
  pendingPrintNomor.value = nomor;
  const savedPrinter = getSavedPrinter();
  if (!savedPrinter) {
    showPrinterDialog.value = true;
    return;
  }
  try {
    const data = await penjualanApi.getPrintData(nomor);
    cachedPrintData.value = data;
    previewLines.value = generatePreviewFaktur(data);
    showPreviewDialog.value = true;
  } catch (e: any) {
    toast.error(e.message || "Data tersimpan, namun gagal menyiapkan faktur cetak.");
  }
};

const onPrinterSaved = async () => {
  showPrinterDialog.value = false;
  if (!pendingPrintNomor.value) return;
  try {
    const data = await penjualanApi.getPrintData(pendingPrintNomor.value);
    cachedPrintData.value = data;
    previewLines.value = generatePreviewFaktur(data);
    showPreviewDialog.value = true;
  } catch (e: any) {
    toast.error(e.message || "Gagal menyiapkan faktur cetak.");
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
    toast.success(`Faktur ${pendingPrintNomor.value} dikirim ke printer. Silakan lanjut input berikutnya.`);
  } catch (e: any) {
    toast.error(e.message || "Gagal mencetak ke printer.");
  } finally {
    isPrinting.value = false;
    cachedPrintData.value = null;
  }
};

const confirmClose = async () => {
  showCloseDialog.value = false;
  // reset form supaya saat form dibuka lagi bersih (mode create)
  form.value = emptyForm();
  const targetPath = route.path; // ✅ Ambil path halaman form aktif saat ini
  router.push({ name: "penjualanBrowse" }); // Pindah ke halaman list/browse
  await nextTick();

  tabsStore.closeTab(targetPath); // ✅ Tutup tab berdasarkan path form tersebut
};

onMounted(() => {
  loadData();
  loadSearchOptions();
});

// Tab keep-alive: saat tab form yang sama dibuka lagi (nomor beda / dari browse),
// muat ulang data supaya form tidak memakai state lama (penyebab nota ganda).
watch(
  () => route.params.nomor,
  () => loadData()
);
watch(
  () => route.path,
  (nv, ov) => {
    if (nv !== ov) loadData();
  }
);

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtNumber = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Penjualan (SO)' : 'Tambah Penjualan Baru'"
    :icon="IconShoppingCart"
    :menu-id="MENU_ID"
    :is-loading="isLoading"
    :is-saving="isSaving || isSavingNew || isSavingCetak"
    :is-edit-mode="isEdit"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="confirmSave"
    @confirm-cancel="confirmCancel"
    @confirm-close="confirmClose"
  >
    <template #extra-actions>
      <v-btn
        v-if="!isEdit"
        size="small"
        variant="outlined"
        color="primary"
        :loading="isSavingNew"
        @click="onValidateSaveAndNew"
      >
        Simpan &amp; Baru
      </v-btn>
      <v-btn
        v-if="!isEdit"
        size="small"
        variant="flat"
        color="green-darken-3"
        :loading="isSavingCetak"
        @click="onValidateSaveAndCetak"
      >
        <IconPrinter :size="14" class="mr-1" /> Simpan &amp; Cetak
      </v-btn>
    </template>

    <div class="form-header-grid">
      <div class="header-fields">
        <div class="grid-fields-container">
          <div class="f-row">
            <label class="f-lbl">No. SO</label>
            <input type="text" v-model="form.nomor" class="f-inp-native readonly-bg" placeholder="[ OTOMATIS ]" readonly />
          </div>

          <div class="f-row">
            <label class="f-lbl">Customer</label>
            <div class="search-group" @click="showCustomerModal = true">
              <input type="text" :value="form.cusKode" class="f-inp-native w-30 readonly-bg" readonly placeholder="Kode" />
              <button class="btn-search" type="button" :disabled="isEdit" @click.stop="showCustomerModal = true">
                <IconSearch :size="14" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal SO</label>
            <input type="date" v-model="form.tanggal" class="f-inp-native" :disabled="isEdit" @change="onTanggalChange" />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nama Cust.</label>
            <input type="text" :value="form.cusNama" class="f-inp-native readonly-bg" readonly placeholder="Pilih Customer..." />
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal Jt. Tempo</label>
            <input type="date" v-model="form.dateline" class="f-inp-native" />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nama Pemesan</label>
            <input type="text" v-model="form.pemesan" class="f-inp-native" placeholder="Masukkan nama pemesan..." />
          </div>

          <div class="f-row">
            <label class="f-lbl">Opsi Pajak</label>
            <select v-model.number="form.isTax" class="f-inp-native select-native" @change="calcTotal">
              <option :value="0">Tanpa Pajak</option>
              <option :value="2">Pajak (PPN)</option>
            </select>
          </div>

          <div class="f-row">
            <label class="f-lbl">Ongkir</label>
            <input type="number" v-model.number="form.ongkir" min="0" class="f-inp-native tr" placeholder="0" />
          </div>
        </div>

        <div class="detail-section mt-1" style="width: 100%;">
        <div class="d-flex align-center justify-between mb-2">
          <div class="section-title">Detail Item Barang / Jasa</div>
          <v-btn size="x-small" color="green-darken-3" class="font-weight-bold text-white" @click="openAddBarang">
            <IconPlus :size="12" class="mr-1" /> Tambah Barang
          </v-btn>
        </div>

        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th class="tc" style="width: 40px;">NO</th>
                <th style="width: 130px;">BARCODE / KODE</th>
                <th style="min-width: 180px;">NAMA ITEM BARANG</th>
                <th style="width: 80px;" class="tc">SATUAN</th>
                <th style="width: 70px;" class="tr">QTY</th>
                <th style="width: 120px;" class="tr">HARGA JUAL</th>
                <th style="width: 70px;" class="tr">DISC (%)</th>
                <th style="width: 130px;" class="tr">SUBTOTAL</th>
                <th class="tc" style="width: 50px;">AKSI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in form.detail" :key="idx">
                <td class="tc font-weight-bold color-grey">{{ idx + 1 }}</td>
                <td>
                  <div class="cell-search-group" @click="openSearchBarang(idx)">
                    <input type="text" :value="row.brgKode || row.barcode" class="cell-inp readonly-bg" readonly placeholder="Klik cari..." />
                    <button class="cell-btn-search" type="button" @click.stop="openSearchBarang(idx)">
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td>
                  <input type="text" v-model="row.brgNama" class="cell-inp font-weight-bold text-grey-darken-4" placeholder="Nama/Deskripsi Item..." />
                </td>
                <td>
                  <input type="text" v-model="row.satuan" class="cell-inp tc readonly-bg" readonly placeholder="Pcs/Box" />
                </td>
                <td>
                  <input type="number" v-model.number="row.qty" class="cell-inp tr text-blue font-weight-bold" @input="calcTotal" min="1" />
                </td>
                <td>
                  <div class="cell-currency-wrap">
                    <span class="cell-currency-prefix">Rp</span>
                    <input type="number" v-model.number="row.harga" class="cell-inp cell-inp-currency tr text-green-darken-4 font-weight-bold" @input="calcTotal" placeholder="0" />
                  </div>
                </td>
                <td>
                  <input type="number" v-model.number="row.discPr" class="cell-inp tr text-red font-weight-bold" @input="calcTotal" min="0" max="100" />
                </td>
                <td class="tr pr-2 font-weight-bold" :class="rowSubtotal(row) < 0 ? 'val-red' : 'val-green'">
                  Rp {{ fmtCurrency(rowSubtotal(row)) }}
                </td>
                <td class="tc">
                  <button class="cell-btn-delete" type="button" @click="removeRow(idx)">
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="form.detail.length === 0">
                <td colspan="9" class="tc pa-4 text-grey style-italic">Belum ada item barang. Silakan klik tombol "Tambah Barang".</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid-total-bar" v-if="form.detail.length > 0">
          <span>Total Item: <strong>{{ totalBaris }}</strong></span>
          <span class="divider">|</span>
          <span>Total Qty: <strong>{{ fmtNumber(totalQty) }}</strong></span>
          <span class="divider">|</span>
          <span>Total Subtotal Bruto: <strong :class="subtotalBruto < 0 ? 'val-red' : 'val-green'">Rp {{ fmtCurrency(subtotalBruto) }}</strong></span>
        </div>
      </div>
      </div>

      <div class="header-summary">
        <div class="summary-box">
          <div class="summary-lbl">GRAND TOTAL SO</div>
          <div class="summary-val" :class="form.amount < 0 ? 'val-red-dark-bg' : 'val-green-dark-bg'">
            Rp {{ fmtCurrency(form.amount) }}
          </div>
        </div>
        <div class="summary-sub-rows">
          <div class="sub-total-item">
            <span>Subtotal Bruto :</span>
            <span class="font-weight-bold" :class="subtotalBruto < 0 ? 'val-red' : 'val-green'">
              Rp {{ fmtCurrency(subtotalBruto) }}
            </span>
          </div>

          <div class="sub-total-item disc-row">
            <span>Diskon Faktur :</span>
            <div class="disc-inputs">
              <input
                type="number"
                v-model.number="form.discFakturPr"
                class="f-inp-native disc-pr-inp"
                min="0"
                max="100"
                @input="calcTotal"
              />
              <span class="disc-unit">%</span>
              <span class="disc-plus">+</span>
              <span class="disc-unit">Rp</span>
              <input
                type="number"
                v-model.number="form.discFaktur"
                class="f-inp-native disc-nom-inp"
                min="0"
                @input="calcTotal"
              />
            </div>
          </div>
          <div class="sub-total-item">
            <span>= Total Diskon :</span>
            <span class="font-weight-bold text-red">- Rp {{ fmtCurrency(totalDiskonFaktur) }}</span>
          </div>

          <div class="sub-total-item" v-if="form.isTax > 0">
            <span>Nilai PPN Pajak :</span>
            <span class="font-weight-bold text-orange-darken-4">Rp {{ fmtCurrency(form.taxAmount) }}</span>
          </div>

          <div class="sub-total-item">
            <span>Ongkir :</span>
            <span class="font-weight-bold">Rp {{ fmtCurrency(Number(form.ongkir) || 0) }}</span>
          </div>

          <div class="sub-total-item pay-row">
            <span>GRAND TOTAL :</span>
            <span class="font-weight-bold" style="color:#3B5998;">Rp {{ fmtCurrency(grandTotal) }}</span>
          </div>
        </div>

        <!-- Panel pembayaran multi-jenis (pola kasir minimarket) -->
        <div class="pay-panel">
          <div class="pay-title">PEMBAYARAN</div>

          <div class="pay-field">
            <label class="cash-lbl">1. CASH / TUNAI</label>
            <div class="pay-input-wrap wrap-cash">
              <span class="pay-prefix">Rp</span>
              <input type="text" inputmode="numeric" :value="payDisplays.bayar" @input="onPayInput('bayar', $event)" class="pay-input" placeholder="0" />
            </div>
          </div>

          <div class="pay-field">
            <label class="voucher-lbl">2. VOUCHER</label>
            <div class="pay-extra">
              <div class="pay-input-wrap wrap-voucher">
                <span class="pay-prefix">Rp</span>
                <input type="text" inputmode="numeric" :value="payDisplays.voucher" @input="onPayInput('voucher', $event)" class="pay-input pay-inp-sm" placeholder="0" />
              </div>
              <input type="text" v-model="form.noVoucher" class="pay-text-inp" placeholder="No. Voucher" />
            </div>
          </div>

          <div class="pay-field">
            <label class="card-lbl">3. CARD / DEBIT / KREDIT</label>
            <div class="pay-extra">
              <div class="pay-input-wrap wrap-card">
                <span class="pay-prefix">Rp</span>
                <input type="text" inputmode="numeric" :value="payDisplays.card" @input="onPayInput('card', $event)" class="pay-input pay-inp-sm" placeholder="0" />
              </div>
              <div class="pay-extra-cols">
                <input type="text" v-model="form.noCard" class="pay-text-inp" placeholder="No. Kartu" />
                <input type="text" v-model="form.bankCard" class="pay-text-inp" placeholder="Nama Bank" />
              </div>
            </div>
          </div>

          <div class="pay-field">
            <label class="piutang-lbl">4. PIUTANG / BON</label>
            <div class="pay-input-wrap wrap-piutang">
              <span class="pay-prefix">Rp</span>
              <input type="text" inputmode="numeric" :value="payDisplays.piutang" @input="onPayInput('piutang', $event)" class="pay-input" placeholder="0" />
            </div>
          </div>

          <div class="pay-change-row" :class="{ 'pay-short': totalBayarJalan < grandTotal }">
            <span class="pay-change-lbl">KEMBALIAN</span>
            <span class="pay-change-val">Rp {{ fmtCurrency(uangKembalian) }}</span>
          </div>
        </div>
      </div>
    </div>


    <v-dialog v-model="showSaveDialog" max-width="320">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-green-darken-4 text-white">Konfirmasi</v-card-title>
        <v-card-text class="pa-4 text-body-2">
          {{ saveMode === "new"
            ? "Simpan penjualan ini dan langsung buka form baru untuk entri berikutnya?"
            : "Apakah Anda yakin ingin menyimpan transaksi penjualan ini?" }}
        </v-card-text>
        <v-card-actions class="pa-2 bg-grey-lighten-4 justify-end">
          <v-btn size="small" variant="outlined" @click="showSaveDialog = false">Batal</v-btn>
          <v-btn size="small" color="success" variant="flat" class="px-4" :loading="isSaving || isSavingNew" @click="confirmSave">
            Ya, Simpan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCancelDialog" max-width="320">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-red-darken-4 text-white">Batalkan</v-card-title>
        <v-card-text class="pa-4 text-body-2">Keluar dari halaman ini? Perubahan yang belum disimpan akan hilang.</v-card-text>
        <v-card-actions class="pa-2 bg-grey-lighten-4 justify-end">
          <v-btn size="small" variant="outlined" @click="showCancelDialog = false">Kembali</v-btn>
          <v-btn size="small" color="error" variant="flat" @click="router.push({ name: 'penjualanBrowse' })">Ya, Keluar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SearchModal
      v-model="showCustomerModal"
      title="Pilih Customer"
      :columns="[
        { key: 'kode', title: 'KODE', width: '100px' },
        { key: 'nama', title: 'NAMA CUSTOMER' },
      ]"
      :items="customerOptions"
      :loading="customerLoading"
      :server-search="true"
      search-placeholder="Cari kode atau nama customer..."
      :search-keys="['kode', 'nama']"
      @select="selectCustomer"
      @search="searchCustomer"
    />

    <SearchModal
      v-model="showBarangModal"
      title="Pilih Item Barang"
      :columns="[
        { key: 'kode', title: 'KODE BARANG', width: '120px' },
        { key: 'nama', title: 'NAMA ITEM BARANG' },
        { key: 'satuan', title: 'SATUAN', width: '80px', align: 'center' },
      ]"
      :items="barangOptions"
      :loading="barangLoading"
      :server-search="true"
      search-placeholder="Cari kode atau nama barang..."
      :search-keys="['kode', 'nama']"
      @select="selectBarang"
      @search="searchBarang"
    />

    <!-- ── Printer Dialog (Simpan & Cetak) ── -->
    <PrinterDialog
      v-model="showPrinterDialog"
      @saved="onPrinterSaved"
    />

    <!-- ── Print Preview Dialog (Simpan & Cetak) ──
         Ditampilkan DI ATAS form yang sudah di-reset — form tidak
         ditutup supaya user bisa langsung menginput transaksi berikutnya
         begitu dialog ini ditutup. -->
    <PrintPreviewDialog
      v-model="showPreviewDialog"
      title="Preview Faktur Penjualan"
      :lines="previewLines"
      :is-loading="isPrinting"
      @print="onPrintFromPreview"
    />
  </BaseForm>
</template>

<style scoped>
.form-header-grid {
  display: grid;
  /* minmax(0,1fr): kolom kiri boleh menyusut di bawah min-content
     detail-item supaya panel PEMBAYARAN di kanan tidak terdorong
     keluar layar (kepotong) pada zoom 100%. */
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 960px) {
  .form-header-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.header-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grid-fields-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

@media (max-width: 600px) {
  .grid-fields-container {
    grid-template-columns: 1fr;
  }
}

.f-row {
  display: flex;
  align-items: center;
}
.f-lbl {
  width: 110px;
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  flex-shrink: 0;
}
.f-inp-native,
.f-txa-native {
  flex: 1;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
}
.select-native {
  background-color: white;
  cursor: pointer;
}
.f-txa-native {
  height: auto;
  padding: 4px 8px;
}
.f-inp-native:focus,
.f-txa-native:focus {
  border-color: #3B5998;
}
.readonly-bg {
  background-color: #f3f4f6;
  color: #6b7280;
}

.search-group {
  display: flex;
  flex: 1;
  gap: 4px;
  cursor: pointer;
}
.btn-search {
  height: 28px;
  width: 32px;
  background: #3B5998;
  color: white;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.w-30 {
  width: 30%;
  flex: none !important;
}
.w-70 {
  width: 70%;
}

.header-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
}
.summary-box {
  background: #3B5998;
  color: white;
  padding: 10px;
  border-radius: 4px;
  text-align: right;
}
.summary-lbl {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.85;
}
.summary-val {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.summary-sub-rows {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}
.sub-total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #4b5563;
  border-bottom: 1px dashed #e5e7eb;
  padding-bottom: 2px;
}

.disc-row {
  align-items: center;
}
.disc-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.disc-pr-inp {
  width: 42px;
  height: 22px;
  padding: 0 2px;
  text-align: center;
}
.disc-nom-inp {
  width: 80px;
  height: 22px;
  padding: 0 4px;
  text-align: right;
  font-weight: 700;
}
.disc-unit {
  font-size: 10px;
  color: #9ca3af;
}
.disc-plus {
  font-size: 10px;
  color: #d1d5db;
}
.text-red {
  color: #ef4444;
}

.pay-row { border-top: 1px solid #e5e7eb; padding-top: 5px; }
.pay-panel { margin-top: 8px; border: 1px solid #bfd3ee; border-radius: 6px; padding: 8px; background: #eef2ff; }
.pay-title { font-size: 10px; font-weight: 800; color: #3B5998; letter-spacing: .5px; margin-bottom: 6px; }
.pay-field { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
.pay-field > label { font-size: 10.5px; font-weight: 700; }
.cash-lbl { color: #15803d; }
.voucher-lbl { color: #1d4ed8; }
.card-lbl { color: #7e22ce; }
.piutang-lbl { color: #dc2626; }
.pay-extra { display: flex; flex-direction: column; gap: 4px; }
.pay-extra-cols { display: flex; gap: 4px; }
.pay-text-inp { flex: 1; min-width: 0; height: 34px; border: 1px solid #d1d5db; border-radius: 4px; padding: 0 6px; font-size: 11.5px; outline: none; }
.pay-text-inp:focus { border-color: #3B5998; }
.pay-inp-sm { font-size: 13px; font-weight: 700; }
.wrap-cash .pay-input { background: #f0fdf4; color: #15803d; }
.wrap-voucher .pay-input { background: #eff6ff; color: #1d4ed8; }
.wrap-card .pay-input { background: #faf5ff; color: #7e22ce; }
.wrap-piutang .pay-input { background: #fef2f2; color: #dc2626; }
.wrap-cash { border-color: #9ae6b4; }
.wrap-voucher { border-color: #93c5fd; }
.wrap-card { border-color: #d8b4fe; }
.wrap-piutang { border-color: #fca5a5; }
.pay-input-wrap { display: flex; align-items: center; flex: 1; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; height: 34px; overflow: hidden; }
.pay-input-wrap:focus-within { border-color: #3B5998; }
.pay-prefix { padding: 0 8px; font-size: 11px; font-weight: 700; color: #6b7280; background: #f3f4f6; height: 100%; display: flex; align-items: center; border-right: 1px solid #d1d5db; }
.pay-input { flex: 1; min-width: 0; height: 100%; border: none; outline: none; padding: 0 8px; font-size: 13px; font-weight: 700; text-align: right; }
.pay-change-row { display: flex; justify-content: space-between; align-items: center; margin-top: 7px; padding: 6px 8px; background: #14532d; color: #bbf7d0; border-radius: 4px; }
.pay-short { background: #7f1d1d; color: #fecaca; } /* uang diterima kurang dari total */
.pay-change-lbl { font-size: 10px; font-weight: 700; letter-spacing: .5px; }
.pay-change-val { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #3B5998;
  text-transform: uppercase;
}
.detail-table-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 4px 4px 0 0;
  overflow-x: auto;
}
.detail-table {
  width: 100%;
  /* 9 kolom setelah KETERANGAN dihapus — lebih kecil supaya detail item
     tidak memaksa lebar halaman melebihi layar. */
  min-width: 860px;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table thead tr {
  background: #3B5998;
}
.detail-table th {
  color: white;
  font-weight: 700;
  padding: 6px;
  white-space: nowrap;
}
.detail-table td {
  padding: 3px 4px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.detail-table tbody tr:hover td {
  background: rgba(46, 46, 125, 0.03);
}

.cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
}
.cell-inp:focus {
  border-color: #3B5998;
}

.cell-search-group {
  display: flex;
  gap: 2px;
  cursor: pointer;
}
.cell-btn-search {
  height: 24px;
  width: 24px;
  background: #3B5998;
  color: white;
  border: none;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-btn-delete {
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.grid-total-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f3f4f6;
  border: 1px solid #e0e0e0;
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 6px 12px;
  font-size: 11px;
  color: #4b5563;
}
.grid-total-bar strong {
  color: #1f2937;
}
.grid-total-bar .divider {
  color: #d1d5db;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.val-green { color: #15803d; }
.val-red { color: #dc2626; }

.val-green-dark-bg { color: #86efac; }
.val-red-dark-bg { color: #fca5a5; }

.cell-currency-wrap {
  display: flex;
  align-items: center;
  height: 24px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  overflow: hidden;
  background: white;
}
.cell-currency-wrap:focus-within {
  border-color: #3B5998;
}
.cell-currency-prefix {
  flex-shrink: 0;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  background: #f3f4f6;
  height: 100%;
  display: flex;
  align-items: center;
  border-right: 1px solid #d1d5db;
}
.cell-inp-currency {
  border: none !important;
  height: 100%;
}
</style>
