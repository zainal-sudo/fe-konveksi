<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  pembayaranLainApi,
  type PembayaranLainRow,
  type PembayaranLainDetailRow,
} from "@/api/accounting/pembayaranLainApi";
import { useBrowse } from "@/composables/useBrowse";
import ExportDialog from "@/components/ExportDialog.vue";
import { exportStyledHeader, type ExportColumn } from "@/utils/styledExport";
import { useAuthStore } from "@/stores/authStore";
import { IconCashOff, IconFileSpreadsheet, IconPrinter } from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// ── Periode (sessionStorage persist) ─────────────────────────────────
const STORAGE_KEY = "kasbank_periode_pembayaran_lain";

const getLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getSaved = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (s?.startDate && s?.endDate) return s;
  } catch {}
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const saved = getSaved();

const startDate = ref(saved?.startDate ?? getLocal(firstDay));
const endDate = ref(saved?.endDate ?? getLocal(now));

// ── useBrowse (Permission + Data) ────────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  isSingleSelected,
  fetchData,
} = useBrowse<PembayaranLainRow>({
  menuId: "",
  fetchApi: () => pembayaranLainApi.getBrowse(startDate.value, endDate.value),
});

const forceCanInsert = computed(() => true);
const forceCanEdit = computed(() => true);
const forceCanDelete = computed(() => true);
const forceCanExport = computed(() => true);

const headers = [
  { key: "Nomor", title: "Nomor", width: "100px" },
  { key: "Tanggal", title: "Tanggal", width: "100px", align: "center" as const },
  { key: "Keterangan", title: "Keterangan", width: "200px" },
  { key: "IsClosed", title: "Closed", width: "80px", align: "center" as const },
  { key: "Nilai", title: "Nilai", width: "120px", align: "right" as const },
];

// ── Watch periode → fetch data ───────────────────────────────────────
watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: s, endDate: e })
    );
  } catch {}
});

// ── Expand Detail ────────────────────────────────────────────────────
const expanded = ref<any[]>([]);
const detailMap = ref<Record<string, PembayaranLainDetailRow[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  const keys = newExpanded.map((e) => (typeof e === "object" ? e.Nomor : e));
  expanded.value = newExpanded;

  for (const nomor of keys) {
    if (detailMap.value[nomor] || expandedLoading.value[nomor]) continue;
    expandedLoading.value = { ...expandedLoading.value, [nomor]: true };
    try {
      detailMap.value = {
        ...detailMap.value,
        [nomor]: await pembayaranLainApi.getDetail(nomor),
      };
    } catch (e: any) {
      if (isAuthExpiredError(e)) return;
      toast.error(`Gagal memuat rincian untuk ${nomor}`);
    } finally {
      expandedLoading.value = { ...expandedLoading.value, [nomor]: false };
    }
  }
};

// ── Actions ──────────────────────────────────────────────────────────
const onAdd = () => {
  router.push({ name: "AccountingPembayaranLainCreate" });
};

// ── Guard edit (paritas Delphi cxButton1Click) ───────────────────────
// tanggal != hari ini + bukan FINANCE/PIUTANG → blokir;
// IsClosed = 'Sudah' → pass flag locked (form disable simpan)
const onEdit = (item: PembayaranLainRow) => {
  const userKode = authStore.userKode?.toUpperCase() || "";
  const isToday = item.Tanggal === getLocal(new Date());
  if (!isToday && !["FINANCE", "PIUTANG"].includes(userKode)) {
    toast.warning("Transaksi sudah melewati tanggal transaksi dan tidak dapat diedit.");
    return;
  }
  router.push({
    name: "AccountingPembayaranLainEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
    query: item.IsClosed === "Sudah" ? { locked: "1" } : {},
  });
};

const onDelete = async (item: PembayaranLainRow) => {
  try {
    await pembayaranLainApi.delete(item.Nomor);
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    if (isAuthExpiredError(e)) return;
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

// ── Cetak Pembayaran Lain (browser print, paritas doslipmutasi) ──
const doCetak = () => {
  if (!isSingleSelected.value) {
    toast.warning("Pilih satu data Pembayaran Lain terlebih dahulu.");
    return;
  }
  const item = (selected.value as any[])[0];
  router.push(`/accounting/pembayaran-lain/print/${encodeURIComponent(item.Nomor)}`);
};

// ── Formatting ───────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const fmtDate = (val: string | null) => {
  if (!val) return "-";
  try {
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return val;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch { return val; }
};

// ── Export ───────────────────────────────────────────────────────────
const showExportDialog = ref(false);
const isExporting = ref(false);

const headerCols: ExportColumn[] = [
  { key: "Nomor", title: "Nomor", width: 15 },
  { key: "Tanggal", title: "Tanggal", width: 12, align: "center" },
  { key: "Keterangan", title: "Keterangan", width: 30 },
  { key: "IsClosed", title: "Closed", width: 10, align: "center" },
  { key: "Nilai", title: "Nilai", width: 16, numFmt: "#,##0" },
];
const detailCols: ExportColumn[] = [
  { key: "Nomor", title: "Nomor", width: 15 },
  { key: "Account", title: "Account", width: 12 },
  { key: "AccountName", title: "Nama Account", width: 30 },
  { key: "Debet", title: "Debet", width: 16, numFmt: "#,##0" },
  { key: "Kredit", title: "Kredit", width: 16, numFmt: "#,##0" },
  { key: "Keterangan", title: "Keterangan", width: 25 },
];

const doExportHeader = () => {
  if (!items.value.length) { toast.info("Tidak ada data untuk diexport."); return; }
  isExporting.value = true;
  try {
    const exportItems = items.value.map((r) => ({ ...r, Tanggal: fmtDate(r.Tanggal as any) }));
    exportStyledHeader({
      title: "Pembayaran Lain-Lain",
      columns: headerCols,
      items: exportItems,
      fileName: `PembayaranLain_${startDate.value}_${endDate.value}.xlsx`,
      subtitle: `Periode: ${startDate.value} s/d ${endDate.value}`,
    });
  } finally { isExporting.value = false; }
};

const doExportDetail = async () => {
  if (!items.value.length) { toast.info("Tidak ada data untuk diexport."); return; }
  isExporting.value = true;
  try {
    const allDetail: any[] = [];
    for (const item of items.value) {
      try {
        const d = await pembayaranLainApi.getDetail(item.Nomor);
        allDetail.push(...d);
      } catch { /* skip */ }
    }
    exportStyledHeader({
      title: "Pembayaran Lain-Lain",
      columns: detailCols,
      items: allDetail,
      fileName: `PembayaranLain_Detail_${startDate.value}_${endDate.value}.xlsx`,
      subtitle: `Periode: ${startDate.value} s/d ${endDate.value}`,
    });
  } finally { isExporting.value = false; }
};
</script>

<template>
  <BaseBrowse
    title="Pembayaran Lain-Lain"
    :icon="IconCashOff"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :selected="selected"
    @update:selected="selected = $event"
    item-value="Nomor"
    :can-insert="forceCanInsert"
    :can-edit="forceCanEdit"
    :can-delete="forceCanDelete"
    :can-export="forceCanExport"
    :fixed-layout="false"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    summary-key="Nilai"
    summary-label="Total Nilai"
    search-placeholder="Cari pembayaran lain..."
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
  >
    <!-- Filter Periode -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="startDate" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="endDate" type="date" class="date-inp" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        class="tb-btn tb-btn-edit"
        :disabled="!isSingleSelected"
        @click="doCetak"
      >
        <template #prepend>
          <IconPrinter :size="13" :stroke-width="1.8" />
        </template>
        Cetak
      </v-btn>
      <v-btn size="small" class="tb-btn tb-btn-primary" @click="showExportDialog = true">
        <template #prepend>
          <IconFileSpreadsheet :size="14" :stroke-width="1.8" />
        </template>
        Export
      </v-btn>
    </template>

    <!-- Custom Cells -->
    <template #item.Tanggal="{ value }">
      <span>{{ fmtDate(value) }}</span>
    </template>

    <template #item.IsClosed="{ value }">
      <span :class="value === 'Sudah' ? 'badge-closed' : 'badge-open'">
        {{ value }}
      </span>
    </template>

    <template #item.Nilai="{ value }">
      <span class="num-cell">{{ fmt(value) }}</span>
    </template>

    <!-- Expanded Detail -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="expandedLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="18" />
          <span>Memuat rincian...</span>
        </div>
        <table v-else class="detail-tbl">
          <thead>
            <tr>
              <th style="width: 80px">Nomor</th>
              <th style="width: 80px">Account</th>
              <th style="min-width: 200px">Nama Account</th>
              <th style="width: 100px" class="tr">Debet</th>
              <th style="width: 100px" class="tr">Kredit</th>
              <th style="width: 150px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in detailMap[item.Nomor] || []" :key="idx">
              <td>{{ d.Nomor }}</td>
              <td class="mono">{{ d.Account }}</td>
              <td class="bold">{{ d.AccountName }}</td>
              <td class="tr">{{ fmt(d.Debet) }}</td>
              <td class="tr">{{ fmt(d.Kredit) }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="6" class="empty-td">Tidak ada detail.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- Export Dialog -->
  <ExportDialog
    v-model="showExportDialog"
    :has-detail="true"
    @export-header="doExportHeader"
    @export-detail="doExportDetail"
  />
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
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
  border-color: var(--ds-primary, #3B5998);
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
  background: rgba(59, 89, 152, 0.1);
  color: var(--ds-primary, #3B5998);
  padding: 1px 8px;
  border-radius: 0;
  font-size: 10px;
  font-weight: 700;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

.tc {
  text-align: center;
}

.tr {
  text-align: right;
}

.mono {
  font-family: monospace;
}

.bold {
  font-weight: 700;
}

.detail-wrap {
  padding: 4px 0;
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  font-size: 12px;
  color: #6b7280;
}

.detail-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.detail-tbl thead tr {
  background: var(--ds-primary, #3B5998);
}

.detail-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
  text-align: left;
}

.detail-tbl td {
  padding: 3px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.detail-tbl tbody tr:hover td {
  background: rgba(59, 89, 152, 0.04);
}

.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
}
</style>
