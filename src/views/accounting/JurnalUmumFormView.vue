<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { useTabsStore } from "@/stores/tabsStore";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import { IconBook, IconSearch, IconPlus, IconTrash } from "@tabler/icons-vue";
import {
  jurnalUmumFormApi,
  type JurnalUmumFormDetail,
} from "@/api/accounting/jurnalUmumFormApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();

const MENU_ID = "26";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const savedNomor = ref("");

const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  tanggal: today,
  keterangan: "",
  detail: [] as JurnalUmumFormDetail[],
});

const originalForm = ref<any>(null);

// ── Lookup ─────────────────────────────────────────────────────────────
const accountAllOptions = ref<{ kode: string; nama: string; kol_id: string }[]>(
  [],
);

// ── Total Debet & Kredit ──────────────────────────────────────────────
const totalDebet = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.debet) || 0), 0),
);
const totalKredit = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.kredit) || 0), 0),
);
const isBalance = computed(() => totalDebet.value === totalKredit.value);
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const formatNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const onDebetInput = (d: JurnalUmumFormDetail, e: Event) => {
  d.debet = parseNum((e.target as HTMLInputElement).value);
};
const onDebetBlur = (d: JurnalUmumFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.debet);
};
const onDebetFocus = (d: JurnalUmumFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = d.debet ? String(d.debet) : "";
};

const onKreditInput = (d: JurnalUmumFormDetail, e: Event) => {
  d.kredit = parseNum((e.target as HTMLInputElement).value);
};
const onKreditBlur = (d: JurnalUmumFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.kredit);
};
const onKreditFocus = (d: JurnalUmumFormDetail, e: Event) => {
  (e.target as HTMLInputElement).value = d.kredit ? String(d.kredit) : "";
};

// ── onMounted ─────────────────────────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    accountAllOptions.value = await jurnalUmumFormApi.getAccountAll();

    if (!isEdit.value) {
      addRow();
    } else {
      const d = await jurnalUmumFormApi.getDetailForm(
        decodeURIComponent(route.params.nomor as string),
      );
      Object.assign(form.value, d);
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      await nextTick();
    }
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Account Modal ─────────────────────────────────────────────────────
const showAccountModal = ref(false);
const activeAccIdx = ref(-1);

const openAccountModal = (idx: number) => {
  activeAccIdx.value = idx;
  showAccountModal.value = true;
};
const selectAccount = (acc: any) => {
  if (activeAccIdx.value < 0) return;
  const d = form.value.detail[activeAccIdx.value];
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showAccountModal.value = false;
};

// ── Baris Detail ──────────────────────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    uraian: "",
    debet: 0,
    kredit: 0,
    rekkode: "",
    reknama: "",
  });
};
const removeRow = (idx: number) => {
  form.value.detail.splice(idx, 1);
};

// Tab form di-cache KeepAlive: saat tab "Tambah Jurnal Umum" diaktifkan
// lagi, onMounted tidak berjalan ulang — kosongkan form di sini supaya
// inputan transaksi sebelumnya tidak tersisa di jurnal berikutnya.
onActivated(() => {
  if (!route.params.nomor) {
    resetCounter.value++;
    resetForm();
  }
});

// ── Validasi F10 Delphi ───────────────────────────────────────────────
const validateSave = () => {
  if (!form.value.keterangan.trim()) {
    toast.warning("Keterangan harus diisi.");
    return;
  }

  // Delphi: cek reknama per baris (bukan uraian)
  for (const d of form.value.detail) {
    if (!d.reknama) {
      toast.warning("Nama Account harus diisi.");
      return;
    }
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  const formPath = route.path;
  try {
    const res = await jurnalUmumFormApi.save({
      ...form.value,
      isEdit: isEdit.value,
    });
    savedNomor.value = res.data.nomor;
    showSaveDialog.value = false;
    toast.success(`Berhasil disimpan. Nomor: ${savedNomor.value}`);
    await router.push({ name: "AccountingJurnalUmumBrowse" });
    tabsStore.closeTab(formPath);
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

// ── Reset Form ────────────────────────────────────────────────────────
// resetCounter dipakai di :key baris detail supaya semua input ter-render
// ulang saat form dikosongkan (tidak ada DOM lama yang tersisa).
const resetCounter = ref(0);
const resetForm = () => {
  form.value = {
    nomor: "",
    tanggal: today,
    keterangan: "",
    detail: [],
  };
  addRow();
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalForm.value) {
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  } else {
    resetCounter.value++;
    resetForm();
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "AccountingJurnalUmumBrowse" });
};
</script>

<template>
  <BaseForm
    title="Jurnal Umum"
    :menu-id="MENU_ID"
    :icon="IconBook"
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
        <!-- Informasi Jurnal -->
        <fieldset class="pl-groupbox">
          <legend class="pl-legend">Informasi Jurnal</legend>
          <div class="pl-groupbody">
            <div class="f-row">
              <label class="f-lbl">Nomor Jurnal</label>
              <div class="search-group">
                <input
                  :value="isEdit ? form.nomor : ''"
                  class="f-inp readonly-bg mono"
                  :placeholder="isEdit ? '' : 'Otomatis'"
                  readonly
                />
                <span v-if="!isEdit" class="badge-info">Auto</span>
              </div>
            </div>
            <div class="f-row">
              <label class="f-lbl">Tanggal</label>
              <input v-model="form.tanggal" type="date" class="f-inp" />
            </div>
            <div class="f-row">
              <label class="f-lbl">Keterangan <span class="req">*</span></label>
              <input
                v-model="form.keterangan"
                class="f-inp"
                placeholder="Keterangan jurnal"
              />
            </div>
          </div>
        </fieldset>

        <!-- Total Jurnal -->
        <fieldset class="pl-groupbox">
          <legend class="pl-legend">Total Jurnal</legend>
          <div class="pl-groupbody">
            <div class="f-row">
              <label class="f-lbl">Total Debet</label>
              <span class="total-side-val">{{ fmt(totalDebet) }}</span>
            </div>
            <div class="f-row">
              <label class="f-lbl">Total Kredit</label>
              <span class="total-side-val">{{ fmt(totalKredit) }}</span>
            </div>
            <div class="balance-row" :class="isBalance ? 'balanced' : 'unbalanced'">
              <span>{{ isBalance ? "✓ Balance" : "✗ Tidak Balance" }}</span>
              <span v-if="!isBalance" style="font-size: 10px">
                Selisih: {{ fmt(Math.abs(totalDebet - totalKredit)) }}
              </span>
            </div>
          </div>
        </fieldset>
      </div>

      <!-- ═══ DETAIL GRID ═══ -->
      <fieldset class="pl-groupbox pl-detail-group">
        <legend class="pl-legend">Detail Jurnal</legend>
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
                <th style="min-width: 200px">Nama Account</th>
                <th style="min-width: 180px">Uraian</th>
                <th style="width: 120px" class="tr">Debet</th>
                <th style="width: 120px" class="tr">Kredit</th>
                <th style="width: 30px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="resetCounter + '-' + idx"
              >
                <td class="tc row-no">{{ idx + 1 }}</td>
                <td>
                  <div class="cell-search">
                    <input
                      :value="d.rekkode"
                      class="cell-inp readonly-bg tc"
                      readonly
                      placeholder="Kode"
                    />
                    <button
                      class="cell-btn"
                      type="button"
                      @click="openAccountModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td>
                  <span
                    class="cell-muted"
                    :class="{ 'text-error': !d.reknama }"
                    style="white-space: nowrap"
                  >
                    {{ d.reknama || "(wajib)" }}
                  </span>
                </td>
                <td>
                  <input
                    v-model="d.uraian"
                    class="cell-inp"
                    placeholder="Keterangan baris"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    :value="formatNum(d.debet)"
                    @focus="onDebetFocus(d, $event)"
                    @input="onDebetInput(d, $event)"
                    @blur="onDebetBlur(d, $event)"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    :value="formatNum(d.kredit)"
                    @focus="onKreditFocus(d, $event)"
                    @input="onKreditInput(d, $event)"
                    @blur="onKreditBlur(d, $event)"
                  />
                </td>
                <td class="tc">
                  <button
                    class="btn-del"
                    type="button"
                    title="Hapus baris"
                    @click="removeRow(idx)"
                  >
                    <IconTrash :size="12" />
                  </button>
                </td>
              </tr>
              <tr v-if="form.detail.length === 0">
                <td colspan="7" class="empty-state">Belum ada detail.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4" class="tc total-label">TOTAL</td>
                <td class="tr total-value">{{ fmt(totalDebet) }}</td>
                <td class="tr total-value">{{ fmt(totalKredit) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </fieldset>
    </div>
  </BaseForm>

  <!-- ── Modal: Account ── -->
  <SearchModal
    v-model="showAccountModal"
    title="Pilih Account"
    :columns="[
      { key: 'kode', title: 'Kode', width: '100px' },
      { key: 'nama', title: 'Nama Account' },
    ]"
    :items="accountAllOptions"
    search-placeholder="Cari account..."
    :search-keys="['kode', 'nama']"
    @select="selectAccount"
  />
</template>

<style scoped>
/* ═══ Jurnal Umum Form — matches PenerimaanLain / PembayaranLain style ═══ */

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

.mono {
  font-family: monospace;
}

.text-right { text-align: right; }

/* ── Search Group / badge ─────────────────────────────────────── */
.search-group {
  display: flex;
  flex: 1;
  max-width: 400px;
  gap: 2px;
  align-items: center;
}

.badge-info {
  font-size: 10px;
  font-weight: 700;
  color: #f57c00;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 4px;
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Total samping ────────────────────────────────────────────── */
.total-side-val {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ds-primary-dark, #2C4472);
}

.balance-row {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--ds-border, #A0AAB8);
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
}

.balanced {
  color: #3B5998;
}

.unbalanced {
  color: #c62828;
}

.text-error {
  color: #c62828 !important;
  font-style: italic;
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