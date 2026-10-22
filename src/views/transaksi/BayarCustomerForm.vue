<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useTabsStore } from "@/stores/tabsStore";
import BaseForm from "@/components/BaseForm.vue";
import SearchModal from "@/components/SearchModal.vue";
import { IconCreditCard, IconSearch } from "@tabler/icons-vue";
import {
  bayarCustomerApi,
  type InvoicePiutang,
} from "@/api/transaksi/bayarCustomerApi";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();

const MENU_ID = "51";
const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);
const isPosted = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

// ── Tanggal safe ─────────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

// ── Form State (porting header ufrmBayarCustomer) ────────────────────
const form = ref({
  nomorBukti: "",
  tanggal: todayLocal(),
  cusKode: "",
  cusNama: "",
  cusAlamat: "",
  rekKode: "",
  rekNama: "",
  isPajak: false,
  catatan: "",
});

const listInvoice = ref<InvoicePiutang[]>([]);

// ── Load data: nomor otomatis (create) atau data edit ────────────────
const loadData = async () => {
  isLoading.value = true;
  try {
    if (isEdit.value) {
      const nomor = decodeURIComponent(route.params.nomor as string);
      const res = await bayarCustomerApi.getDetailForm(nomor);

      form.value.nomorBukti = res.nomorBukti;
      form.value.tanggal = res.tanggal;
      form.value.cusKode = res.cusKode;
      form.value.cusNama = res.cusNama;
      form.value.cusAlamat = res.cusAlamat || "";
      form.value.rekKode = res.rekKode;
      form.value.rekNama = res.rekNama;
      form.value.isPajak = Number(res.isPajak) === 1;
      form.value.catatan = res.catatan || "";
      isPosted.value = Number(res.isposting) === 1;

      listInvoice.value = res.listInvoice.map((inv: any) => ({
        ...inv,
        isChecked: !!Number(inv.isChecked),
        nilaiBayar: Number(inv.nilaiBayar) || 0,
        sisaPiutang: Number(inv.sisaPiutang) || 0,
      }));

      if (isPosted.value) {
        toast.warning("Transaksi ini sudah Posting, tidak dapat diubah.");
      }
    } else {
      // Reset total form lama (KeepAlive bisa menyimpan state input sebelumnya)
      form.value.nomorBukti = "";
      form.value.tanggal = todayLocal();
      form.value.cusKode = "";
      form.value.cusNama = "";
      form.value.cusAlamat = "";
      form.value.rekKode = "";
      form.value.rekNama = "";
      form.value.isPajak = false;
      form.value.catatan = "";
      listInvoice.value = [];
      isPosted.value = false;

      const init = await bayarCustomerApi.getInitData();
      form.value.nomorBukti = init.nomorOtomatis;
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    if (isEdit.value) router.push({ name: "BayarCustomerBrowse" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// Tab yang dibuka ulang (path sama) masih memakai instance lama dari
// KeepAlive — reload form saat aktif kembali di mode create
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  if (!route.params.nomor) loadData();
});

// ── Customer Modal ────────────────────────────────────────────────────
const showCustomerModal = ref(false);
const customerOptions = ref<any[]>([]);

const searchCustomer = async (q: string) => {
  customerOptions.value = await bayarCustomerApi.searchCustomer(q || "");
};

const selectCustomer = async (cus: any) => {
  if (!cus) return;
  form.value.cusKode = cus.kode;
  form.value.cusNama = cus.nama;
  form.value.cusAlamat = cus.alamat || "";
  showCustomerModal.value = false;
  listInvoice.value = [];
  try {
    listInvoice.value = await bayarCustomerApi.getInvoicePiutang(
      form.value.cusKode,
    );
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal memuat daftar piutang.",
    );
  }
};

// ── Modal Kas/Bank ────────────────────────────────────────────────────
const showRekeningModal = ref(false);
const rekeningOptions = ref<any[]>([]);

const searchRekening = async (q: string) => {
  rekeningOptions.value = await bayarCustomerApi.getRekeningOptions(q || "");
};

const selectRekening = (rek: any) => {
  if (!rek) return;
  form.value.rekKode = rek.KODE || rek.kode;
  form.value.rekNama = rek.NAMA || rek.nama;
  showRekeningModal.value = false;
};

// ── Grid (porting clStatus/pay + validasi clBayar Delphi) ─────────────
const handleCheckboxChange = (row: InvoicePiutang) => {
  row.nilaiBayar = row.isChecked ? row.sisaPiutang : 0;
};

const validateNilaiBayar = (row: InvoicePiutang) => {
  if (row.nilaiBayar > row.sisaPiutang) {
    toast.warning(
      `Pembayaran melebihi sisa piutang untuk nota ${row.invoiceNomor}`,
    );
    row.nilaiBayar = row.sisaPiutang;
  }
  if (row.nilaiBayar < 0) row.nilaiBayar = 0;
  row.isChecked = row.nilaiBayar > 0;
};

const grandTotalBayar = computed(() =>
  listInvoice.value.reduce(
    (acc, row) => acc + (row.isChecked ? Number(row.nilaiBayar || 0) : 0),
    0,
  ),
);

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID").format(v || 0);

// ── Validasi & Simpan (porting cekdata + simpandata Delphi) ───────────
const validateSave = () => {
  if (isPosted.value) {
    toast.warning("Transaksi ini sudah Posting, tidak dapat diubah.");
    return;
  }
  if (!form.value.cusKode) {
    toast.warning("Customer belum dipilih.");
    return;
  }
  if (!form.value.rekKode) {
    toast.warning("Rekening (Kas/Bank) belum dipilih.");
    return;
  }
  if (!listInvoice.value.some((r) => r.isChecked && r.nilaiBayar > 0)) {
    toast.warning("Pilih minimal satu nota yang ingin dibayar.");
    return;
  }
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  const formPath = route.path;
  try {
    const payload = {
      header: {
        ...form.value,
        isEdit: isEdit.value,
      },
      totalBayar: grandTotalBayar.value,
      details: listInvoice.value.filter((r) => r.isChecked && r.nilaiBayar > 0),
    };
    const res = await bayarCustomerApi.saveData(payload);
    toast.success(
      res.message ||
        `Pembayaran ${isEdit.value ? "berhasil diubah" : "berhasil disimpan"}.`,
    );
    showSaveDialog.value = false;
    await router.push({ name: "BayarCustomerBrowse" });
    tabsStore.closeTab(formPath);
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal menyimpan data.",
    );
  } finally {
    isSaving.value = false;
  }
};

// BATAL = reset form (mode baru) atau kembalikan ke data awal (mode edit)
const confirmCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value) {
    router.go(0);
  } else {
    form.value.cusKode = "";
    form.value.cusNama = "";
    form.value.cusAlamat = "";
    form.value.rekKode = "";
    form.value.rekNama = "";
    form.value.isPajak = false;
    form.value.catatan = "";
    listInvoice.value = [];
  }
};

// TUTUP = keluar ke browse
const confirmClose = () => {
  showCloseDialog.value = false;
  const formPath = route.path;
  router.push({ name: "BayarCustomerBrowse" }).then(() => {
    tabsStore.closeTab(formPath);
  });
};
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Pembayaran Customer' : 'Pembayaran Customer Baru'"
    :icon="IconCreditCard"
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
    <!-- ── Panel Header ────────────────────────────────────────────── -->
    <div class="panel-header">
      <div class="grid-cols-3">
        <!-- Kolom 1 -->
        <div class="column">
          <div class="f-row">
            <label class="f-lbl">No. Transaksi</label>
            <input
              type="text"
              v-model="form.nomorBukti"
              class="f-inp readonly-bg"
              readonly
              placeholder="[ OTOMATIS ]"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input
              type="date"
              v-model="form.tanggal"
              class="f-inp"
              :disabled="isPosted"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Customer</label>
            <div class="search-group">
              <input
                type="text"
                :value="form.cusKode"
                class="f-inp w-30 readonly-bg"
                readonly
                placeholder="Kode"
              />
              <input
                type="text"
                :value="form.cusNama"
                class="f-inp w-70 readonly-bg"
                readonly
                placeholder="Pilih Customer..."
              />
              <button
                class="btn-srch btn-blue"
                type="button"
                :disabled="isEdit || isPosted"
                @click="
                  showCustomerModal = true;
                  searchCustomer('');
                "
              >
                <IconSearch :size="14" />
              </button>
            </div>
          </div>
          <div class="f-row align-start">
            <label class="f-lbl mt-1">Alamat</label>
            <textarea
              :value="form.cusAlamat"
              class="f-area readonly-bg"
              rows="2"
              readonly
              placeholder="-"
            ></textarea>
          </div>
        </div>

        <!-- Kolom 2 -->
        <div class="column">
          <div class="f-row">
            <label class="f-lbl">Kas / Bank</label>
            <div class="search-group">
              <input
                type="text"
                :value="form.rekKode"
                class="f-inp w-30 readonly-bg"
                readonly
                placeholder="Kode"
              />
              <input
                type="text"
                :value="form.rekNama"
                class="f-inp w-70 readonly-bg"
                readonly
                placeholder="Pilih Kas/Bank..."
              />
              <button
                class="btn-srch btn-blue"
                type="button"
                :disabled="isPosted"
                @click="
                  showRekeningModal = true;
                  searchRekening('');
                "
              >
                <IconSearch :size="14" />
              </button>
            </div>
          </div>
          <div class="f-row">
            <label class="f-lbl">Pajak</label>
            <label class="chk-wrap">
              <input type="checkbox" v-model="form.isPajak" :disabled="isPosted" />
              <span>Termasuk Pajak (Faktur Pajak)</span>
            </label>
          </div>
        </div>

        <!-- Kolom 3 -->
        <div class="column">
          <div class="f-row align-start">
            <label class="f-lbl mt-1">Memo</label>
            <textarea
              v-model="form.catatan"
              class="f-area"
              rows="3"
              placeholder="Keterangan pembayaran..."
              :disabled="isPosted"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tabel Nota Piutang ──────────────────────────────────────── -->
    <div class="table-container mt-3">
      <table class="grid-table">
        <thead>
          <tr>
            <th style="width: 50px" class="tc">Pilih</th>
            <th style="width: 170px">No. Nota</th>
            <th style="width: 110px" class="tc">Tanggal</th>
            <th class="tr">Nilai Piutang</th>
            <th class="tr">Sudah Dibayar</th>
            <th class="tr">Sisa Piutang</th>
            <th style="width: 190px" class="tr">Nilai Pembayaran (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in listInvoice"
            :key="idx"
            :class="{ 'row-selected': row.isChecked }"
          >
            <td class="tc">
              <input
                type="checkbox"
                v-model="row.isChecked"
                :disabled="isPosted"
                @change="handleCheckboxChange(row)"
              />
            </td>
            <td><span class="mono">{{ row.invoiceNomor }}</span></td>
            <td class="tc">{{ row.invoiceTanggal }}</td>
            <td class="tr text-grey">Rp {{ fmtCurrency(row.invoiceNetto) }}</td>
            <td class="tr text-grey">
              Rp {{ fmtCurrency(row.invoiceNetto - row.sisaPiutang) }}
            </td>
            <td class="tr font-weight-bold text-error">
              Rp {{ fmtCurrency(row.sisaPiutang) }}
            </td>
            <td class="tr">
              <input
                type="number"
                v-model.number="row.nilaiBayar"
                @input="validateNilaiBayar(row)"
                class="cell-input"
                placeholder="0"
                :disabled="isPosted || (!row.isChecked && row.nilaiBayar === 0)"
              />
            </td>
          </tr>
          <tr v-if="listInvoice.length === 0">
            <td colspan="7" class="tc empty-text">
              {{
                form.cusKode
                  ? "Tidak ada nota piutang untuk customer ini."
                  : "Pilih customer untuk menampilkan daftar nota piutang."
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Footer Total ────────────────────────────────────────────── -->
    <div class="footer-summary mt-3">
      <div class="total-box">
        <span class="total-label">TOTAL PEMBAYARAN</span>
        <span class="total-val">Rp {{ fmtCurrency(grandTotalBayar) }}</span>
      </div>
    </div>

    <!-- ── SearchModal Customer ────────────────────────────────────── -->
    <SearchModal
      v-model="showCustomerModal"
      title="Pilih Customer"
      :columns="[
        { key: 'kode', title: 'KODE', width: '100px' },
        { key: 'nama', title: 'NAMA CUSTOMER', width: '200px' },
        { key: 'alamat', title: 'ALAMAT', width: '250px' },
      ]"
      :items="customerOptions"
      :server-search="true"
      search-placeholder="Cari kode atau nama customer..."
      @select="selectCustomer"
      @search="searchCustomer"
    />

    <!-- ── SearchModal Kas/Bank ────────────────────────────────────── -->
    <SearchModal
      v-model="showRekeningModal"
      title="Pilih Kas / Bank"
      :columns="[
        { key: 'kode', title: 'KODE', width: '100px' },
        { key: 'nama', title: 'NAMA AKUN', width: '200px' },
      ]"
      :items="rekeningOptions"
      :server-search="true"
      search-placeholder="Cari kode atau nama kas/bank..."
      @select="selectRekening"
      @search="searchRekening"
    />
  </BaseForm>
</template>

<style scoped>
.panel-header {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 16px;
}
.grid-cols-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
@media (max-width: 960px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  gap: 8px;
}
.align-start {
  align-items: flex-start !important;
}
.f-lbl {
  width: 100px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  flex-shrink: 0;
}
.mt-1 {
  margin-top: 3px;
}
.f-inp {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 11px;
  outline: none;
}
.f-inp:focus {
  border-color: #3b5998;
}
.f-area {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 11px;
  resize: none;
  outline: none;
}
.f-area:focus {
  border-color: #3b5998;
}
.readonly-bg {
  background: #f1f5f9;
  color: #64748b;
}
.chk-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #334155;
  cursor: pointer;
}

.search-group {
  display: flex;
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.search-group input {
  border: none;
  padding: 0 8px;
  font-size: 11px;
  height: 28px;
  outline: none;
}
.w-30 {
  width: 30%;
  flex: none;
}
.w-70 {
  flex: 1;
}
.btn-srch {
  height: 28px;
  width: 32px;
  padding: 0;
  background: #3b5998;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-srch:disabled {
  background: #9e9e9e;
  cursor: not-allowed;
}
.btn-blue {
  background: #3b5998;
}

.table-container {
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.grid-table th {
  background: #3b5998;
  color: white;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}
.grid-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.grid-table tbody tr:hover td {
  background: rgba(59, 89, 152, 0.04);
}
.row-selected td {
  background-color: #eef3fb !important;
}

.cell-input {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  background: #fffdf0;
  text-align: right;
  outline: none;
}
.cell-input:focus {
  border-color: #3b5998;
}
.cell-input:disabled {
  background: #f1f5f9;
  color: #9ca3af;
}

.footer-summary {
  display: flex;
  justify-content: flex-end;
}
.total-box {
  background: #1e293b;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  text-align: right;
  min-width: 280px;
}
.total-label {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  font-weight: 600;
}
.total-val {
  font-size: 20px;
  font-weight: 700;
  color: #4ade80;
}

.mt-3 {
  margin-top: 10px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  font-weight: bold;
  font-size: 11px;
}
.text-error {
  color: #dc2626;
}
.text-grey {
  color: #64748b;
}
.font-weight-bold {
  font-weight: 700;
}
.empty-text {
  padding: 24px !important;
  color: #94a3b8;
  font-style: italic;
  text-align: center;
}
</style>
