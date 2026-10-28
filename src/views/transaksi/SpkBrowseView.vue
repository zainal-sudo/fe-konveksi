<script setup lang="ts">
import { ref, watch, computed, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import AppActionButton from "@/components/AppActionButton.vue";
import { spkApi } from "@/api/transaksi/spkApi";
import { spkDetailApi } from "@/api/transaksi/spkDetailApi";
import { exportToExcel, exportSpkDetail } from "@/utils/exportExcel";
import { useFormSession } from "@/composables/useFormSession";
import { userCell, userCellText } from "@/utils/kolomUser";
import {
  IconClipboardList,
  IconPlus,
  IconPencil,
  IconTrash,
  IconFileSpreadsheet,
  IconCheck,
  IconPrinter,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const MENU_ID = "84";

const STORAGE_KEY = "finance_periode_spk";

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

watch([startDate, endDate], ([s, e]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ startDate: s, endDate: e }));
  } catch {}
  loadData();
});

const items = ref<any[]>([]);
const isLoading = ref(false);
const selected = ref<any[]>([]);
const selectedItem = computed(() => selected.value[0] ?? null);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px", align: "center" },
  { title: "NAMA SPK", key: "Nama", minWidth: "200px" },
  { title: "TANGGAL", key: "Tanggal", width: "110px", align: "center" },
  { title: "DATELINE", key: "DateLine", width: "110px", align: "center" },
  { title: "BARANG", key: "Barang", minWidth: "200px" },
  { title: "SATUAN", key: "Satuan", width: "80px", align: "center" },
  { title: "CUSTOMER", key: "Customer", minWidth: "160px" },
  { title: "TARGET", key: "Jumlah", width: "100px", align: "end" },
  { title: "PROGRESS", key: "StatusView", width: "110px", align: "center" },
  { title: "CLOSE", key: "IsClosed", width: "110px", align: "center" },
  { title: "MEMO", key: "MemoClose", minWidth: "200px" },
  { title: "USER", key: "UserView", width: "150px" },
];

const withStatus = (rows: any[]) =>
  rows.map((r) => ({
    ...r,
    // Status dari backend: 'Selesai' kalau semua tahapan tercapai.
    StatusView: r.Status || "Proses",
  }));

const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    items.value = withStatus(await spkApi.getBrowse(startDate.value, endDate.value));
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data SPK.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});

// Reload tiap tab ini diaktifkan lagi supaya progress tahapan ikut
// ter-update begitu dibuka lagi setelah diubah dari layar lain.
onActivated(() => {
  loadData();
});

// ── Expand: data tambahan per SPK ──────────────────────────────────────
// Tanpa LHK: yang perlu diambil cuma (1) tahapan produksi dari tspk_dtl,
// (2) kebutuhan bahan dari komposisi x jumlah target.
const expanded = ref<any[]>([]);
const tahapMap = ref<Record<string, any[]>>({});
const tahapLoading = ref<Record<string, boolean>>({});

const bahanMap = ref<Record<string, any[]>>({});
const bahanHeader = ref<Record<string, any>>({});
const bahanError = ref<Record<string, string>>({});
const bahanLoading = ref<Record<string, boolean>>({});

const norm = (nomor: any) => String(nomor ?? "").trim();

const fetchTahap = async (nomor: string) => {
  tahapLoading.value[nomor] = true;
  try {
    tahapMap.value[nomor] = await spkDetailApi.getBySpk(nomor);
  } catch {
    tahapMap.value[nomor] = [];
  } finally {
    tahapLoading.value[nomor] = false;
  }
};

const fetchBahan = async (nomor: string) => {
  bahanLoading.value[nomor] = true;
  bahanError.value[nomor] = "";
  try {
    const res = await spkApi.getKebutuhanBahan(nomor);
    bahanHeader.value[nomor] = res;
    bahanMap.value[nomor] = res.bahan || [];
  } catch (e: any) {
    bahanMap.value[nomor] = [];
    bahanHeader.value[nomor] = null;
    bahanError.value[nomor] =
      e.response?.data?.message || "Gagal memuat kebutuhan bahan.";
  } finally {
    bahanLoading.value[nomor] = false;
  }
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const entry of newExpanded) {
    const nomor = typeof entry === "string" ? entry : entry?.Nomor;
    const key = norm(nomor);
    if (!key) continue;
    if (tahapLoading.value[key]) continue;
    if (tahapMap.value[key] !== undefined) continue;
    await fetchTahap(key);
    if (bahanMap.value[key] === undefined && !bahanLoading.value[key]) {
      await fetchBahan(key);
    }
  }
};

const retryBahan = (nomor: string) => {
  const key = norm(nomor);
  if (!key) return;
  fetchBahan(key);
};

const getTahapan = (nomor: unknown) => tahapMap.value[norm(nomor)] ?? [];
const getBahan = (nomor: unknown) => bahanMap.value[norm(nomor)] ?? [];
const getBahanHeader = (nomor: unknown) =>
  bahanHeader.value[norm(nomor)] ?? { brgNama: "", jumlah: 0, satuan: "" };

const { clearFormData } = useFormSession("spk");

const onBaru = () => {
  // Hapus draft form "+ Baru" yang mungkin masih nyangkut di sessionStorage
  // SEBELUM navigasi, supaya tab yang di-reuse tampil kosong lagi.
  clearFormData();
  router.push({ name: "spkCreate" });
};

const onUbah = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  if (Number(selectedItem.value.IsClosed || 0) === 1) {
    toast.error(`SPK ${selectedItem.value.Nomor} sudah CLOSED dan tidak dapat diubah.`);
    return;
  }
  router.push({ name: "spkEdit", params: { nomor: selectedItem.value.Nomor } });
};

const onHapus = async () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  if (Number(selectedItem.value.IsClosed || 0) === 1) {
    toast.error(`SPK ${selectedItem.value.Nomor} sudah CLOSED dan tidak dapat dihapus.`);
    return;
  }
  if (!confirm(`Hapus SPK ${selectedItem.value.Nomor}?`)) return;
  try {
    await spkApi.delete(selectedItem.value.Nomor);
    toast.success("Data SPK berhasil dihapus.");
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onCetak = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  router.push({ name: "spkPrint", params: { nomor: selectedItem.value.Nomor } });
};

// ══════════════════════════════════════════════════════════════════════
// CLOSE & MEMO
// ══════════════════════════════════════════════════════════════════════
// Tombol "Close" menandai SPK CLOSED (backend: PATCH /:nomor/close).
// Memo hanya bisa diisi setelah SPK CLOSED — sama seperti semula, hanya
// tanpa syarat LHK karena modul ini murni SPK.
const showCloseDialog = ref(false);
const isClosing = ref(false);

const canUpdateStatus = computed(() => {
  const r = selectedItem.value;
  if (!r) return false;
  return Number(r.IsClosed || 0) !== 1;
});

const statusLockReason = computed(() => {
  const r = selectedItem.value;
  if (!r) return "Pilih SPK terlebih dahulu.";
  if (Number(r.IsClosed || 0) === 1) return "Status SPK ini sudah CLOSED.";
  return "";
});

const onUpdateStatus = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  if (!canUpdateStatus.value) {
    toast.warning(statusLockReason.value);
    return;
  }
  showCloseDialog.value = true;
};

const confirmUpdateStatus = async () => {
  if (isClosing.value) return;
  isClosing.value = true;
  try {
    await spkApi.closeStatus(selectedItem.value.Nomor);
    showCloseDialog.value = false;
    toast.success("Status SPK berhasil ditutup. Memo sekarang bisa diisi.");
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menutup status SPK.");
  } finally {
    isClosing.value = false;
  }
};

// ── Memo: klik sel MEMO (hanya kalau CLOSED) → dialog edit ───────────
const showMemoDialog = ref(false);
const memoTarget = ref<any>(null);
const memoDraft = ref("");
const isSavingMemo = ref(false);

const openMemoDialog = (row: any) => {
  if (Number(row?.IsClosed || 0) !== 1) {
    toast.warning("Memo baru bisa diisi setelah status SPK di-update menjadi CLOSED.");
    return;
  }
  memoTarget.value = row;
  memoDraft.value = row.MemoClose || "";
  showMemoDialog.value = true;
};

const saveMemo = async () => {
  if (isSavingMemo.value || !memoTarget.value) return;
  if (memoDraft.value.trim().length > 500) {
    toast.warning("Memo maksimal 500 karakter.");
    return;
  }
  isSavingMemo.value = true;
  try {
    const memo = memoDraft.value.trim();
    const res = await spkApi.updateMemo(memoTarget.value.Nomor, memo);
    memoTarget.value.MemoClose = res?.memoClose ?? memo;
    showMemoDialog.value = false;
    toast.success("Memo SPK berhasil disimpan.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan memo SPK.");
  } finally {
    isSavingMemo.value = false;
  }
};

const doExport = async () => {
  if (items.value.length === 0) return toast.warning("Tidak ada data untuk diexport.");
  try {
    await exportToExcel({
      title: "Surat Perintah Kerja (SPK)",
      filenamePrefix: "SPK",
      sheetName: "SPK",
      columns: [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Nama SPK", key: "Nama", width: 28 },
        { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
        { header: "Dateline", key: "DateLine", width: 14, align: "center" },
        { header: "Barang", key: "Barang", width: 28 },
        { header: "Satuan", key: "Satuan", width: 10, align: "center" },
        { header: "Customer", key: "Customer", width: 24 },
        { header: "Target", key: "Jumlah", width: 12, align: "right" },
        {
          header: "Progress",
          key: "__progress",
          width: 14,
          align: "center",
          map: (r: any) => r.StatusView || "Proses",
        },
        {
          header: "Close",
          key: "__status",
          width: 14,
          align: "center",
          map: (r: any) => (Number(r.IsClosed || 0) === 1 ? "CLOSED" : "BELUM DITUTUP"),
        },
        { header: "Memo", key: "MemoClose", width: 40 },
        { header: "User", key: "__user", width: 22, map: (r: any) => userCellText(r) },
      ],
      rows: items.value,
    });
  } catch {
    toast.error("Gagal melakukan export Excel.");
  }
};

const doExportDetail = async () => {
  if (items.value.length === 0) return toast.warning("Tidak ada data untuk diexport.");
  try {
    const rows = await spkApi.getDetailAll(startDate.value, endDate.value);
    if (rows.length === 0) return toast.warning("Tidak ada data untuk diexport.");
    await exportSpkDetail(rows, startDate.value, endDate.value);
  } catch {
    toast.error("Gagal melakukan export Excel.");
  }
};

const fmt = (v: number) => new Intl.NumberFormat("en-US").format(v || 0);
</script>

<template>
  <BaseBrowse
    title="Surat Perintah Kerja (SPK)"
    :icon="IconClipboardList"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    :show-expand="true"
    :expanded="expanded"
    id-key="Nomor"
    item-value="Nomor"
    @update:expanded="onUpdateExpanded"
    v-model:selected="selected"
    @refresh="loadData"
    @print="onCetak"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" />
      </div>
    </template>

    <template #extra-actions>
      <AppActionButton
        label="Baru"
        kbd="F2"
        variant="primary"
        data-match="baru"
        :icon="IconPlus"
        @click="onBaru"
      />
      <AppActionButton
        label="Ubah"
        kbd="Enter"
        variant="outline"
        data-match="ubah"
        :icon="IconPencil"
        :disabled="!selectedItem || Number(selectedItem.IsClosed || 0) === 1"
        @click="onUbah"
      />
      <AppActionButton
        label="Hapus"
        kbd="F4"
        variant="error"
        data-match="hapus"
        :icon="IconTrash"
        :disabled="!selectedItem || Number(selectedItem.IsClosed || 0) === 1"
        @click="onHapus"
      />
      <AppActionButton
        label="Close"
        variant="outline"
        data-match="updatestatus"
        :icon="IconCheck"
        :disabled="!canUpdateStatus"
        :title="statusLockReason"
        @click="onUpdateStatus"
      />
      <AppActionButton
        label="Cetak"
        kbd="F9"
        variant="outline"
        data-match="cetak"
        :icon="IconPrinter"
        :disabled="!selectedItem"
        @click="onCetak"
      />
      <AppActionButton
        label="Export"
        kbd="F8"
        variant="success"
        data-match="export"
        :icon="IconFileSpreadsheet"
        @click="doExport"
      />
      <AppActionButton
        label="Export Tahapan"
        kbd="Shift+F8"
        variant="success"
        data-match="exportdetail"
        :icon="IconFileSpreadsheet"
        @click="doExportDetail"
      />
    </template>

    <template #item.Nomor="{ item }">
      <span class="font-weight-medium">{{ item.Nomor }}</span>
    </template>

    <template #item.Tanggal="{ item }"><div class="tc">{{ item.Tanggal }}</div></template>
    <template #item.DateLine="{ item }"><div class="tc">{{ item.DateLine || "-" }}</div></template>
    <template #item.Jumlah="{ item }"><div class="tr">{{ fmt(item.Jumlah) }}</div></template>
    <template #item.Satuan="{ item }"><div class="tc">{{ item.Satuan || "-" }}</div></template>

    <!-- ══════ PROGRESS (dari tahapan tspk_dtl) ══════ -->
    <template #item.StatusView="{ item }">
      <span v-if="item.StatusView === 'Selesai'" class="st-badge st-badge--done">SELESAI</span>
      <span v-else class="st-badge st-badge--proses">PROSES</span>
    </template>

    <!-- ══════ CLOSE ══════ -->
    <template #item.IsClosed="{ item }">
      <span v-if="Number(item.IsClosed) === 1" class="st-badge st-badge--closed">CLOSED</span>
      <span v-else class="st-badge st-badge--open">BELUM</span>
    </template>

    <!-- ══════ MEMO ══════
         Sel bisa diklik HANYA kalau statusnya sudah CLOSED. Kalau belum,
         teks tetap ditampilkan tapi tidak ada affordance apa pun. -->
    <template #item.MemoClose="{ item }">
      <div
        class="memo-cell"
        :class="{ 'is-editable': Number(item.IsClosed) === 1 }"
        :title="Number(item.IsClosed) === 1 ? 'Klik untuk ubah memo' : 'Tersedia setelah status CLOSED'"
        @click="openMemoDialog(item)"
      >
        <template v-if="item.MemoClose">{{ item.MemoClose }}</template>
        <span v-else class="memo-empty">
          {{ Number(item.IsClosed) === 1 ? "Klik untuk isi memo" : "-" }}
        </span>
      </div>
    </template>

    <!-- ══════ USER ══════ -->
    <template #item.UserView="{ item }">
      <span :title="userCell(item).title">{{ userCell(item).text }}</span>
    </template>

    <!-- ══════ Expand: info SPK + tahapan + kebutuhan bahan ══════ -->
    <template #detail="{ item }">
      <div class="detail-wrap">
        <div class="spk-close-strip">
          <span class="spk-close-hint">
            Target {{ fmt(item.Jumlah) }} {{ item.Satuan || "" }}
            <template v-if="item.Shift">&middot; Shift {{ item.Shift }}</template>
            <template v-if="item.NoPo">&middot; PO {{ item.NoPo }}</template>
            <template v-if="item.TanggalPo">&middot; Tgl PO {{ item.TanggalPo }}</template>
            <template v-if="item.TanggalProduksi">&middot; Produksi {{ item.TanggalProduksi }}</template>
          </span>
        </div>

        <!-- Tahapan produksi (tspk_dtl) -->
        <div class="section-heading">Tahapan Produksi</div>
        <div v-if="tahapLoading[item.Nomor]" class="state-box">
          <v-progress-circular indeterminate size="20" width="2" color="primary" />
          <span style="margin-left:8px; color:#6b7280;">Mengambil tahapan..</span>
        </div>
        <div v-else-if="!getTahapan(item.Nomor).length" class="empty-state">
          Belum ada tahapan untuk SPK ini.
        </div>
        <table v-else class="detail-tbl">
          <thead>
            <tr>
              <th style="width:45px" class="tc">No</th>
              <th>Tahap</th>
              <th style="width:100px" class="tr">Target</th>
              <th style="width:100px" class="tr">Selesai</th>
              <th style="width:110px" class="tc">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in getTahapan(item.Nomor)" :key="d.id ?? i">
              <td class="tc" style="color:#6b7280; font-weight:bold;">{{ d.urutan ?? i + 1 }}</td>
              <td class="font-weight-bold" style="color:#1f2937;">{{ d.nama }}</td>
              <td class="tr" style="color:#1f2937;">{{ fmt(d.target) }}</td>
              <td class="tr font-weight-bold val-green">{{ fmt(d.selesai) }}</td>
              <td class="tc">{{ d.status }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Kebutuhan bahan (komposisi x jumlah target) -->
        <div class="section-heading">Kebutuhan Bahan</div>
        <div v-if="bahanLoading[item.Nomor]" class="state-box">
          <v-progress-circular indeterminate size="20" width="2" color="primary" />
          <span style="margin-left:8px; color:#6b7280;">Menghitung kebutuhan bahan..</span>
        </div>
        <div v-else-if="bahanError[item.Nomor]" class="state-box">
          <span style="color:#b45309;">{{ bahanError[item.Nomor] }}</span>
          <v-btn size="x-small" variant="tonal" color="primary" class="ml-2"
                 @click="retryBahan(item.Nomor)">
            Coba Lagi
          </v-btn>
        </div>
        <div v-else-if="!getBahan(item.Nomor).length" class="empty-state">
          Barang jadi SPK ini belum punya komposisi bahan (tbarangkomposisi).
        </div>
        <template v-else>
          <div class="bahan-summary">
            Barang: <strong>{{ getBahanHeader(item.Nomor).brgNama || "-" }}</strong>
            &middot; jumlah target: <strong>{{ fmt(getBahanHeader(item.Nomor).jumlah) }}
            {{ getBahanHeader(item.Nomor).satuan || "" }}</strong>
          </div>
          <table class="detail-tbl">
            <thead>
              <tr>
                <th style="width:40px" class="tc">No</th>
                <th style="width:150px">Kode Bahan</th>
                <th>Nama Bahan</th>
                <th style="width:110px" class="tr">Qty / Unit</th>
                <th style="width:80px" class="tc">Satuan</th>
                <th style="width:120px" class="tr">Total Dibutuhkan</th>
                <th style="width:200px">Spesifikasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in getBahan(item.Nomor)" :key="b.bahanKode ?? i">
                <td class="tc" style="color:#6b7280; font-weight:bold;">{{ b.urutan ?? i + 1 }}</td>
                <td class="font-weight-bold" style="color:#1E40AF;">{{ b.bahanKode }}</td>
                <td style="color:#1f2937;">{{ b.bahanNama }}</td>
                <td class="tr">{{ fmt(b.qtyPerUnit) }}</td>
                <td class="tc">{{ b.satuan || b.satuanBahan || "-" }}</td>
                <td class="tr font-weight-bold val-green">{{ fmt(b.totalDibutuhkan) }}</td>
                <td style="color:#6b7280;">{{ b.spesifikasi || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </BaseBrowse>

  <!-- ══════ Dialog konfirmasi Close ══════ -->
  <v-dialog v-model="showCloseDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="dlg-title">Close SPK</v-card-title>
        <v-card-text>
          <p class="dlg-info">
            SPK <strong>{{ selectedItem?.Nomor }}</strong> akan ditandai
            <strong>CLOSED</strong>. Setelah itu SPK ini tidak bisa diubah
            atau dihapus lagi.
          </p>
          <p class="dlg-info">
            Close tidak bisa dibatalkan dari layar. Kalau ternyata masih ada
            yang mau dikerjakan, jangan ditutup dulu.
          </p>
          <p class="dlg-info">
            Target {{ fmt(selectedItem?.Jumlah || 0) }}. Setelah ditutup, kolom
            MEMO bisa diklik untuk mengisi catatan hasil produksi.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="isClosing" @click="showCloseDialog = false">Batal</v-btn>
          <v-btn color="primary" variant="tonal" :loading="isClosing" @click="confirmUpdateStatus">
            Ya, Close SPK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ══════ Dialog edit Memo (dipanggil dari sel MEMO) ══════ -->
    <v-dialog v-model="showMemoDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="dlg-title">Memo SPK {{ memoTarget?.Nomor }}</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="memoDraft"
            label="Memo"
            rows="3"
            auto-grow
            maxlength="500"
            counter
            persistent-hint
            hint="Contoh: target 100 jadi 75, mesin macet"
            persistent-placeholder
            placeholder="Tuliskan catatan hasil produksi..."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="isSavingMemo" @click="showMemoDialog = false">Batal</v-btn>
          <v-btn color="primary" variant="tonal" :loading="isSavingMemo" @click="saveMemo">
            Simpan Memo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.filter-lbl { font-size: 12px; font-weight: 600; color: #374151; white-space: nowrap; }
.filter-sep { font-size: 12px; color: #9ca3af; white-space: nowrap; }
.date-inp { height: 32px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; font-size: 12px; outline: none; width: 130px; }
.date-inp:focus { border-color: #1E40AF; }

.tc { text-align: center; }
.tr { text-align: right; }
.val-green { color: #1b5e20; }

.detail-wrap {
  padding: 10px 12px 16px;
  background: #f8f9fc;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}
.state-box { padding: 12px; text-align: center; display: flex; align-items: center; justify-content: center; }
.empty-state { color: #9e9e9e; font-style: italic; padding: 12px; font-size: 12.5px; }

.section-heading {
  font-size: 12.5px;
  font-weight: 700;
  color: #1E40AF;
  margin: 14px 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.section-heading:first-of-type { margin-top: 4px; }

.bahan-summary {
  font-size: 12.5px;
  color: #374151;
  margin-bottom: 6px;
}

.detail-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; table-layout: auto; }
.detail-tbl thead th {
  background: #1E40AF;
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
  padding: 8px 10px;
  text-align: left;
  white-space: nowrap;
}
.detail-tbl thead th.tc, .detail-tbl thead th.tr { text-align: center; }
.detail-tbl thead th.tr { text-align: right; }
.detail-tbl tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
.detail-tbl tbody tr:last-child td { border-bottom: none; }
.detail-tbl tbody tr:hover td { background: #f8fafc; }

.spk-close-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
}
.spk-close-hint { font-size: 12px; color: #4338ca; }

.st-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.st-badge--proses { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.st-badge--done { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.st-badge--closed { background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; }
.st-badge--open { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

.memo-cell { font-size: 12.5px; color: #374151; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.memo-cell.is-editable { cursor: pointer; text-decoration: underline dotted #93c5fd; text-underline-offset: 3px; }
.memo-cell.is-editable:hover { color: #1E40AF; }
.memo-empty { color: #9ca3af; font-style: italic; }

.dlg-title { font-size: 16px; font-weight: 700; color: #0f172a; }
.dlg-info { font-size: 13px; color: #475569; margin-bottom: 8px; }
</style>
