<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useTabsStore } from "@/stores/tabsStore";
import SearchModal from "@/components/SearchModal.vue";
import { IconTruckDelivery, IconSearch, IconTrash, IconPlus } from "@tabler/icons-vue";
import {
  mutasiCabangOutFormApi,
  type MutasiCabangForm,
  type SkuOption,
} from "@/api/transaksi/mutasiCabangOutFormApi";
import { useAuthStore } from "@/stores/authStore";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();
const authStore = useAuthStore();

const MENU_ID = "15"; // frmMutasiCabang — Mutasi Cabang Out
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

const emptyForm = (): MutasiCabangForm => ({
  isEdit: false,
  nomor: "",
  tanggal: todayLocal(),
  cabangAsal: String(authStore.userCabang || "00"),
  cabangTujuan: "",
  gudang: "",
  keterangan: "",
  detail: [],
});

const form = ref<MutasiCabangForm>(emptyForm());

// ── Lookup ───────────────────────────────────────────────────────────
const cabangOptions = ref<{ kode: string; nama: string }[]>([]);
const gudangOptions = ref<{ kode: string; nama: string }[]>([]);

const loadOptions = async () => {
  try {
    const [cbg, gdg] = await Promise.all([
      mutasiCabangOutFormApi.getCabang(),
      mutasiCabangOutFormApi.getGudang(form.value.cabangAsal),
    ]);
    cabangOptions.value = cbg;
    gudangOptions.value = gdg;
    if (gdg.length === 1) form.value.gudang = gdg[0].kode;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data cabang/gudang.");
  }
};

const loadNomor = async () => {
  const cabangAsal = form.value.cabangAsal;
  if (!cabangAsal) return;
  try {
    form.value.nomor = await mutasiCabangOutFormApi.getNomor(
      form.value.tanggal,
      cabangAsal
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal generate nomor mutasi.");
  }
};

// ── Modal SKU ────────────────────────────────────────────────────────
const showSkuModal = ref(false);
const skuOptions = ref<SkuOption[]>([]);
const skuLoading = ref(false);
const activeIdx = ref(-1);

const searchSku = async (q: string) => {
  if (!form.value.gudang) {
    toast.warning("Pilih gudang terlebih dahulu.");
    return;
  }
  skuLoading.value = true;
  try {
    skuOptions.value = await mutasiCabangOutFormApi.searchSKU(
      form.value.gudang,
      q || ""
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mencari barang.");
  } finally {
    skuLoading.value = false;
  }
};

const openSkuModal = (idx: number) => {
  if (!form.value.gudang) {
    toast.warning("Pilih gudang terlebih dahulu.");
    return;
  }
  activeIdx.value = idx;
  showSkuModal.value = true;
  searchSku("");
};

const selectSku = (item: SkuOption | null) => {
  if (!item) return;
  const idx = activeIdx.value;

  // Duplikat (SKU + expired harus unik)
  const duplicate = form.value.detail.find(
    (d, i) => i !== idx && d.sku === item.sku && d.expired === (item.expired || "")
  );
  if (duplicate) {
    toast.warning("Barang dengan expired yang sama sudah ada di daftar.");
    return;
  }

  if (form.value.detail[idx]) {
    const d = form.value.detail[idx];
    d.sku = item.sku;
    d.namaBarang = item.namaBarang;
    d.satuan = item.satuan;
    d.expired = item.expired || "";
    d.stok = Number(item.stok);
    d.harga = Number(item.harga);
  } else {
    form.value.detail.push({
      sku: item.sku,
      namaBarang: item.namaBarang,
      satuan: item.satuan,
      qty: 0,
      expired: item.expired || "",
      keterangan: "",
      harga: Number(item.harga),
      gudang: form.value.gudang,
      stok: Number(item.stok),
    });
    activeIdx.value = form.value.detail.length - 1;
  }
  showSkuModal.value = false;
};

const removeRow = (idx: number) => form.value.detail.splice(idx, 1);

const openTambahDetail = () => openSkuModal(form.value.detail.length);

watch(() => form.value.tanggal, () => {
  if (!isEdit.value) loadNomor();
});

watch(
  () => form.value.cabangAsal,
  (val, old) => {
    if (val === old) return;
    if (!isEdit.value) {
      // nomor mengikuti prefix cabang asal
      loadNomor();
      // daftar gudang ikut cabang asal
      mutasiCabangOutFormApi
        .getGudang(form.value.cabangAsal)
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

// ── Validasi qty terhadap stok ───────────────────────────────────────
const showModal = (msg: string) => toast.warning(msg);

const validateSave = () => {
  if (!form.value.cabangAsal) return showModal("Cabang asal belum dipilih.");
  if (!form.value.cabangTujuan)
    return showModal("Cabang tujuan belum dipilih.");
  if (form.value.cabangTujuan === form.value.cabangAsal)
    return showModal("Cabang asal tidak boleh sama dengan cabang tujuan.");
  if (!form.value.gudang) return showModal("Gudang belum dipilih.");
  if (form.value.detail.length === 0)
    return showModal("Minimal masukkan satu item barang.");
  for (const [i, d] of form.value.detail.entries()) {
    if (!d.sku) return showModal(`Baris ${i + 1}: barang belum dipilih.`);
    if ((d.qty || 0) <= 0)
      return showModal(`Jumlah untuk "${d.namaBarang}" harus lebih dari 0.`);
    if (Number(d.qty) > Number(d.stok || 0))
      return showModal(
        `Jumlah "${d.namaBarang}" melebihi stok di gudang (stok: ${d.stok}).`
      );
  }
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const res = await mutasiCabangOutFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
      nomor: form.value.nomor,
    });
    toast.success(`Mutasi Out ${res.data?.nomor || form.value.nomor} berhasil disimpan.`);
    showSaveDialog.value = false;
    const targetPath = route.path;
    router.push({ name: "MutasiOut" });
    await nextTick();
    tabsStore.closeTab(targetPath);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan mutasi cabang.");
  } finally {
    isSaving.value = false;
  }
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  router.push({ name: "MutasiOut" });
};

const confirmClose = async () => {
  showCloseDialog.value = false;
  const targetPath = route.path;
  router.push({ name: "MutasiOut" });
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
    const res = await mutasiCabangOutFormApi.getForm(decodeURIComponent(nomor));
    form.value = {
      ...res,
      isEdit: true,
      nomor: res.nomor || nomor,
      cabangAsal: String(authStore.userCabang || "00") === "00"
        ? res.cabangAsal
        : String(authStore.userCabang),
    };
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengambil data mutasi.");
    router.push({ name: "MutasiOut" });
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
    :title="isEdit ? 'Ubah Mutasi Cabang Out' : 'Mutasi Cabang Out Baru'"
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
            <label class="f-lbl">No. Mutasi</label>
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
            <label class="f-lbl">Cabang Asal</label>
            <select
              v-model="form.cabangAsal"
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

          <div class="f-row">
            <label class="f-lbl">Cabang Tujuan <span class="req-arrow" style="color: red">*</span></label>
            <select v-model="form.cabangTujuan" class="f-inp">
              <option value="" disabled>-- Pilih Cabang --</option>
              <option
                v-for="c in cabangOptions.filter((x) => x.kode !== form.cabangAsal)"
                :key="c.kode"
                :value="c.kode"
              >
                {{ c.kode }} - {{ c.nama }}
              </option>
            </select>
          </div>

          <div class="f-row full-col">
            <label class="f-lbl">Gudang Asal <span style="color: red">*</span></label>
            <select v-model="form.gudang" class="f-inp">
              <option value="" disabled>-- Pilih Gudang --</option>
              <option v-for="g in gudangOptions" :key="g.kode" :value="g.kode">
                {{ g.kode }} - {{ g.nama }}
              </option>
            </select>
          </div>
        </div>

        <div class="f-row align-start mt-1">
          <label class="f-lbl mt-1">Keterangan</label>
          <textarea
            v-model="form.keterangan"
            class="f-txa"
            rows="2"
            placeholder="Catatan mutasi..."
          ></textarea>
        </div>
      </div>

      <div class="header-summary">
        <div class="summary-box">
          <div class="summary-lbl">TOTAL QTY</div>
          <div class="summary-val">
            {{
              fmtQty(
                form.detail.reduce((s, d) => s + (Number(d.qty) || 0), 0)
              )
            }}
          </div>
          <div class="summary-sub">{{ form.detail.length }} item barang</div>
        </div>
      </div>
    </div>

    <!-- ── Tabel Detail ────────────────────────────────────────────── -->
    <div class="detail-section mt-4">
      <div class="section-title mb-2 flex justify-between align-center">
        <span>Detail Barang (Gudang {{ form.gudang || "-" }})</span>
        <v-btn
          size="small"
          color="primary"
          variant="flat"
          :disabled="!form.gudang"
          @click="openTambahDetail"
        >
          <template #prepend><IconPlus :size="14" /></template>
          Tambah Detail
        </v-btn>
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
              <th style="width: 80px" class="tr">STOK</th>
              <th style="width: 180px">KETERANGAN ✎</th>
              <th class="tc" style="width: 40px">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="form.detail.length === 0">
              <td colspan="9" class="tc pa-6 text-grey italic">
                Belum ada item barang ditambahkan. Klik "+ Tambah Detail".
              </td>
            </tr>
            <tr v-for="(row, idx) in form.detail" :key="idx">
              <td class="tc text-grey-darken-1 font-weight-bold">{{ idx + 1 }}</td>
              <td>
                <span class="mono">{{ row.sku }}</span>
              </td>
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
                  :min="0"
                  :max="row.stok"
                />
              </td>
              <td class="tc">{{ row.satuan }}</td>
              <td class="tc mono">{{ row.expired || "-" }}</td>
              <td class="tr text-grey">{{ fmtQty(row.stok || 0) }}</td>
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
              <td colspan="5"></td>
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
          Simpan Mutasi Cabang Out <strong>{{ form.nomor }}</strong>?<br />
          Dari <strong>{{ cabangNama(form.cabangAsal) }}</strong> ke
          <strong>{{ cabangNama(form.cabangTujuan) }}</strong
          >, gudang <strong>{{ form.gudang }}</strong
          >?<br />
          <span class="text-caption text-grey"
            >Total qty:
            {{
              fmtQty(form.detail.reduce((s, d) => s + (Number(d.qty) || 0), 0))
            }}
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

    <!-- ── SearchModal Gudang   (tidak dipakai—select langsung) ───── -->
    <!-- ── SearchModal SKU ────────────────────────────────────────── -->
    <SearchModal
      v-model="showSkuModal"
      title="Pilih Barang (Stok Gudang Asal)"
      :columns="[
        { key: 'sku', title: 'SKU', width: '90px' },
        { key: 'expired', title: 'EXPIRED', width: '100px', align: 'center' },
        { key: 'namaBarang', title: 'NAMA BARANG' },
        { key: 'satuan', title: 'SAT', width: '60px', align: 'center' },
        { key: 'stok', title: 'STOK', width: '70px', align: 'right' },
      ]"
      :items="skuOptions"
      :loading="skuLoading"
      :server-search="true"
      search-placeholder="Cari kode atau nama barang..."
      :search-keys="['sku', 'namaBarang']"
      @select="selectSku"
      @search="searchSku"
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
.full-col {
  grid-column: 1 / -1;
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
.align-start {
  align-items: flex-start !important;
}
.f-lbl {
  width: 110px;
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  flex-shrink: 0;
}
.f-inp,
.f-txa {
  flex: 1;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
}
.f-txa {
  height: auto;
  padding: 4px 8px;
}
.f-inp:focus,
.f-txa:focus {
  border-color: #1976d2;
}
.readonly-bg {
  background: #f3f4f6;
  color: #6b7280;
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

.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.align-center {
  align-items: center;
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
.mt-1 {
  margin-top: 4px;
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
