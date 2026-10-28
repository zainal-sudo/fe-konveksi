<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import NumberInput from "@/components/NumberInput.vue";
import { IconClipboardList, IconSearch, IconBox, IconRefresh } from "@tabler/icons-vue";
import { spkFormApi, type SpkForm } from "@/api/transaksi/spkFormApi";
import { spkDetailApi, type SpkKategoriProses, type SpkMasterProsesDetail } from "@/api/transaksi/spkDetailApi";
import { useTabsStore } from "@/stores/tabsStore";
import { useFormSession } from "@/composables/useFormSession";
import { useBrowseNavigation } from "@/composables/useBrowseNavigation";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();
const { saveFormData, loadFormData, clearFormData } = useFormSession<SpkForm>("spk");
const { goBrowseCloseCurrent } = useBrowseNavigation();

const MENU_ID = "84";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);
const isSavingNew = ref(false);
const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const saveMode = ref<"normal" | "new">("normal");
// ⬅️ BARU: begitu true, watcher `form` berhenti menulis draft ke
// sessionStorage sama sekali. Dipasang tepat setelah save sukses supaya
// event/re-render sisa (dialog tertutup, blur input, dll.) tidak balik
// menulis draft lama ke storage setelah clearFormData() membersihkannya.
const suppressDraftSave = ref(false);

// Nomor otomatis diisi LANGSUNG ke field Nomor (pola sama spt CR).
const muatNomorOtomatis = async () => {
  if (isEdit.value) return;
  try {
    const init = await spkFormApi.getInitData(form.value.tanggal);
    form.value.nomor = (init && init.nomorOtomatis) || "";
  } catch {
    // biarkan field apa adanya — nomor final di-generate backend saat simpan
  }
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm = (): SpkForm => ({
    isEdit: false,
    nomor: "",
    nama: "",
    brgKode: "",
    brgNama: "",
    satuan: "",
    prsKode: "",
    prsNama: "",
    custKode: "",
    custNama: "",
    tanggal: today,
    // Revisi 2026-10-13: DateLine jadi OPSIONAL (dulu default hari ini dan
    // dipaksa isi). Alasannya: PO yang masuk belum punya deadline yang bisa
    // dipercayai, jadi memaksa user mengarang tanggal hanya menghasilkan
    // angka palsu. Kosong berarti memang belum ada tanggal kirim.
    dateline: "",
    jumlah: 0,
    jumlahJadi: 0,
    keterangan: "",
    idBatch: "",
    hasLhk: false,
    // Field baru (revisi 2026-10-09)
    // Revisi 2026-10-13: Tanggal Produksi jadi WAJIB — ini tanggal yang
    // dipakai form LHK & jadi dasar urutan "SPK terdekat" di pemilih SPK,
    // jadi tidak boleh kosong. Default-nya ikut Tanggal Pembuatan SPK
    // (yang juga `today`) karena kasus dominate-nya produksi hari ini juga;
    // user tetap bebas mengoreksinya ke tanggal lain.
    tanggalProduksi: today,
    shift: 1,
    noPo: "",
    tanggalPo: "",
    isClosed: 0,
    memoClose: "",
    closeDate: null,
    closeUser: null,
    // Revisi 2026-10-05: penentu apakah tombol "Update Status" terbuka.
    adaLhkFinal: false,
});

const form = ref<SpkForm>(emptyForm());

// ⬅️ BARU: SPK yang sudah punya laporan LHK dikunci total dari edit —
// karena tahapan (tspk_dtl) dan progresnya sudah dipakai perhitungan LHK.
const isLocked = computed(() => isEdit.value && !!form.value.hasLhk);

// ── Status & Memo SPK: PINDAH KE BROWSE (2026-10-05) ───────────────────
//
// Seluruh logika status close + memo (tombol Update Status, dialog
// konfirmasi, editor memo) DIHAPUS dari form ini dan sekarang hidup di
// SpkBrowseView.vue:
//
//   1. STATUS -> tombol "Update Status" di toolbar browse. TERKUNCI
//      sampai tahap proses terakhir punya minimal 1 laporan LHK
//      (flag AdaLhkFinal dari spkService.getBrowse). Diklik -> dialog
//      konfirmasi -> status jadi CLOSED.
//   2. MEMO   -> kolom MEMO di header tabel browse, baru bisa diklik
//      SETELAH status CLOSED. Isinya catatan bebas, contoh: "target 100
//      jadi 75, mesin macet". Boleh diubah berulang.
//
// Versi sebelumnya (2026-10-09) menyatukan keduanya di form: memo WAJIB
// diisi di dialog sebelum status ditutup, dan syaratnya "semua tahap
// selesai". Itu dibongkar — memo jadi slave dari status, bukan prasyarat.
//
// Yang masih dipakai form ini: field form.isClosed / memoClose /
// closeDate / closeUser / adaLhkFinal di atas, karena SpkPrintView dan
// SpkBrowseView membacanya dari endpoint yang sama.

const barangOptions = ref<any[]>([]);
const customerOptions = ref<any[]>([]);
const barangLoading = ref(false);
const customerLoading = ref(false);

const showBarangModal = ref(false);
const showCustomerModal = ref(false);

const kategoriList = ref<SpkKategoriProses[]>([]);
const selectedProcessSteps = ref<SpkMasterProsesDetail[]>([]);
const isLoadingSteps = ref(false);

const selectedProcessName = computed(() => {
    const found = kategoriList.value.find((k) => k.kode === form.value.prsKode);
    return found ? found.nama : "Belum dipilih";
});

// ⬇️ BARU: penanda proses Jasa (prs_jasa=1) utk badge di panel visualisasi
const selectedProcessIsJasa = computed(() => {
    const found = kategoriList.value.find((k) => k.kode === form.value.prsKode);
    return !!found?.jasa;
});

// ⬇️ BARU: deskripsi Master Proses (kolom prs_keterangan)
const selectedProcessDesc = computed(() => {
    const found = kategoriList.value.find((k) => k.kode === form.value.prsKode);
    return found?.keterangan?.trim() || "Belum ada deskripsi untuk proses ini.";
});

const loadKategoriList = async () => {
    try {
        kategoriList.value = await spkDetailApi.getKategoriList();
    } catch (e) {
        console.error("Gagal memuat daftar Master Proses:", e);
    }
};

// Fungsi untuk memuat tahapan berdasarkan master proses yang dipilih
const loadProcessSteps = async (prsKode: string) => {
    if (!prsKode) {
        selectedProcessSteps.value = [];
        return;
    }
    isLoadingSteps.value = true;
    // Kosongkan dulu supaya transisi keluar-masuk kelihatan rapi saat ganti kategori
    selectedProcessSteps.value = [];
    try {
        const steps = await spkDetailApi.getTahapanByProses(prsKode);
        selectedProcessSteps.value = steps;
    } catch (e) {
        console.error("Gagal memuat detail tahapan:", e);
        selectedProcessSteps.value = [];
    } finally {
        isLoadingSteps.value = false;
    }
};

// Watch perubahan form.prsKode
watch(
    () => form.value.prsKode,
    (newVal) => {
        loadProcessSteps(newVal);
    }
);

const loadSearchOptions = async () => {
    barangLoading.value = true;
    customerLoading.value = true;
    try {
        const [resBarang, resCustomer] = await Promise.all([
            spkFormApi.getBarang(""),
            spkFormApi.getCustomer(""),
        ]);
        barangOptions.value = resBarang || [];
        customerOptions.value = resCustomer || [];
    } catch (e) {
        console.error("Gagal memuat opsi pencarian:", e);
    } finally {
        barangLoading.value = false;
        customerLoading.value = false;
    }
};

const searchBarang = async (query: string) => {
    barangLoading.value = true;
    try {
        barangOptions.value = await spkFormApi.getBarang(query || "");
    } catch {
        /* silent */
    } finally {
        barangLoading.value = false;
    }
};

const searchCustomer = async (query: string) => {
    customerLoading.value = true;
    try {
        customerOptions.value = await spkFormApi.getCustomer(query || "");
    } catch {
        /* silent */
    } finally {
        customerLoading.value = false;
    }
};

const selectBarang = (brg: any) => {
    if (!brg) return;
    form.value.brgKode = brg.kode ?? brg.Kode ?? "";
    form.value.brgNama = brg.nama ?? brg.Nama ?? "";
    form.value.satuan = brg.satuan ?? brg.Satuan ?? "";
    showBarangModal.value = false;
};

const selectCustomer = (cus: any) => {
    if (!cus) return;
    form.value.custKode = cus.kode ?? cus.Kode ?? "";
    form.value.custNama = cus.nama ?? cus.Nama ?? "";
    showCustomerModal.value = false;
};

const clearCustomer = () => {
    form.value.custKode = "";
    form.value.custNama = "";
};

const loadData = async () => {
    const nomor = route.params.nomor as string;
    if (!nomor) {
        form.value.isEdit = false;
        // Restore draft dari sessionStorage kalau ada (mis. user refresh browser
        // di tengah mengisi form "+ Baru"). Draft ini hanya dihapus lewat
        // clearFormData() dari tombol "+ Baru" di Browse & setelah save sukses —
        // BUKAN saat pindah tab biasa.
        const draft = loadFormData();
        if (draft) {
            Object.assign(form.value, draft);
            await loadProcessSteps(form.value.prsKode);
            await muatNomorOtomatis();
        } else {
            // ⬅️ BARU: tidak ada draft (mis. baru saja dibersihkan saat tab
            // sebelumnya ditutup) -> form HARUS direset, karena instance ini
            // bisa saja di-reuse dari cache KeepAlive dan masih membawa
            // form.value lama di memory.
            form.value = emptyForm();
            selectedProcessSteps.value = [];
            await muatNomorOtomatis();
        }
        return;
    }
    isLoading.value = true;
    try {
        form.value.isEdit = true;
        const res = await spkFormApi.getDetailForm(decodeURIComponent(nomor));
        Object.assign(form.value, res);
        // Jika edit, panggil load step berdasarkan prsKode yang terisi
        await loadProcessSteps(form.value.prsKode);
        // ⬅️ BARU: kasih tau user kalau form ini terkunci karena sudah ada LHK
        if (form.value.hasLhk) {
            toast.warning("SPK ini sudah memiliki laporan LHK dan tidak dapat diubah lagi.");
        }
    } catch (e: any) {
        toast.error(e.response?.data?.message || "Gagal mengambil data SPK.");
        goBrowseCloseCurrent("spkBrowse");
    } finally {
        isLoading.value = false;
    }
};

const resetForm = () => {
    form.value = emptyForm();
    selectedProcessSteps.value = []; // Reset tahapan
    router.replace({ name: "spkCreate" }).catch(() => {});
    muatNomorOtomatis();
};

const validateSave = (): boolean => {
    if (!form.value.idBatch) {
        toast.warning("Lot harus diisi.");
        return false;
    }
    if (!form.value.nama) {
        toast.warning("Nama SPK harus diisi.");
        return false;
    }
    if (!form.value.brgKode) {
        toast.warning("Barang harus dipilih.");
        return false;
    }
    if (!form.value.prsKode) {
        toast.warning("Kategori Proses harus dipilih.");
        return false;
    }
    if (!form.value.tanggal) {
        toast.warning("Tanggal Pembuatan SPK harus diisi.");
        return false;
    }
    // Revisi 2026-10-13: Tanggal Produksi sekarang WAJIB (dulu opsional).
    // Cek DateLine yang sebelumnya ada di sini DIHAPUS — sudah jadi opsional.
    // Perhatikan urutannya: tanggal produksi dulu, baru qty, supaya user
    // tidak sempat mengetik qty lalu ditolak karena tanggal kosong.
    if (!form.value.tanggalProduksi) {
        toast.warning("Tanggal Produksi harus diisi.");
        return false;
    }
    if ((form.value.jumlah || 0) <= 0) {
        toast.warning("Quantity SPK harus lebih dari 0.");
        return false;
    }
    return true;
};

const onValidateSave = () => {
    if (isLocked.value) {
        toast.warning("SPK ini sudah memiliki laporan LHK, tidak bisa disimpan.");
        return;
    }
    if (!validateSave()) return;
    saveMode.value = "normal";
    showSaveDialog.value = true;
};

const onValidateSaveAndNew = () => {
    if (!validateSave()) return;
    saveMode.value = "new";
    showSaveDialog.value = true;
};

const confirmSave = async () => {
    if (isSaving.value || isSavingNew.value) return;
    const isNewMode = saveMode.value === "new";
    isNewMode ? (isSavingNew.value = true) : (isSaving.value = true);
    try {
        const res = await spkFormApi.save(form.value);
        toast.success("SPK berhasil disimpan.");
        showSaveDialog.value = false;

        // Matikan dulu penulisan draft SEBELUM clearFormData(), baru
        // bersihkan storage-nya. Urutan ini penting — kalau dibalik, ada
        // celah watcher masih bisa nulis ulang di antara keduanya.
        suppressDraftSave.value = true;
        clearFormData();

        if (isNewMode) {
            resetForm();
            suppressDraftSave.value = false; // form baru boleh mulai disave lagi
            toast.info(`SPK ${res?.nomor || ""} tersimpan. Form siap untuk entri baru.`);
        } else {
            form.value = emptyForm();
            goBrowseCloseCurrent("spkBrowse");
        }
    } catch (e: any) {
        toast.error(e.response?.data?.message || "Gagal menyimpan SPK.");
    } finally {
        isSaving.value = false;
        isSavingNew.value = false;
    }
};

const confirmCancel = () => {
    showCancelDialog.value = false;
    goBrowseCloseCurrent("spkBrowse");
};

const confirmClose = () => {
    showCloseDialog.value = false;
    goBrowseCloseCurrent("spkBrowse");
};

// ⬅️ BARU: daftarkan onClose ke tab AKTIF saat ini, supaya draft "+ Baru"
// juga dibersihkan sewaktu user menutup tabnya lewat tab bar (bukan cuma
// lewat tombol "+ Baru" berikutnya atau setelah simpan). Didaftarkan lagi
// di onActivated karena tab id-nya baru tiap kali form ini dibuka ulang
// dari instance KeepAlive yang sama.
const registerTabClose = () => {
    const myTab = tabsStore.tabs.find((t) => t.id === tabsStore.activeTabId);
    if (myTab) {
        myTab.onClose = () => {
            if (!isEdit.value) clearFormData();
        };
    }
};

onMounted(async () => {
    registerTabClose();
    await loadData();
    loadSearchOptions();
    loadKategoriList();
});

// ⬅️ BARU: tab form ini dibungkus <KeepAlive> di TabView.vue. Kalau route
// "+ Baru" yang sama pernah dibuka sebelumnya di sesi ini, Vue akan REUSE
// instance lama dari cache (bukan mount baru), sehingga onMounted() di
// atas TIDAK jalan lagi. onActivated() jalan tiap kali tab ini diaktifkan
// (baru dibuka ATAU diambil dari cache), jadi loadData() & registrasi
// onClose di-refresh ulang di sini juga.
let justMounted = true;
onActivated(async () => {
    if (justMounted) {
        justMounted = false;
        return;
    }
    registerTabClose();
    await loadData();
    loadSearchOptions();
    loadKategoriList();
});

// Simpan draft ke sessionStorage tiap kali form berubah, TAPI hanya saat
// mode create ("+ Baru") — supaya data create yang belum sempat disimpan
// tetap ada kalau browser di-refresh. Mode edit tidak perlu (datanya sudah
// ada di database).
watch(
    form,
    (val) => {
        if (suppressDraftSave.value) return;
        if (!isEdit.value) saveFormData(val);
    },
    { deep: true },
);

// Tanggal berubah -> preview nomor ikut periode baru.
watch(() => form.value.tanggal, muatNomorOtomatis);

const fmt = (v: number) => new Intl.NumberFormat("en-US").format(v || 0);
</script>

<template>
    <BaseForm
        :title="isEdit ? 'Ubah Surat Perintah Kerja (SPK)' : 'Tambah Surat Perintah Kerja Baru'"
        :icon="IconClipboardList"
        :menu-id="MENU_ID"
        :is-loading="isLoading"
        :is-saving="isSaving"
        :is-edit-mode="isEdit"
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        :can-save-new="!isEdit"
        :save-new-loading="isSavingNew"
        @validate-save-new="onValidateSaveAndNew"
        @validate-cancel="showCancelDialog = true"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="onValidateSave"
        @confirm-save="confirmSave"
        @confirm-cancel="confirmCancel"
        @confirm-close="confirmClose"
    >
        <div class="form-header-grid">
            <!-- ===== Kolom Kiri: Field-field form ===== -->
            <div class="header-fields">
                <div class="grid-fields-container">
                    <!-- ID Batch -->
                    <div class="f-row">
                        <label class="f-lbl required">Lot <span class="red-star">*</span></label>
                        <input type="text" v-model="form.idBatch" class="f-inp-native" placeholder="ID Batch produksi..." />
                    </div>

                    <!-- No. SPK -->
                    <div class="f-row">
                        <label class="f-lbl">No. SPK</label>
                        <input type="text" v-model="form.nomor" class="f-inp-native readonly-bg" placeholder="[ OTOMATIS ]" readonly />
                    </div>

                                        <!-- ⬅️ BARU: banner kalau form terkunci -->
                    <div v-if="isLocked" class="lhk-locked-banner" style="grid-column: 1 / -1">
                        SPK ini sudah memiliki laporan LHK dan tidak dapat diubah lagi.
                    </div>

                    <!-- Nama SPK -->
                    <div class="f-row align-start" style="grid-column: 1 / -1">
                        <label class="f-lbl mt-1 required">Nama SPK <span class="red-star">*</span></label>
                        <input type="text" v-model="form.nama" class="f-inp-native" placeholder="Masukkan nama/deskripsi SPK" :readonly="isLocked" />
                    </div>

                    <!-- Barang: kartu picker, bukan 2 input kecil -->
                    <div class="f-row align-start" style="grid-column: 1 / -1">
                        <label class="f-lbl mt-1 required">Barang <span class="red-star">*</span></label>
                        <button type="button" class="barang-picker" :class="{ 'is-filled': !!form.brgKode }" :disabled="isLocked" @click="showBarangModal = true">
                            <div class="barang-picker-icon">
                                <IconBox :size="18" />
                            </div>
                            <div class="barang-picker-info">
                                <template v-if="form.brgKode">
                                    <span class="barang-picker-kode">Kode: {{ form.brgKode }}</span>
                                    <span class="barang-picker-nama">{{ form.brgNama }}</span>
                                </template>
                                <template v-else>
                                    <span class="barang-picker-placeholder">Klik untuk pilih barang...</span>
                                </template>
                            </div>
                            <span v-if="form.brgKode" class="badge-satuan" title="Satuan barang">
                                <IconBox :size="12" />
                                {{ form.satuan || "Unit" }}
                            </span>
                            <div class="barang-picker-action">
                                <IconSearch :size="14" />
                                <span>{{ form.brgKode ? "Ganti" : "Pilih" }}</span>
                            </div>
                        </button>
                    </div>

                    <!-- Kategori Proses -->
                    <div class="f-row">
                        <label class="f-lbl required">Kategori Proses <span class="red-star">*</span></label>
                        <select v-model="form.prsKode" class="f-inp-native" :disabled="isEdit || isLocked">
                            <option value="" disabled>-- Pilih Master Proses --</option>
                            <option v-for="k in kategoriList" :key="k.kode" :value="k.kode">
                                {{ k.nama || k.kode }} ({{ k.kode }}){{ k.jasa ? " — Jasa" : "" }}
                            </option>
                        </select>
                    </div>

                    <!-- Customer -->
                    <div class="f-row">
                        <label class="f-lbl">Customer</label>
                        <div class="search-group">
                            <input type="text" :value="form.custKode" class="f-inp-native w-30 readonly-bg" readonly placeholder="Kode" />
                            <input type="text" :value="form.custNama" class="f-inp-native w-70 readonly-bg" readonly placeholder="(Opsional)" />
                                                        <button class="btn-search" type="button" :disabled="isLocked" @click="showCustomerModal = true">
                                <IconSearch :size="14" />
                            </button>
                            <button v-if="form.custKode && !isLocked" class="btn-search btn-clear" type="button" @click="clearCustomer">✕</button>
                        </div>
                    </div>

                    <!-- PUNGGUL: kolom spk_tanggal = tanggal PEMBUATAN SPK (dokumen),
                         bukan tanggal produksi. Labelnya diganti supaya
                         tidak tertukar dengan "Tanggal Produksi" di bawah. -->
                    <div class="f-row">
                        <label class="f-lbl required">Tanggal Pembuatan SPK <span class="red-star">*</span></label>
                        <input type="date" v-model="form.tanggal" class="f-inp-native" :disabled="isLocked" />
                    </div>

                    <!-- ⬅️ BARU (revisi 2026-10-09): Tanggal Produksi. BEDA dari
                         Tanggal Pembuatan SPK di atas — ini tanggal mulai
                         produksi dijalankan, dan inilah yang ditarik form LHK.
                         ⬅️ WAJIB (revisi 2026-10-13): SPK
                         yang dibuat sebelum revisi ini dan belum punya LHK
                         bisa punya nilai kosong di DB; itu diisi saat diedit. -->
                    <div class="f-row">
                        <label class="f-lbl required">Tanggal Produksi <span class="red-star">*</span></label>
                        <input
                            type="date"
                            v-model="form.tanggalProduksi"
                            class="f-inp-native"
                            :disabled="isLocked"
                        />
                    </div>

                    <!-- ⬅️ BARU (revisi 2026-10-09): satu SPK = satu shift.
                         Nilainya yang menentukan shift LHK, jadi form LHK
                         tidak boleh punya dropdown shift sendiri. -->
                    <div class="f-row">
                        <label class="f-lbl">Shift SPK</label>
                        <select v-model.number="form.shift" class="f-inp-native" :disabled="isLocked">
                            <option :value="1">Shift 1</option>
                            <option :value="2">Shift 2</option>
                            <option :value="3">Shift 3</option>
                        </select>
                    </div>

                    <!-- ⬅️ BARU (revisi 2026-10-09): No. PO customer -->
                    <div class="f-row">
                        <label class="f-lbl">No. PO</label>
                        <input
                            type="text"
                            v-model="form.noPo"
                            class="f-inp-native"
                            :disabled="isLocked"
                            placeholder="(Opsional)"
                        />
                    </div>

                    <!-- ⬅️ BARU (revisi 2026-10-09): Tanggal PO customer -->
                    <div class="f-row">
                        <label class="f-lbl">Tanggal PO</label>
                        <input
                            type="date"
                            v-model="form.tanggalPo"
                            class="f-inp-native"
                            :disabled="isLocked"
                            placeholder="(Opsional)"
                        />
                    </div>

                    <!-- DateLine / tanggal kirim ke customer. ⬅️ OPSIONAL (revisi
                         2026-10-13): dulu red-star + divalidasi "harus diisi".
                         Sekarang boleh kosong karena PO yang masuk belum punya
                         deadline yang bisa dipercayai — memaksa user mengarang
                         tanggal hanya menghasilkan angka palsu. Kosong = belum
                         ada tanggal kirim, dan di print juga tidak dicetak. -->
                    <div class="f-row">
                        <label class="f-lbl">DateLine</label>
                        <input
                            type="date"
                            v-model="form.dateline"
                            class="f-inp-native"
                            :disabled="isLocked"
                            placeholder="(Opsional)"
                        />
                    </div>

                    <!-- Quantity SPK -->
                    <div class="f-row">
                        <label class="f-lbl required">Quantity SPK <span class="red-star">*</span></label>
                        <div class="search-group">
                            <!-- ⬅️ zero-as-empty: kolom target produksi default-nya 0. Kalau "0"
                             masih kelihatan di dalam kolom, user yang mau
                             ngetik 5 fear ketik di belakang jadi 50. -->
                            <NumberInput
                                v-model="form.jumlah"
                                decimal-sep="comma"
                                zero-as-empty
                                :max-decimals="2"
                                input-class="f-inp-native"
                                :readonly="isLocked"
                            />
                            <span class="unit-badge">{{ form.satuan || "Unit" }}</span>
                        </div>
                    </div>
                </div>

                <!-- Keterangan (full width, di luar grid 2 kolom) -->
                <div class="f-row align-start mt-1" style="grid-column: 1 / -1">
                    <label class="f-lbl mt-1">Keterangan</label>
                    <textarea v-model="form.keterangan" class="f-txa-native" rows="3" placeholder="Instruksi atau keterangan khusus untuk produksi..." :readonly="isLocked"></textarea>
                </div>

                <!-- ══════ Status + Memo — PINDAH KE BROWSE (2026-10-05) ══════
                     Panel "Status Produksi" + kolom memo yang dulu ada di
                     form ini sudah DIHAPUS dari template (bukan dikomentari
                     saja, supaya tidak ada tag <div> yatim di dalam blok
                     komentar yang harus ikut diurus).

                     Alasannya: user minta status & memo jadi KOLOM di header
                     tabel browse SPK, dan tombol "Update Status" jadi tombol
                     toolbar di sana. Dua tempat edit memo di satu dokumen
                     hanya bikin bingung mana yang jadi acuan.

                     Yang dipakai sekarang:
                       - SpkBrowseView.vue  -> kolom STATUS + MEMO (sel MEMO
                         bisa diklik kalau sudah CLOSED) + tombol Update Status
                       - cetakan SPK        -> baris "Memo" di header

                     Logika & dialog konfirmasi tetap hidup di <script> file
                     ini (showCloseStatusDialog dll.) - jangan hapus sebelum
                     dipastikan tidak dipakai lagi. -->

            </div>

            <!-- ===== Kolom Kanan: Panel Visualisasi Tahapan Produksi (semi-3D) ===== -->
            <div class="header-summary">
                <div class="production-panel">
                    <div class="ps-header">
                        <div class="ps-icon" :class="{ spinning: isLoadingSteps }">⚙️</div>
                        <div class="ps-title">
                            <h4>{{ selectedProcessName }}</h4>
                            <span class="ps-title-row">
                                <span v-if="selectedProcessIsJasa" class="ps-jasa-badge">Jasa</span>
                                <span class="ps-title-sub">Visualisasi Tahapan Produksi</span>
                            </span>
                        </div>
                    </div>

                    <div class="ps-steps-visual">
                        <div v-if="isLoadingSteps" class="ps-loading">
                            <span class="ps-spinner"></span>
                            Memuat tahapan...
                        </div>
                        <TransitionGroup v-else name="step-pop" tag="div" class="ps-steps-track">
                            <div
                                v-for="(step, index) in selectedProcessSteps"
                                :key="step.id ?? index"
                                class="ps-step-item"
                                :style="{ transitionDelay: `${index * 90}ms` }"
                            >
                                <div class="ps-step-circle">{{ step.urutan }}</div>
                                <div class="ps-step-name">{{ step.nama }}</div>
                                <div
                                    v-if="index < selectedProcessSteps.length - 1"
                                    class="ps-step-line"
                                    :style="{ transitionDelay: `${index * 90 + 150}ms` }"
                                ></div>
                            </div>
                        </TransitionGroup>
                        <div v-if="selectedProcessSteps.length === 0 && !isLoadingSteps" class="ps-empty">
                            Silakan pilih Master Proses untuk melihat tahapannya.
                        </div>
                    </div>

                    <!-- ⬇️ DIGANTI: dulu "Daftar Urutan Tahapan", sekarang Deskripsi Proses -->
                    <Transition name="desc-fade" mode="out-in">
                        <div class="ps-desc" :key="form.prsKode || 'empty'">
                            <div class="ps-desc-title">Deskripsi Proses</div>
                            <p class="ps-desc-text" :class="{ 'is-empty': !form.prsKode }">
                                {{ form.prsKode ? selectedProcessDesc : "—" }}
                            </p>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>

        <!-- Search Modals -->
        <SearchModal
            v-model="showBarangModal"
            title="Pilih Barang"
            :columns="[
                { key: 'kode', title: 'KODE BARANG', width: '120px' },
                { key: 'nama', title: 'NAMA BARANG' },
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

        <!-- ══════ Dialog konfirmasi update status: PINDAH KE BROWSE ══════
             Dihapus dari form ini (2026-10-05).Tombol pemicunya ada di
             toolbar SpkBrowseView.vue, jadi dialog ini sudah tidak punya
             jalan untuk terbuka. Versi yang dipakai sekarang ada di
             SpkBrowseView.vue dan isinya sama: konfirmasi bahwa menutup
             status itu permanen dan SPK tidak bisa dilanjutkan lewat LHK. -->
    </BaseForm>
</template>

<style scoped>
/* ===== Layout Form ===== */
.form-header-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    align-items: start;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
}
@media (max-width: 960px) {
    .form-header-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }
}

.header-fields { display: flex; flex-direction: column; gap: 6px; }
.grid-fields-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
@media (max-width: 600px) {
    .grid-fields-container { grid-template-columns: 1fr; }
}

.f-row { display: flex; align-items: center; }
.f-row.align-start { align-items: flex-start; }
.f-lbl { width: 100px; font-size: 11.5px; font-weight: 600; color: #4b5563; flex-shrink: 0; letter-spacing: 0.01em; }
.required .red-star { color: #e53e3e; font-size: 14px; font-weight: 700; margin-left: 1px; }
.f-inp-native,
.f-txa-native {
    flex: 1;
    height: 32px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 12px;
    color: #1f2937;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.f-txa-native { height: auto; padding: 8px 10px; line-height: 1.4; resize: vertical; }
.f-inp-native:focus,
.f-txa-native:focus { border-color: #1E40AF; box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.12); }
.readonly-bg { background-color: #f9fafb; color: #6b7280; cursor: default; }
select.f-inp-native { background: #ffffff; cursor: pointer; }
select.f-inp-native:disabled { background-color: #f9fafb; color: #9ca3af; cursor: not-allowed; }
.search-group { display: flex; flex: 1; gap: 6px; align-items: center; }
.btn-search {
    height: 32px;
    width: 36px;
    background: #1E40AF;
    color: white;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
}
.btn-search:hover { background: #1E3A8A; }
.btn-search:active { transform: scale(0.95); }
.btn-clear { background: #9ca3af; }
.btn-clear:hover { background: #6b7280; }
.w-30 { width: 30%; flex: none !important; }
.w-70 { width: 70%; }
.mt-1 { margin-top: 6px; }
.unit-badge {
    font-size: 11.5px;
    font-weight: 600;
    color: #4b5563;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0 10px;
    height: 32px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

/* ===== Barang Picker (kartu, bukan 2 input kecil) ===== */
.barang-picker {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #ffffff;
    border: 1.5px dashed #d1d5db;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, transform 0.1s ease;
}
.barang-picker:hover {
    border-color: #1E40AF;
    box-shadow: 0 2px 10px rgba(30, 64, 175, 0.1);
}
.barang-picker:active { transform: scale(0.995); }
.barang-picker.is-filled {
    border-style: solid;
    border-color: #c7d2fe;
    background: linear-gradient(180deg, #ffffff, #f7f8ff);
}
.barang-picker-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #eef0fb;
    color: #1E40AF;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.18s ease, color 0.18s ease;
}
.barang-picker.is-filled .barang-picker-icon { background: #1E40AF; color: #fff; }
.barang-picker-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.barang-picker-kode {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 0.02em;
}
.barang-picker-nama {
    font-size: 12.5px;
    font-weight: 700;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.barang-picker-placeholder { font-size: 12px; color: #9ca3af; font-style: italic; }

/* ⬅️ BARU: banner form terkunci karena sudah ada LHK */
.lhk-locked-banner {
    font-size: 12px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 4px;
}

/* ══════ Panel Close Status (revisi 2026-10-09) ══════ */
.close-status-box {
    margin-top: 4px;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    padding: 10px 12px;
    background: #f8fafc;
}
.close-status-box.is-closed {
    border-style: solid;
    border-color: #a7f3d0;
    background: #ecfdf5;
}
.cs-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}
.cs-title {
    font-size: 12px;
    font-weight: 700;
    color: #334155;
}
.cs-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.4px;
    padding: 2px 8px;
    border-radius: 8px;
}
.cs-badge--closed {
    background: #047857;
    color: #fff;
}
.cs-badge--open {
    background: #e2e8f0;
    color: #475569;
}
.cs-meta {
    font-size: 11.5px;
    color: #64748b;
    margin-bottom: 6px;
}
.cs-memo-label {
    font-size: 11px;
    font-weight: 600;
    color: #047857;
}
.cs-memo {
    font-size: 12.5px;
    color: #065f46;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #a7f3d0;
    border-radius: 6px;
    white-space: pre-wrap;
    margin-bottom: 4px;
}
/* Memo bisa diklik hanya kalau status sudah CLOSED. Kalau belum, teksnya
  tetap ditampilkan (memang informatif) tapi digelay supaya jelas bukan
  area interaktif, dan placeholder-nya berbunyi "Tersedia setelah status
  CLOSED". */
.cs-memo.is-clickable {
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.cs-memo.is-clickable:hover {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
}
.cs-memo:not(.is-clickable) {
    color: #94a3b8;
    border-style: dashed;
    cursor: default;
}
.cs-memo-input {
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 12.5px;
    line-height: 1.4;
    color: #065f46;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #10b981;
    border-radius: 6px;
    outline: none;
    resize: vertical;
}
.cs-memo-input:focus {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
}
.cs-memo-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
}
.btn-memo {
    font-size: 11.5px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid #94a3b8;
    background: #fff;
    color: #334155;
    cursor: pointer;
}
.btn-memo:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #64748b;
}
.btn-memo--primary {
    background: #047857;
    border-color: #047857;
    color: #fff;
}
.btn-memo--primary:hover:not(:disabled) {
    background: #065f46;
    border-color: #065f46;
}
.btn-memo:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.btn-close-status {
    font-size: 11.5px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid #94a3b8;
    background: #fff;
    color: #334155;
    cursor: pointer;
}
.btn-close-status:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #64748b;
}
.btn-close-status:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.cs-dialog-title {
    font-size: 15px;
    font-weight: 700;
}
.cs-dialog-info {
    font-size: 12.5px;
    color: #475569;
    margin-bottom: 8px;
}
.badge-satuan {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 700;
    padding: 4px 9px;
    border-radius: 8px;
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
    flex-shrink: 0;
}
.barang-picker-action {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #1E40AF;
    background: #eef0fb;
    padding: 5px 10px;
    border-radius: 8px;
    flex-shrink: 0;
    transition: background 0.15s ease;
}
.barang-picker:hover .barang-picker-action { background: #dfe2f7; }

/* ===== Panel Tahapan Produksi ===== */
.header-summary {
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 0;
    height: 100%;
    display: flex;
    align-items: stretch;
    min-height: 200px;
}

.production-panel {
    width: 100%;
    background: linear-gradient(145deg, #f8fafc, #eef2f7);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
    overflow: hidden;
}

.ps-header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
}

/* Icon header: semi-3D */
.ps-icon {
    font-size: 24px;
    width: 42px;
    height: 42px;
    background: linear-gradient(150deg, #5a5aae, #1E40AF 75%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow:
        0 6px 10px rgba(30, 64, 175, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.3),
        inset 0 -3px 5px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease;
}
.ps-icon.spinning { animation: ps-spin 1s linear infinite; }
@keyframes ps-spin {
    to { transform: rotate(360deg); }
}

.ps-title h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1E40AF;
    transition: opacity 0.2s ease;
}
.ps-title span { font-size: 12px; color: #64748b; font-weight: 500; }
.ps-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
}
.ps-jasa-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.6;
    background: #fdf2f8;
    color: #be185d;
    border: 1px solid #f9a8d4;
}
.ps-title-sub { font-size: 12px; color: #64748b; font-weight: 500; }

/* Steps visual */
.ps-steps-visual {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow-x: auto;
    padding: 12px 0;
    min-height: 80px;
    position: relative;
}

.ps-steps-track {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
}

.ps-step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    position: relative;
    width: 90px;
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Step circle: semi-3D dengan perspective + gradient + inset shadow */
.ps-step-circle {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(145deg, #ffffff 0%, #eef0fb 60%, #dfe2f7 100%);
    border: none;
    color: #1E40AF;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    box-shadow:
        0 6px 10px rgba(30, 64, 175, 0.22),
        0 2px 3px rgba(30, 64, 175, 0.15),
        inset 0 1px 2px rgba(255, 255, 255, 0.9),
        inset 0 -3px 4px rgba(30, 64, 175, 0.12);
    z-index: 2;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease;
    transform: perspective(200px) rotateX(8deg);
}
.ps-step-item:hover .ps-step-circle {
    transform: perspective(200px) rotateX(0deg) scale(1.14) translateY(-2px);
    background: linear-gradient(145deg, #4a4a9e, #1E40AF 70%);
    color: #fff;
    box-shadow:
        0 10px 18px rgba(30, 64, 175, 0.35),
        inset 0 1px 2px rgba(255, 255, 255, 0.35),
        inset 0 -3px 5px rgba(0, 0, 0, 0.25);
}

.ps-step-name {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    color: #334155;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 2px 4px;
    width: 90px;
    z-index: 2;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ps-step-item:hover .ps-step-name {
    border-color: #1E40AF;
    box-shadow: 0 2px 6px rgba(30, 64, 175, 0.15);
}

.ps-step-line {
    position: absolute;
    top: 19px;
    left: 70%;
    width: 40px;
    height: 3px;
    border-radius: 8px;
    background: linear-gradient(90deg, #1E40AF, #cbd5e1);
    box-shadow: 0 1px 2px rgba(30, 64, 175, 0.25);
    z-index: 1;
    transform-origin: left center;
    transform: scaleX(0);
    animation: ps-line-grow 0.4s ease forwards;
}
@keyframes ps-line-grow {
    to { transform: scaleX(1); }
}

/* Transition: step muncul dgn fade + slide up + pop, staggered via transitionDelay inline */
.step-pop-enter-active { transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.step-pop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; position: absolute; }
.step-pop-enter-from { opacity: 0; transform: translateY(14px) scale(0.85); }
.step-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.9); }
.step-pop-move { transition: transform 0.3s ease; }

/* Loading state */
.ps-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #64748b;
    padding: 20px;
}
.ps-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #cbd5e1;
    border-top-color: #1E40AF;
    border-radius: 8px;
    animation: ps-spin 0.7s linear infinite;
}

.ps-empty {
    font-size: 12px;
    color: #94a3b8;
    padding: 20px;
    text-align: center;
    width: 100%;
    animation: ps-fade-in 0.3s ease;
}
@keyframes ps-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== Deskripsi Proses (pengganti daftar urutan tahapan) ===== */
.ps-desc {
    background: white;
    border-radius: 8px;
    padding: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
}
.ps-desc-title {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 0.03em;
}
.ps-desc-text {
    font-size: 13px;
    line-height: 1.6;
    color: #334155;
    margin: 0;
    white-space: pre-line;
}
.ps-desc-text.is-empty {
    color: #cbd5e1;
    text-align: center;
    font-style: italic;
}

.desc-fade-enter-active,
.desc-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.desc-fade-enter-from { opacity: 0; transform: translateY(6px); }
.desc-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* ===== Responsive ===== */
@media (max-width: 960px) {
    .header-summary { min-height: 160px; }
    .ps-step-item { width: 70px; }
    .ps-step-name { font-size: 10px; width: 70px; }
    .ps-step-line { left: 60%; width: 30px; }
}
</style>