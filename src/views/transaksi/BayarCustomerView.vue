<script setup lang="ts">
import { ref, watch, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { IconReceipt2, IconReceiptRefund } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bayarCustomerApi } from "@/api/transaksi/bayarCustomerApi";

const MENU_ID = "51";
const toast = useToast();
const router = useRouter();
const showCloseDialog = ref(false);

const STORAGE_KEY = "pembayaran_customer";
const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
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

// Menggunakan composable useBrowse bawaan sistem
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse<any>({
  menuId: MENU_ID,
  fetchApi: () =>
    bayarCustomerApi.getAll(
      startDate.value,
      endDate.value,
    ),
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
// Refetch tiap kali tab browse kembali aktif (KeepAlive) — tab pertama
// di-skip karena useBrowse sudah fetch onMounted
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  selected.value = [];
  expanded.value = [];
  fetchData();
});
watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e }),
    );
  } catch {}
  fetchData();
});

// Definisi Kolom Grid Tabel
const headers = [
  { title: "No. Bukti", key: "NOMOR", width: "150px", align: "center" },
  { title: "Tanggal", key: "TANGGAL", width: "120px", align: "center" },
  { title: "Customer", key: "CUS_NAMA", minWidth: "220px" },
  { title: "Kas / Bank", key: "REK_NAMA", width: "180px" },
  { title: "Total Bayar", key: "TOTAL_BAYAR", width: "160px", align: "right" },
  { title: "Posting", key: "POSTING", width: "100px", align: "center" },
];

// Helper Format Nominal Angka ke Rupiah (Rp)
const fmtCurrency = (v: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v || 0);
};

// Helper Format Tampilan Tanggal agar rapi (YYYY-MM-DD ke DD/MM/YYYY)
const fmtDate = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID").format(d);
  } catch {
    return dateStr;
  }
};

// ── 1. AKSI TOMBOL TAMBAH (ADD) ──────────────────────────────────────
const handleAdd = () => {
  router.push("/transaksi/bayarCustomer/baru");
};

// ── 2. AKSI TOMBOL UBAH (EDIT) ───────────────────────────────────────
const handleEdit = (item: any) => {
  const nomorBukti = item.NOMOR || item.nomor;
  if (!nomorBukti) {
    toast.warning("Nomor bukti transaksi tidak valid.");
    return;
  }
  if (Number(item.POSTING) === 1) {
    toast.warning("Transaksi ini sudah Posting, tidak dapat diubah.");
    return;
  }
  router.push(`/transaksi/bayarCustomer/ubah/${encodeURIComponent(nomorBukti)}`);
};

// ── 3. AKSI TOMBOL HAPUS (DELETE) ────────────────────────────────────
const handleDelete = async (item: any) => {
  const nomorBukti = item.NOMOR || item.nomor;
  if (!nomorBukti) return;
  if (Number(item.POSTING) === 1) {
    toast.warning("Transaksi ini sudah Posting, tidak dapat dihapus.");
    return;
  }

  if (
    !confirm(
      `Apakah Anda yakin ingin membatalkan & menghapus transaksi pembayaran nomor "${nomorBukti}"?\nSisa piutang invoice terkait akan otomatis dikembalikan.`,
    )
  ) {
    return;
  }

  try {
    const res = await bayarCustomerApi.delete(nomorBukti);
    toast.success(res.message || "Transaksi pembayaran berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal menghapus transaksi.",
    );
  }
};
const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "penjualanBrowse" });
};
const expanded = ref<any[]>([]);
const detailMap = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

const getDetail = (nomor: string) => detailMap.value[nomor] ?? [];

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const item of newExpanded) {
    const nomor = item.NOMOR;
    if (!nomor) continue;
    if (detailMap.value[nomor] !== undefined) continue;
    loadingDetails.value = new Set([...loadingDetails.value, nomor]);
    try {
      detailMap.value[nomor] = await bayarCustomerApi.getDetail(nomor);
    } catch {
      detailMap.value[nomor] = [];
    } finally {
      loadingDetails.value.delete(nomor);
      loadingDetails.value = new Set(loadingDetails.value);
    }
  }
};
</script>

<template>
  <BaseBrowse
    title="Riwayat Pembayaran Customer"
    :icon="IconReceiptRefund"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :show-expand="true"
    :expanded="expanded"
    :loading-details="loadingDetails"
    id-key="NOMOR"
    item-value="NOMOR"
    @update:expanded="onUpdateExpanded"
    v-model:selected="selected"
    v-model:show-close-dialog="showCloseDialog"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @confirm-close="confirmClose"
  >
    <template #icon>
      <IconReceipt2 :size="20" />
    </template>
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" />
      </div>
    </template>
    <template #item.TANGGAL="{ item }">
      <span>{{ fmtDate(item.TANGGAL || item.tanggal) }}</span>
    </template>

    <template #item.POSTING="{ item }">
      <v-chip
        :color="Number(item.POSTING) === 1 ? 'success' : 'default'"
        size="x-small"
        label
        class="font-weight-bold"
      >
        {{ Number(item.POSTING) === 1 ? "POSTED" : "-" }}
      </v-chip>
    </template>

    <template #item.TOTAL_BAYAR="{ item }">
      <span class="font-weight-bold text-success text-mono">
        {{ fmtCurrency(item.TOTAL_BAYAR || item.total_bayar || 0) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <table class="detail-tbl">
          <thead>
            <tr>
              <th style="width: 40px" class="tc">No</th>
              <th style="width: 180px">No. Nota</th>
              <th style="width: 110px" class="tc">Tgl Nota</th>
              <th class="tr">Nilai Piutang</th>
              <th class="tr" style="color: #4ade80">Nilai Dibayar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in getDetail(item.NOMOR)" :key="idx">
              <td class="tc text-grey">{{ idx + 1 }}</td>
              <td><span class="mono font-weight-bold">{{ d.NoInvoice }}</span></td>
              <td class="tc">{{ d.TglInvoice }}</td>
              <td class="tr text-grey">{{ fmtCurrency(d.TotalInvoice) }}</td>
              <td class="tr font-weight-bold text-green-darken-4">
                {{ fmtCurrency(d.NilaiBayar) }}
              </td>
            </tr>
            <tr v-if="!getDetail(item.NOMOR).length">
              <td
                colspan="5"
                class="tc"
                style="color: #9e9e9e; font-style: italic; padding: 12px"
              >
                Tidak ada detail.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template #summary-row="{ filteredItems }">
      <span class="summary-lbl" style="color: white; font-weight: bold"
        >Total Bayar</span
      >
      <span class="summary-val" style="color: white; font-weight: bold">
        {{
          fmt(
            filteredItems.reduce(
              (s: number, r: any) => s + Number(r.TOTAL_BAYAR),
              0,
            ),
          )
        }}
      </span>
    </template>
  </BaseBrowse>
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
  font-size: 13px;
  color: #1f2937;
  outline: none;
  background-color: #fff;
}
.date-inp:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}
.text-mono {
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
}
</style>
