<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useTabsStore } from "@/stores/tabsStore";
import SearchModal from "@/components/SearchModal.vue";
import { IconTruckDelivery, IconSearch, IconTrash } from "@tabler/icons-vue";
import {
  mutasiCabangInFormApi,
  type MutasiCabangInForm,
  type MuOutOption,
} from "@/api/transaksi/mutasiCabangInFormApi";
import { useAuthStore } from "@/stores/authStore";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();
const authStore = useAuthStore();

const MENU_ID = "17"; // frmMutasiCabang2 — Mutasi Cabang In
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

const cabangLogin = computed(() => String(authStore.userCabang || "00"));
const isCabangUser = computed(() => cabangLogin.value !== "00");

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyForm = (): MutasiCabangInForm => ({
  isEdit: false,
  nomor: "",
  tanggal: todayLocal(),
  nomorMutasi: "",
  cabangAsal: "",
  cabangTujuan: String(authStore.userCabang || "00"),
  gudang: "",
  detail: [],
});

const form = ref<MutasiCabangInForm>(emptyForm());

// ── Lookup ───────────────────────────────────────────────────────────
const cabangOptions = ref<{ kode: string; nama: string }[]>([]);
const gudangOptions = ref<{ kode: string; nama: string }[]>([]);

const loadOptions = async () => {
  try {
    const [cbg, gdg] = await Promise.all([
      mutasiCabangInFormApi.getCabang(),
      mutasiCabangInFormApi.getGudang(form.value.cabangTujuan),
    ]);
    cabangOptions.value = cbg;
    gudangOptions.value = gdg;
    if (gdg.length === 1) form.value.gudang = gdg[0].kode;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data cabang/gudang.");
  }
};

const loadNomor = async () => {
  const cabangTujuan = form.value.cabangTujuan;
  if (!cabangTujuan) return;
  try {
    form.value.nomor = await mutasiCabangInFormApi.getNomor(
      form.value.tanggal,
      cabangTujuan
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal generate nomor penerimaan.");
  }
};

// ── Modal No. Mutasi Out ─────────────────────────────────────────────
const showMuOutModal = ref(false);
const muOutOptions = ref<MuOutOption[]>([]);
const muOutLoading = ref(false);

const searchMuOut = async () => {
  const cabangTujuan =
    isCabangUser.value ? cabangLogin.value : form.value.cabangTujuan;
  if (!cabangTujuan) {
    toast.warning("Pilih cabang tujuan terlebih dahulu.");
    return;
  }
  muOutLoading.value = true;
  try {
    muOutOptions.value = await mutasiCabangInFormApi.searchMuOut(cabangTujuan);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat daftar mutasi out.");
  } finally {
    muOutLoading.value = false;
  }
};

const openMuOutModal = () => {
  showMuOutModal.value = true;
  searchMuOut();
};

const selectMuOut = async (item: MuOutOption | null) => {
  if (!item) return;
  try {
    const data = await mutasiCabangInFormApi.loadMutasi(item.nomor);
    form.value.cabangAsal = data.cabangAsal;
    form.value.cabangTujuan = data.cabangTujuan;
    form.value.nomorMutasi = data.nomor;
    form.value.detail = (data.detail || []).map((d: any) => ({
      sku: d.sku,
      namaBarang: d.namaBarang,
      satuan: d.satuan,
      qty: Number(d.qty),
      expired: d.expired || "",
      keterangan: d.keterangan || "",
      harga: Number(d.harga),
    }));
    showMuOutModal.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data mutasi out.");
  }
};

const removeRow = (idx: number) => form.value.detail.splice(idx, 1);

watch(() => form.value.tanggal, () => {
  if (!isEdit.value) loadNomor();
});

watch(
  () => form.value.cabangTujuan,
  (val, old) => {
    if (val === old) return;
    if (!isEdit.value) {
      loadNomor();
      mutasiCabangInFormApi
        .getGudang(form.value.cabangTujuan)
        .then((g) => {
          gudangOptions.value = g;
          if (g.length === 1) form.value.gudang = g[0].kode;
          else if (!g.some((x) => x.kode === form.value.gudang))
            form.value.gudang = "";
        })
        .catch(() => {});
    }
  }
);

// ── Validasi & Simpan ────────────────────────────────────────────────
const showModal = (msg: string) => toast.warning(msg);

const validateSave = () => {
  if (!form.value.nomorMutasi) return showModal("Pilih No. Mutasi Out terlebih dahulu.");
  if (!form.value.cabangTujuan) return showModal("Cabang tujuan belum dipilih.");
  if (!form.value.gudang) return showModal("Gudang penerima belum dipilih.");
  if (form.value.detail.length === 0)
    return showModal("Detail kosong. Pilih No. Mutasi Out terlebih dahulu.");
  for (const [i, d] of form.value.detail.entries()) {
    if ((d.qty || 0) <= 0)
      return showModal(`Jumlah untuk "${d.namaBarang}" harus lebih dari 0.`);
  }
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const res = await mutasiCabangInFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
      nomor: form.value.nomor,
    });
    toast.success(`Mutasi In ${res.data?.nomor || form.value.nomor} berhasil disimpan.`);
    showSaveDialog.value = false;
    const targetPath = route.path;
    router.push({ name: "MutasiIn" });
    await nextTick();
    tabsStore.closeTab(targetPath);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan penerimaan mutasi.");
  } finally {
    isSaving.value = false;
  }
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  router.push({ name: "MutasiIn" });
};

const confirmClose = async () => {
  showCloseDialog.value = false;
  const targetPath = route.path;
  router.push({ name: "MutasiIn" });
  await nextTick();
  tabsStore.closeTab(targetPath);
};

// ── Load edit ────────────────────────────────────────────────────────
const loadData = async () => {
  const nomor = route.params.nomor as string;
  if (!nomor) {
    form.value = emptyForm();
    await loadOptions();
    if (isCabangUser.value) await loadNomor();
    return;
  }
  isLoading.value = true;
  try {
    await loadOptions();
    const res = await mutasiCabangInFormApi.getForm(decodeURIComponent(nomor));
    form.value = {
      ...res,
      isEdit: true,
      nomor: res.nomor || nomor,
      cabangTujuan: String(authStore.userCabang || "00") === "00"
        ? res.cabangTujuan
        : String(authStore.userCabang),
    };
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengambil data penerimaan.");
    router.push({ name: "MutasiIn" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => loadData());

watch(
  () => route.params.nomor,
  () => loadData()
);

const fmtQty = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v || 0);

const cabangNama = (kode: string) => {
  const c = cabangOptions.value.find((x) => x.kode === kode);
  return c ? `${c.kode} - ${c.nama}` : kode;
};
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Mutasi Cabang In' : 'Penerimaan Mutasi Cabang (Mutasi In)'"
    :icon="IconTruckDelivery"
    :menu-id="MENU_ID"
    :is-loading="isLoading"
    :is-saving="isSaving"
    :is-edit-mode="isEdit"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="confirmSave"
    @confirm-cancel="confirmCancel"
    @confirm-close="confirmClose"
  >
    <!-- ── Header ──────────────────────────────────────────────────── -->
    <div class="form-header-grid">
      <div class="header-fields">
        <div class="grid-fields">
          <div class="f-row">
            <label class="f-lbl">No. Terima</label>
            <input
              type="text"
              v-model="form.nomor"
              class="f-inp readonly-bg"
              placeholder="[ OTOMATIS ]"
              readonly
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input type="date" v-model="form.tanggal" class="f-inp" />
          </div>

          <div class="f-row">
            <label class="f-lbl">No. Mutasi Out</label>
            <div class="search-group">
              <input
                type="text"
                :value="form.nomorMutasi"
                class="f-inp readonly-bg"
                readonly
                placeholder="Pilih dokumen mutasi out..."
              />
              <button class="btn-srch btn-blue" type="button" @click="openMuOutModal">
                <IconSearch :size="14" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Gudang Terima</label>
            <select v-model="form.gudang" class="f-inp">
              <option value="" disabled>-- Pilih Gudang --</option>
              <option v-for="g in gudangOptions" :key="g.kode" :value="g.kode">
                {{ g.kode }} - {{ g.nama }}
              </option>
            </select>
          </div>

          <div class="f-row">
            <label class="f-lbl">Asal</label>
            <input
              type="text"
              :value="cabangNama(form.cabangAsal)"
              class="f-inp readonly-bg"
              readonly
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Tujuan</label>
            <select
              v-model="form.cabangTujuan"
              class="f-inp"
              :class="{ 'readonly-bg': isCabangUser }"
              :disabled="isCabangUser"
            >
              <option value="" disabled>-- Pilih Cabang --</option>
              <option v-for="c in cabangOptions" :key="c.kode" :value="c.kode">
                {{ c.kode }} - {{ c.nama }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="header-summary">
        <div class="summary-box">
          <div class="summary-lbl">TOTAL QTY</div>
          <div class="summary-val">
            {{ fmtQty(form.detail.reduce((s, d) => s + (Number(d.qty) || 0), 0)) }}
          </div>
          <div class="summary-sub">{{ form.detail.length }} item barang</div>
        </div>
      </div>
    </div>

    <!-- ── Tabel Detail ────────────────────────────────────────────── -->
    <div class="detail-section mt-4">
      <div class="section-title mb-2">
        <span>Detail Barang (isi dari No. Mutasi Out)</span>
      </div>

      <div class="tbl-wrap">
        <table class="dtl-tbl">
          <thead>
            <tr>
              <th class="tc" style="width: 36px">NO</th>
              <th style="width: 100px">SKU</th>
              <th>NAMA BARANG</th>
              <th style="width: 110px" class="tr">QTY ✎</th>
              <th style="width: 70px" class="tc">SATUAN</th>
              <th style="width: 110px" class="tc">EXPIRED</th>
              <th style="width: 180px">KETERANGAN ✎</th>
              <th class="tc" style="width: 40px">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="form.detail.length === 0">
              <td colspan="8" class="tc pa-6 text-grey italic">
                Belum ada barang. Pilih "No. Mutasi Out" untuk mengisi detail.
              </td>
            </tr>
            <tr v-for="(row, idx) in form.detail" :key="idx">
              <td class="tc text-grey-darken-1 font-weight-bold">{{ idx + 1 }}</td>
              <td><span class="mono">{{ row.sku }}</span></td>
              <td>
                <span class="font-weight-bold text-grey-darken-4">{{
                  row.namaBarang
                }}</span>
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="row.qty"
                  class="cell-inp tr qty-inp"
                  min="0"
                />
              </td>
              <td class="tc">{{ row.satuan }}</td>
              <td class="tc mono">{{ row.expired || "-" }}</td>
              <td>
                <input
                  type="text"
                  v-model="row.keterangan"
                  class="cell-inp"
                  placeholder="Ket. item..."
                />
              </td>
              <td class="tc">
                <button
                  class="btn-del"
                  type="button"
                  @click="removeRow(idx)"
                  title="Hapus baris"
                >
                  <IconTrash :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="form.detail.length > 0">
            <tr class="tfoot-row">
              <td colspan="3" class="tr pr-2 text-caption text-grey">TOTAL</td>
              <td class="tr font-weight-bold text-green-darken-4 pr-2">
                {{ fmtQty(form.detail.reduce((s, d) => s + (Number(d.qty) || 0), 0)) }}
              </td>
              <td colspan="4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ── Dialog Simpan ───────────────────────────────────────────── -->
    <v-dialog v-model="showSaveDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title
          class="text-subtitle-1 font-weight-bold pa-3 bg-blue-darken-3 text-white"
        >
          Konfirmasi Simpan
        </v-card-title>
        <v-card-text class="pa-4 text-body-2">
          Simpan penerimaan Mutasi Out <strong>{{ form.nomorMutasi }}</strong> dengan nomor
          <strong>{{ form.nomor }}</strong> ke gudang
          <strong>{{ form.gudang }}</strong
          >?<br />
          <span class="text-caption text-grey"
            >Total qty:
            {{ fmtQty(form.detail.reduce((s, d) => s + (Number(d.qty) || 0), 0)) }}
            | {{ form.detail.length }} item</span
          >
        </v-card-text>
        <v-card-actions class="pa-2 bg-grey-lighten-4 justify-end">
          <v-btn size="small" variant="outlined" @click="showSaveDialog = false"
            >Batal</v-btn
          >
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            class="px-4"
            :loading="isSaving"
            @click="confirmSave"
            >Ya, Simpan</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog Batal ────────────────────────────────────────────── -->
    <v-dialog v-model="showCancelDialog" max-width="320">
      <v-card rounded="lg">
        <v-card-title
          class="text-subtitle-1 font-weight-bold pa-3 bg-red-darken-4 text-white"
        >
          Batalkan
        </v-card-title>
        <v-card-text class="pa-4 text-body-2">
          Keluar dari halaman ini? Perubahan yang belum disimpan akan hilang.
        </v-card-text>
        <v-card-actions class="pa-2 bg-grey-lighten-4 justify-end">
          <v-btn
            size="small"
            variant="outlined"
            @click="showCancelDialog = false"
            >Kembali</v-btn
          >
          <v-btn
            size="small"
            color="error"
            variant="flat"
            @click="confirmCancel"
            >Ya, Keluar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── SearchModal No. Mutasi Out ──────────────────────────────── -->
    <SearchModal
      v-model="showMuOutModal"
      title="Pilih No. Mutasi Out (Belum Diterima)"
      :columns="[
        { key: 'nomor', title: 'NO. MUTASI', width: '150px' },
        { key: 'tanggal', title: 'TANGGAL', width: '110px', align: 'center' },
        { key: 'asal', title: 'ASAL' },
        { key: 'tujuan', title: 'TUJUAN' },
      ]"
      :items="muOutOptions"
      :loading="muOutLoading"
      :server-search="false"
      search-placeholder="Cari nomor mutasi..."
      :search-keys="['nomor', 'asal', 'tujuan']"
      @select="selectMuOut"
    />
  </BaseForm>
</template>

<style scoped>
.form-header-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
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
.grid-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}
@media (max-width: 600px) {
  .grid-fields {
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
.f-inp {
  flex: 1;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
}
.f-inp:focus {
  border-color: #1976d2;
}
.readonly-bg {
  background: #f3f4f6;
  color: #6b7280;
}

.search-group {
  display: flex;
  flex: 1;
  gap: 4px;
}
.btn-srch {
  height: 28px;
  width: 32px;
  color: white;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-blue {
  background: #3B5998;
}

/* Summary */
.header-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
}
.summary-box {
  background: #3B5998;
  color: white;
  padding: 12px;
  border-radius: 4px;
  text-align: right;
}
.summary-lbl {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.85;
}
.summary-val {
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.summary-sub {
  font-size: 10px;
  opacity: 0.75;
  margin-top: 2px;
}

/* Table */
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #3B5998;
  text-transform: uppercase;
}
.tbl-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: auto;
}
.dtl-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-tbl thead tr {
  background: #3B5998;
}
.dtl-tbl th {
  color: white;
  font-weight: 700;
  padding: 6px;
  white-space: nowrap;
  text-align: left;
}
.dtl-tbl td {
  padding: 3px 4px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.dtl-tbl tbody tr:hover td {
  background: rgba(21, 101, 192, 0.03);
}
.dtl-tbl tfoot .tfoot-row td {
  background: #f5f5f5;
  border-top: 2px solid #e0e0e0;
  padding: 5px 4px;
}

.mono {
  font-family: monospace;
  font-size: 10px;
  color: #6b7280;
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
.qty-inp {
  background: #e8e8f5;
  border-color: #a5a5d6;
  font-weight: 700;
  color: #3B5998;
}

.btn-del {
  background: none;
  border: none;
  color: #ef5350;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}
.btn-del:hover {
  background: #ffebee;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.pr-2 {
  padding-right: 8px;
}
.mt-4 {
  margin-top: 16px;
}
.mb-2 {
  margin-bottom: 8px;
}
.italic {
  font-style: italic;
}
.pa-6 {
  padding: 24px;
}
</style>
