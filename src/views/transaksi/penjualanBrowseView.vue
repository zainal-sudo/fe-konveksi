<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { IconShoppingCart } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { penjualanApi } from "@/api/transaksi/penjualanApi";
import { exportRiwayatPenjualan } from "@/utils/exportExcel.ts";
import {
  IconReceipt,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const MENU_ID = "33"; // Sesuaikan Menu ID khusus untuk Penjualan / SO Anda

// ── Pengaturan Periode Tanggal (Sama seperti PO) ───────────────────────
const STORAGE_KEY = "minimarket_periode_penjualan";

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


// ── State Data ────────────────────────────────────────────────────────
const items = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = ref(false);

// Headers tabel utama (Header SO)
const headers = [
  { key: "NOTA", title: "NO. NOTA", width: "160px" },
  { key: "TANGGAL", title: "TANGGAL", width: "140px", type: "date" },
  { key: "CUS_KODE", title: "KODE CUS", width: "120px" },
  { key: "CUSTOMER", title: "NAMA CUSTOMER" },
  { key: "KASIR", title: "KASIR", width: "100px", align: "center" },
  { key: "TOTAL", title: "TOTAL NETTO", width: "140px", type: "number", align: "right" },
  { key: "BAYAR", title: "BAYAR", width: "140px", type: "number", align: "right" },
  { key: "KEMBALI", title: "KEMBALI", width: "120px", type: "number", align: "right" },
];
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
// ── Ambil Data dari API ────────────────────────────────────────────────
const loadData = async () => {
  loading.value = true;
  try {
    const data = await penjualanApi.getAllHistory(startDate.value, endDate.value);
    items.value = data || []; // Kembalikan ke aslinya tanpa .map
  } catch (err: any) {
    toast.error(err.message || "Gagal memuat history penjualan");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
const expanded = ref<any[]>([]);
const loadingDetails = ref<Set<string>>(new Set());

const detailMap = ref<Record<string, any[]>>({});

const getDetail = (nomor: string) => detailMap.value[nomor] ?? [];

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const item of newExpanded) {
    const nomor = item.NOTA;
    if (detailMap.value[nomor] !== undefined) continue;
    loadingDetails.value.add(nomor);
    try {
      detailMap.value[nomor] = await penjualanApi.getDetailHistory(nomor);
    } catch {
      detailMap.value[nomor] = [];
    } finally {
      loadingDetails.value.delete(nomor);
    }
  }
};
const fmtCurrency = (val: any) => {
  if (val === undefined || val === null || isNaN(Number(val))) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

const doExport = async () => {
  if (items.value.length === 0) {
    toast.warning("Tidak ada data penjualan yang bisa di-export.");
    return;
  }

  try {
    await exportRiwayatPenjualan(
      items.value,
      startDate.value,
      endDate.value
    );
    toast.success("Berhasil mengeksport laporan penjualan ke Excel!");
  } catch (error) {
    console.error(error);
    toast.error("Gagal mengeksport data ke Excel.");
  }
};


// ── Aksi ──────────────────────────────────────────────────────────────
const onBaru = () => {
  router.push({ name: "penjualanCreate" }); // 👈 Sesuai name di index.ts
};

const printNota = (item: any) => {
  toast.info("Mencetak nota " + item.NOTA);
  // Logika cetak cetak ulang thermal nota kasir Anda
};

const exportExcel = () => {
  toast.info("Exporting to Excel...");
};
</script>

<template>
  <BaseBrowse
    title="Browse Riwayat Penjualan Kasir"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items"
    :is-loading="loading"
    :show-expand="true"
    :expanded="expanded"
    :loading-details="loadingDetails"
    search-placeholder="Cari No. Nota atau Customer..."
    :can-insert="true"
    @refresh="loadData"
    @update:expanded="onUpdateExpanded"
    @add="onBaru"
    item-value="NOTA"
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
      <v-btn size="small" color="primary" variant="flat" @click="onBaru">
        + Baru
      </v-btn>
      <v-btn size="small" variant="tonal" color="success" @click="doExport">
        <template #prepend><IconFileSpreadsheet :size="13" :stroke-width="1.8" /></template>
        Export
      </v-btn> 
      
    </template>

    <template #item.TOTAL="{ item }">
      <div class="tr font-weight-bold text-blue-darken-4">{{ fmtCurrency(item.TOTAL) }}</div>
    </template>

    <template #item.BAYAR="{ item }">
      <div class="tr font-weight-bold text-blue-darken-4">{{ fmtCurrency(item.BAYAR) }}</div>
    </template>
    <template #item.KEMBALI="{ item }">
      <div class="tr font-weight-bold text-blue-darken-4">{{ fmtCurrency(item.KEMBALI) }}</div>
    </template>
    <template #detail="{ item }">
    <div class="detail-wrap">
      <table class="detail-tbl">
        <thead>
          <tr>
            <th style="width:36px" class="tc">No</th>
            <th style="width:130px">Barcode / Kode</th>
            <th style="min-width:220px">Nama Barang</th>
            <th style="width:80px" class="tc">Satuan</th>
            <th style="width:70px" class="tr">Qty</th>
            <th style="width:110px" class="tr">Harga Satuan</th>
            <th style="width:70px" class="tr">Disc (%)</th>
            <th style="width:120px" class="tr">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          
          <tr v-for="(d, idx) in getDetail(item.nota || item.NOTA)" :key="idx">
            <td class="tc" style="color:#6b7280; font-weight:bold;">{{ idx + 1 }}</td>
            <td><span class="mono">{{ d.barcode || d.brgKode }}</span></td>
            <td class="font-weight-bold" style="color:#1f2937;">{{ d.brgNama || d.NamaBarang }}</td>
            <td class="tc">{{ d.satuan || d.Satuan }}</td>
            <td class="tr font-weight-bold text-blue">{{ d.qty || d.Qty }}</td>
            <td class="tr text-green-darken-4">Rp {{ fmtCurrency(d.harga || d.Harga) }}</td>
            <td class="tr text-red">{{ d.discPr || d.DiscPr || 0 }}%</td>
            <td class="tr font-weight-bold" style="color:#374151;">
              Rp {{ fmtCurrency((d.qty || d.Qty) * (d.harga || d.Harga) - (((d.qty || d.Qty) * (d.harga || d.Harga) * (d.discPr || d.DiscPr || 0)) / 100)) }}
            </td>
          </tr>
          <tr v-if="!getDetail(item.nota || item.NOTA).length">
            <td colspan="8" class="tc" style="color:#9e9e9e; font-style:italic; padding:12px">
              Tidak ada detail barang.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  <template #summary-row="{ filteredItems }">
        <span class="summary-lbl" style="color: white; font-weight: bold;">Total Retur</span>
        <span class="summary-val" style="color: white; font-weight: bold;">
          {{
            fmt(
              filteredItems.reduce(
                (s: number, r: any) => s + Number(r.TOTAL),
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
.btn-act {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-print {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}
.btn-print:hover {
  background-color: #e5e7eb;
}
.btn-xls {
  background-color: #1010b9;
  color: white;
}
.btn-xls:hover {
  background-color: #050596;
}
.expand-wrapper {
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin: 8px 0;
}
.expand-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.expand-title h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.sub-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.sub-table th {
  background-color: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
.sub-table td {
  padding: 8px 12px;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
.text-blue { color: #2563eb; }
.text-green { color: #1616a3; }
.font-mono { font-family: monospace; }
.tc { text-align: center; }
.tr { text-align: right; }
.font-bold { font-weight: bold; }
</style>