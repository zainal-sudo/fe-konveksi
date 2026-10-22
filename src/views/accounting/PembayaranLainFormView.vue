<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import { IconCashOff, IconSearch, IconPlus, IconTrash } from "@tabler/icons-vue";
import {
  pembayaranLainFormApi,
  type PembayaranLainForm,
  type PembayaranLainDetail,
} from "@/api/accounting/pembayaranLainFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const tabsStore = useTabsStore();

const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);
const isLocked = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

const today = new Date().toISOString().slice(0, 10);

// ── Form State ───────────────────────────────────────────────────────
const form = ref<PembayaranLainForm>({
  isEdit: false,
  nomor: "",
  tanggal: today,
  keterangan: "",
  nilai: 0,
  account: "",
  namaAccount: "",
  tipe: "KK",
  detail: [],
});

// ── Lookup Options ───────────────────────────────────────────────────
const accountOptions = ref<{ kode: string; nama: string }[]>([]);
const accountLoading = ref(false);

// ── Modal State ──────────────────────────────────────────────────────
const showAccountModal = ref(false);
const showAccountModalDetail = ref(false);
const activeDetailIndex = ref(-1);

// ── Load Data ────────────────────────────────────────────────────────
const loadData = async () => {
  const nomor = route.params.nomor as string;
  if (!nomor) {
    form.value = {
      isEdit: false,
      nomor: "",
      tanggal: today,
      keterangan: "",
      nilai: 0,
      account: "",
      namaAccount: "",
      tipe: form.value.tipe || "KK",
      detail: [],
    };
    isLocked.value = false;
    await loadMaxNomor();
    addRow();
    return;
  }

  isLoading.value = true;
  try {
    const data = await pembayaranLainFormApi.getDetailForm(decodeURIComponent(nomor));
    form.value = {
      ...form.value,
      ...data,
      isEdit: true,
      nomor: data.nomor || nomor,
    };
    // Paritas Delphi: IsClosed = 'Sudah' → disable simpan
    isLocked.value = !!data.locked || route.query.locked === "1";
    if (isLocked.value) {
      toast.warning("Transaksi ini sudah tutup Periode,Tidak dapat di edit");
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message || "Gagal memuat data pembayaran lain.");
    router.push({ name: "AccountingPembayaranLainBrowse" });
  } finally {
    isLoading.value = false;
  }
};

const loadMaxNomor = async () => {
  try {
    // Paritas Delphi getmaxkode: prefix pakai KODE cabang (bukan nama)
    const cabang = authStore.userCabang || "01";
    form.value.nomor = await pembayaranLainFormApi.getMaxNomor(
      form.value.tanggal,
      cabang,
      form.value.tipe
    );
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error("Gagal generate nomor.");
  }
};

// ── Radio Kas/Bank ──────────────────────────────────────────────────
const onTipeChange = async () => {
  form.value.account = "";
  form.value.namaAccount = "";
  if (!form.value.isEdit) {
    await loadMaxNomor();
  }
};

// ── Search Account (Header) ──────────────────────────────────────────
const searchAccountHeader = async (query: string) => {
  accountLoading.value = true;
  try {
    accountOptions.value = await pembayaranLainFormApi.searchAccount(
      query || "",
      form.value.tipe
    );
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error("Gagal mencari account.");
  } finally {
    accountLoading.value = false;
  }
};

const openAccountModal = () => {
  showAccountModal.value = true;
  searchAccountHeader("");
};

const selectAccountHeader = (item: any) => {
  form.value.account = item.kode;
  form.value.namaAccount = item.nama;
  showAccountModal.value = false;
};

// ── Search Account (Detail) ──────────────────────────────────────────
const searchAccountDetail = async (query: string) => {
  accountLoading.value = true;
  try {
    accountOptions.value = await pembayaranLainFormApi.searchAccount(query || "", "ALL");
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error("Gagal mencari account.");
  } finally {
    accountLoading.value = false;
  }
};

const openAccountModalDetail = (idx: number) => {
  activeDetailIndex.value = idx;
  showAccountModalDetail.value = true;
  searchAccountDetail("");
};

const selectAccountDetail = (item: any) => {
  const idx = activeDetailIndex.value;
  if (idx < 0 || !form.value.detail[idx]) return;

  form.value.detail[idx].account = item.kode;
  form.value.detail[idx].accountName = item.nama;
  showAccountModalDetail.value = false;
};

// ── Detail Grid ──────────────────────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    account: "",
    accountName: "",
    nilai: 0,
    memo: "",
    costCenter: "",
    customer: "",
    kendaraan: "",
    kilometer: 0,
    ekspedisi: "",
  });
};

const removeRow = (idx: number) => {
  form.value.detail.splice(idx, 1);
  form.value.detail.forEach((d, i) => (d.no = i + 1));
};

// ── Validasi ─────────────────────────────────────────────────────────
const validateSave = async () => {
  // Paritas Delphi: transaksi tutup periode tidak boleh disimpan
  if (isLocked.value) {
    toast.warning("Transaksi ini sudah tutup Periode,Tidak dapat di edit");
    return;
  }
  // Paritas Delphi cxButton1/2Click: cekTutupPeriode sebelum simpan
  try {
    if (await pembayaranLainFormApi.cekPeriode(form.value.tanggal)) {
      toast.warning("Periode ini sudah di tutup.");
      return;
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
  }
  if (!form.value.account) {
    toast.warning("Account belum dipilih.");
    return;
  }

  let totalDebet = 0;
  for (let i = 0; i < form.value.detail.length; i++) {
    const d = form.value.detail[i];
    if (!d.account) {
      toast.warning(`Account baris ${i + 1} belum dipilih.`);
      return;
    }
    if (Number(d.nilai) > 0) {
      totalDebet += Number(d.nilai);
    }
  }

  if (totalDebet !== Number(form.value.nilai)) {
    toast.warning("Nilai debet dan kredit tidak sama.");
    return;
  }

  showSaveDialog.value = true;
};

// ── Save ─────────────────────────────────────────────────────────────
const confirmSave = async () => {
  isSaving.value = true;
  const formPath = route.path;
  try {
    await pembayaranLainFormApi.save(form.value);
    showSaveDialog.value = false;
    toast.success("Data pembayaran lain berhasil disimpan.");
    await router.push({ name: "AccountingPembayaranLainBrowse" });
    tabsStore.closeTab(formPath);
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

// ── Navigation ───────────────────────────────────────────────────────
const confirmCancel = () => {
  showCancelDialog.value = false;
  router.push({ name: "AccountingPembayaranLainBrowse" });
};

const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "AccountingPembayaranLainBrowse" });
};

// ── Init ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadData();
});

// KeepAlive: saat kembali ke tab form yang sama (create), onMounted tidak
// dijalankan ulang — reset state di sini agar inputan lama tidak tersisa.
onActivated(async () => {
  if (!route.params.nomor) {
    await loadData();
  }
});

// ── Formatting ───────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const totalNilai = computed(() =>
  form.value.detail.reduce((sum, d) => sum + (Number(d.nilai) || 0), 0)
);

// ── Formatted Number Input (same as DOFormView) ──────────────────────
const rawInputValues: Record<string, string> = {};

const getInputValue = (key: string, modelValue: number, decimals = 0) => {
  if (key in rawInputValues) return rawInputValues[key];
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(modelValue || 0);
};

const startEdit = (key: string, e: Event, raw: number) => {
  rawInputValues[key] = String(raw);
  (e.target as HTMLInputElement).value = String(raw);
};

const endEdit = (key: string, e: Event, raw: number, decimals = 0) => {
  delete rawInputValues[key];
  (e.target as HTMLInputElement).value = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(raw || 0);
};

const onNilaiInput = (e: Event, d: any, idx: number, field: string) => {
  const el = e.target as HTMLInputElement;
  rawInputValues[field + '-' + idx] = el.value;
  d[field] = Number(el.value.replace(/,/g, '')) || 0;
};
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Pembayaran Lain-Lain' : 'Tambah Pembayaran Lain-Lain Baru'"
    :icon="IconCashOff"
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
    <div class="pl-layout">
      <!-- ═══ HEADER ═══ -->
      <div class="pl-header-grid">
        <!-- Account Info -->
        <fieldset class="pl-groupbox">
          <legend class="pl-legend">Informasi Account</legend>
          <div class="pl-groupbody">
            <div class="f-row">
              <label class="f-lbl">Account <span class="req">*</span></label>
              <div class="search-group">
                <input :value="form.account" class="f-inp readonly-bg" readonly placeholder="Kode" />
                <input :value="form.namaAccount" class="f-inp readonly-bg" style="flex:2" readonly placeholder="Nama account..." />
                <button class="btn-search" type="button" @click="openAccountModal">
                  <IconSearch :size="13" />
                </button>
              </div>
            </div>
            <div class="f-row">
              <label class="f-lbl">Memo</label>
              <input v-model="form.keterangan" class="f-inp" placeholder="Keterangan..." />
            </div>
            <div class="f-row">
              <label class="f-lbl">Nilai <span class="req">*</span></label>
              <input type="text" inputmode="numeric" class="f-inp text-right" style="max-width:200px" :value="getInputValue('header-nilai', form.nilai, 0)" @focus="startEdit('header-nilai', $event, form.nilai)" @input="rawInputValues['header-nilai'] = ($event.target as HTMLInputElement).value; form.nilai = Number(($event.target as HTMLInputElement).value.replace(/,/g, '')) || 0" @blur="endEdit('header-nilai', $event, form.nilai, 0)" />
            </div>
          </div>
        </fieldset>

        <!-- Transaksi Info -->
        <fieldset class="pl-groupbox">
          <legend class="pl-legend">Informasi Transaksi</legend>
          <div class="pl-groupbody">
            <div class="f-row">
              <label class="f-lbl">Nomor</label>
              <input :value="form.nomor" class="f-inp readonly-bg" readonly />
            </div>
            <div class="f-row">
              <label class="f-lbl">Tanggal</label>
              <input v-model="form.tanggal" type="date" class="f-inp" />
            </div>
            <div class="f-row check-row">
              <label class="radio-lbl">
                <input v-model="form.tipe" type="radio" value="KK" @change="onTipeChange" :disabled="isEdit" /> Kas
              </label>
              <label class="radio-lbl">
                <input v-model="form.tipe" type="radio" value="BK" @change="onTipeChange" :disabled="isEdit" /> Bank
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      <!-- ═══ DETAIL GRID ═══ -->
      <fieldset class="pl-groupbox pl-detail-group">
        <legend class="pl-legend">Detail Pembayaran</legend>
        <div class="pl-detail-actions">
          <button class="btn-add-row" type="button" @click="addRow">
            <IconPlus :size="13" /> Tambah Baris
          </button>
        </div>
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 36px" class="tc">No</th>
                <th style="width: 95px">Account</th>
                <th style="min-width: 200px">Account Name</th>
                <th style="width: 120px" class="tr">Nilai</th>
                <th style="width: 200px">Keterangan</th>
                <th style="width: 30px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in form.detail" :key="idx">
                <td class="tc row-no">{{ idx + 1 }}</td>
                <td>
                  <div class="cell-search">
                    <input :value="d.account" class="cell-inp readonly-bg tc" readonly />
                    <button class="cell-btn" type="button" @click="openAccountModalDetail(idx)">
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="cell-muted">{{ d.accountName }}</td>
                <td>
                  <input type="text" inputmode="numeric" class="cell-inp tr" :value="getInputValue('nilai-' + idx, d.nilai, 0)" @focus="startEdit('nilai-' + idx, $event, d.nilai)" @input="onNilaiInput($event, d, idx, 'nilai')" @blur="endEdit('nilai-' + idx, $event, d.nilai, 0)" />
                </td>
                <td><input v-model="d.memo" class="cell-inp" /></td>
                <td class="tc">
                  <button class="btn-del" type="button" title="Hapus baris" @click="removeRow(idx)">
                    <IconTrash :size="12" />
                  </button>
                </td>
              </tr>
              <tr v-if="form.detail.length === 0">
                <td colspan="6" class="empty-state">Belum ada detail.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" class="tc total-label">TOTAL</td>
                <td class="tr total-value">{{ fmt(totalNilai) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </fieldset>
    </div>
  </BaseForm>

  <!-- ═══ MODAL SEARCH ACCOUNT (HEADER) ═══ -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Account"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="accountOptions"
    :loading="accountLoading"
    :server-search="true"
    search-placeholder="Cari account..."
    @select="selectAccountHeader"
    @search="searchAccountHeader"
  />

  <!-- ═══ MODAL SEARCH ACCOUNT (DETAIL) ═══ -->
  <SearchModal
    v-model="showAccountModalDetail"
    title="Pilih Account"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="accountOptions"
    :loading="accountLoading"
    :server-search="true"
    search-placeholder="Cari account..."
    @select="selectAccountDetail"
    @search="searchAccountDetail"
  />
</template>

<style scoped>
/* ═══ Pembayaran Lain Form — matches DOFormView / SOFormView ═══ */

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--ds-primary, #3B5998);
  outline-offset: 0;
}

.pl-layout {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  height: 100%;
  overflow: hidden;
}

.pl-header-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 6px;
  flex-shrink: 0;
}

/* ── Group Box (fieldset) ────────────────────────────────────── */
.pl-groupbox {
  border: 1px solid var(--ds-border, #A0AAB8);
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.pl-legend {
  font-size: 11px;
  font-weight: 700;
  color: var(--ds-primary, #3B5998);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  margin-left: 6px;
  background: var(--ds-surface, #F0F3F8);
  border: 1px solid var(--ds-border, #A0AAB8);
  border-bottom: none;
  align-self: flex-start;
  line-height: 1.4;
}

.pl-groupbody {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ── Detail Group ────────────────────────────────────────────── */
.pl-detail-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pl-detail-actions {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  border-bottom: 1px solid var(--ds-border, #A0AAB8);
  background: var(--ds-surface, #F0F3F8);
}

/* ── Field Row ────────────────────────────────────────────────── */
.f-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.f-lbl {
  width: 80px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-text-secondary, #5A6A7E);
}

.req { color: #c62828; }

/* ── Input (sunken desktop style) ─────────────────────────────── */
.f-inp {
  flex: 1;
  max-width: 400px;
  height: 24px;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  background: white;
  color: var(--ds-text, #1B2D4A);
}

.f-inp:focus {
  border-color: var(--ds-primary, #3B5998);
}

.readonly-bg {
  background: var(--ds-surface-inset, #E0E4EA);
  color: #3D4F6A;
}

.text-right { text-align: right; }

/* ── Search Group ─────────────────────────────────────────────── */
.search-group {
  display: flex;
  flex: 1;
  max-width: 400px;
  gap: 2px;
}

.btn-search {
  height: 24px;
  width: 26px;
  background: var(--ds-primary, #3B5998);
  color: white;
  border: 1px solid var(--ds-primary-dark, #2C4472);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-search:hover {
  background: var(--ds-primary-dark, #2C4472);
}

/* ── Radio ────────────────────────────────────────────────────── */
.check-row {
  display: flex;
  gap: 16px;
}

.radio-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-text-secondary, #5A6A7E);
  cursor: pointer;
}

.radio-lbl input {
  accent-color: var(--ds-primary, #3B5998);
  width: 14px;
  height: 14px;
}

/* ── Detail Table ─────────────────────────────────────────────── */
.detail-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-top: 1px solid var(--ds-border, #A0AAB8);
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  font-weight: 500;
}

.detail-table thead tr {
  background: var(--ds-primary, #3B5998);
}

.detail-table th {
  color: white;
  font-weight: 700;
  padding: 4px 6px;
  white-space: nowrap;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-right: 1px solid var(--ds-primary-dark, #2C4472);
  border-bottom: 1px solid var(--ds-primary-dark, #2C4472);
}

.detail-table th:last-child {
  border-right: none;
}

.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid var(--ds-border-light, #C4CAD3);
  border-right: 1px solid var(--ds-border-light, #C4CAD3);
  vertical-align: middle;
  white-space: nowrap;
}

.detail-table td:last-child {
  border-right: none;
}

.detail-table tbody tr:nth-child(even) {
  background: var(--ds-surface, #F0F3F8);
}

.detail-table tbody tr:hover td {
  background: var(--ds-primary-50, #E8EDF5);
}

.row-no {
  color: var(--ds-text-muted, #8494A7);
  font-size: 10px;
}

.cell-muted {
  color: var(--ds-text, #1B2D4A);
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: var(--ds-text-muted, #8494A7);
  font-size: 11px;
  padding: 24px 12px;
  white-space: normal;
}

/* ── Total Row ────────────────────────────────────────────────── */
.total-row td {
  background: var(--ds-primary-50, #E8EDF5);
  border-top: 1px solid var(--ds-primary-dark, #2C4472);
  font-weight: 700;
  font-size: 11px;
  padding: 5px 6px;
}

.total-label {
  color: var(--ds-primary-dark, #2C4472);
}

.total-value {
  color: var(--ds-primary-dark, #2C4472);
}

/* ── Cell Input ───────────────────────────────────────────────── */
.cell-search {
  display: flex;
  gap: 2px;
}

.cell-inp {
  width: 100%;
  height: 20px;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-radius: 0;
  padding: 0 3px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}

.cell-inp:focus {
  border-color: var(--ds-primary, #3B5998);
}

.cell-inp.readonly-bg {
  cursor: default;
}

.cell-btn {
  height: 20px;
  width: 22px;
  background: var(--ds-primary, #3B5998);
  color: white;
  border: 1px solid var(--ds-primary-dark, #2C4472);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.cell-btn:hover {
  background: var(--ds-primary-dark, #2C4472);
}

.btn-add-row {
  height: 28px;
  padding: 0 14px;
  background: var(--ds-primary, #3B5998);
  color: white;
  border: 1px solid var(--ds-primary-dark, #2C4472);
  border-radius: 0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.btn-add-row:hover {
  background: var(--ds-primary-dark, #2C4472);
}

.btn-del {
  background: none;
  border: none;
  color: var(--ds-text-muted, #8494A7);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}

.btn-del:hover {
  background: #FEE2E2;
  color: #dc2626;
}

.tc { text-align: center; }
.tr { text-align: right; }

@media (max-width: 1024px) {
  .pl-header-grid {
    grid-template-columns: 1fr;
  }
}
</style>
