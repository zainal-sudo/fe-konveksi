<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { isAuthExpiredError } from "@/api/axios";
import { IconWallet, IconRefresh, IconPrinter } from "@tabler/icons-vue";
import {
  bukuPembantuUmApi,
  type UmReport,
  type UmRow,
  type UmCustomerSummary,
} from "@/api/laporan/bukuPembantuUmApi";
import { bayarCustomerApi, type CustomerOpt } from "@/api/transaksi/bayarCustomerApi";
import { exportBukuPembantuUm } from "@/utils/exportExcel";

const toast = useToast();

// ── Periode ───────────────────────────────────────────────────────────
const STORAGE_KEY = "finance_filter_buku_pembantu_um";

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
  } catch {
    /* silent */
  }
  return null;
};

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const saved = getSaved();

const startDate = ref(saved?.startDate ?? getLocal(firstDay));
const endDate = ref(saved?.endDate ?? getLocal(now));

// ── Filter customer (boleh kosong = semua) ────────────────────────────
const cusKode = ref(saved?.cusKode ?? "");
const cusNama = ref(saved?.cusNama ?? "");

// ── Data ──────────────────────────────────────────────────────────────
const report = ref<UmReport | null>(null);
const isLoading = ref(false);

const loadData = async () => {
  isLoading.value = true;
  try {
    report.value = await bukuPembantuUmApi.getReport({
      startDate: startDate.value,
      endDate: endDate.value,
      cusKode: cusKode.value,
    });
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const saveFilter = () => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        startDate: startDate.value,
        endDate: endDate.value,
        cusKode: cusKode.value,
        cusNama: cusNama.value,
      })
    );
  } catch {
    /* silent */
  }
};

const onFilterChange = saveFilter;

// ── Modal search customer ─────────────────────────────────────────────
const showModal = ref(false);
const modalSearch = ref("");
const modalLoading = ref(false);
const modalItems = ref<CustomerOpt[]>([]);

const openModal = async () => {
  showModal.value = true;
  modalSearch.value = "";
  if (modalItems.value.length) return;
  await doSearchCustomer();
};

const doSearchCustomer = async () => {
  modalLoading.value = true;
  try {
    modalItems.value = await bayarCustomerApi.searchCustomer(
      modalSearch.value
    );
  } catch (e: any) {
    if (!isAuthExpiredError(e))
      toast.error(e.response?.data?.message ?? "Gagal memuat customer.");
  } finally {
    modalLoading.value = false;
  }
};

const selectCustomer = (c: CustomerOpt) => {
  cusKode.value = c.kode;
  cusNama.value = c.nama;
  showModal.value = false;
  saveFilter();
  loadData();
};

const clearCustomer = () => {
  cusKode.value = "";
  cusNama.value = "";
  saveFilter();
  loadData();
};

// ── Grouping per customer ─────────────────────────────────────────────
const groups = computed(() => {
  const rep = report.value;
  if (!rep) return [];
  const rowsByCus = new Map<string, UmRow[]>();
  for (const r of rep.rows) {
    if (!rowsByCus.has(r.cusKode)) rowsByCus.set(r.cusKode, []);
    rowsByCus.get(r.cusKode)!.push(r);
  }
  return rep.summary.map(
    (s: UmCustomerSummary) => ({ info: s, rows: rowsByCus.get(s.cusKode) || [] })
  );
});

// ── Formatting ────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

// ── Export ────────────────────────────────────────────────────────────
const doExport = async () => {
  if (!report.value || !report.value.summary.length)
    return toast.warning("Tidak ada data untuk diexport.");
  await exportBukuPembantuUm({
    groups: groups.value,
    total: report.value.total,
    rekUm: report.value.rekUm,
    startDate: startDate.value,
    endDate: endDate.value,
    customer: cusKode.value ? `${cusKode.value} - ${cusNama.value}` : "Semua Customer",
  });
};
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div class="head-info">
        <div class="head-ico">
          <IconWallet :size="22" :stroke-width="1.6" />
        </div>
        <div>
          <div class="head-title">Buku Pembantu Uang Muka Penjualan</div>
          <div class="head-sub">
            Deposit customer (Penerimaan Lain-Lain) dan pemakaiannya di nota —
            akun {{ report?.rekUm || "19.001" }}
          </div>
        </div>
      </div>
      <div class="head-tools">
        <div class="filter-group">
          <span class="filter-lbl">Periode</span>
          <input
            v-model="startDate"
            type="date"
            class="date-inp"
            @change="onFilterChange(); loadData()"
          />
          <span class="filter-sep">s/d</span>
          <input
            v-model="endDate"
            type="date"
            class="date-inp"
            @change="onFilterChange(); loadData()"
          />
        </div>
        <div class="filter-group">
          <span class="filter-lbl">Customer</span>
          <input
            :value="cusKode ? `${cusKode} - ${cusNama}` : 'Semua Customer'"
            readonly
            class="cus-inp"
            @click="openModal"
          />
          <button class="tb-btn" @click="openModal">…</button>
          <button v-if="cusKode" class="tb-btn" @click="clearCustomer">
            Semua
          </button>
        </div>
        <button class="tb-btn" :disabled="isLoading" @click="loadData">
          <IconRefresh :size="13" :stroke-width="2" />
          Refresh
        </button>
        <button class="tb-btn" @click="doExport">
          <IconPrinter :size="13" :stroke-width="2" />
          Export
        </button>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width: 40px" class="tc">No</th>
            <th style="width: 95px" class="tc">Tanggal</th>
            <th style="width: 80px" class="tc">Jenis</th>
            <th style="width: 150px">Nomor</th>
            <th style="min-width: 220px">Keterangan</th>
            <th style="width: 120px" class="tr">Masuk</th>
            <th style="width: 120px" class="tr">Pakai</th>
            <th style="width: 130px" class="tr">Saldo</th>
          </tr>
        </thead>
        <tbody v-for="g in groups" :key="g.info.cusKode">
          <!-- Baris saldo awal -->
          <tr class="saldo-awal-row">
            <td colspan="4">
              <span class="bold">{{ g.info.cusNama || g.info.cusKode }}</span>
              <span class="cus-kode"> ({{ g.info.cusKode }})</span>
            </td>
            <td class="awal-lbl">Saldo Awal</td>
            <td class="tr num awal-lbl">—</td>
            <td class="tr num awal-lbl">—</td>
            <td
              class="tr num bold"
              :class="g.info.saldoAwal < 0 ? 'neg' : ''"
            >
              {{ fmt(g.info.saldoAwal) }}
            </td>
          </tr>
          <!-- Transaksi -->
          <tr v-for="(r, idx) in g.rows" :key="r.nomor">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="tc">{{ fmtDate(r.tanggal) }}</td>
            <td class="tc">
              <span
                class="badge-jenis"
                :class="r.jenis === 'MASUK' ? 'badge-masuk' : 'badge-pakai'"
              >
                {{ r.jenis }}
              </span>
            </td>
            <td class="mono">{{ r.nomor }}</td>
            <td class="ket">{{ r.keterangan }}</td>
            <td class="tr num masuk-num">{{ fmt(r.masuk) }}</td>
            <td class="tr num pakai-num">
              {{ r.pakai ? fmt(r.pakai) : "—" }}
            </td>
            <td class="tr num" :class="r.saldo < 0 ? 'neg' : ''">
              {{ fmt(r.saldo) }}
            </td>
          </tr>
          <tr v-if="!g.rows.length">
            <td colspan="8" class="empty-td">
              Tidak ada mutasi dalam periode ini.
            </td>
          </tr>
          <!-- Sub total -->
          <tr class="sub-row">
            <td colspan="5" class="tr bold">Sub Total</td>
            <td class="tr num bold">{{ fmt(g.info.masuk) }}</td>
            <td class="tr num bold">{{ fmt(g.info.pakai) }}</td>
            <td class="tr num bold">{{ fmt(g.info.saldoAkhir) }}</td>
          </tr>
        </tbody>

        <tbody v-if="!isLoading && !groups.length">
          <tr>
            <td colspan="8" class="empty-td">
              Belum ada uang muka. Terima uang muka lewat Penerimaan
              Lain-Lain dengan akun uang muka penjualan setelah
              transaksi customer dipilih.
            </td>
          </tr>
        </tbody>

        <tfoot v-if="groups.length">
          <tr class="sum-row">
            <td colspan="5" class="tr bold">TOTAL</td>
            <td class="tr num bold">{{ fmt(report?.total?.masuk ?? 0) }}</td>
            <td class="tr num bold">{{ fmt(report?.total?.pakai ?? 0) }}</td>
            <td class="tr num bold">
              {{ fmt(report?.total?.saldoAkhir ?? 0) }}
            </td>
          </tr>
        </tfoot>
      </table>
      <div v-if="isLoading" class="loading-bar">Memuat data…</div>
    </div>

    <!-- ── Modal customer ── -->
    <v-dialog v-model="showModal" max-width="560" scroll-strategy="reposition">
      <div class="modal-card">
        <div class="modal-head">
          <span>Pilih Customer</span>
          <div class="modal-search">
            <input
              v-model="modalSearch"
              type="text"
              placeholder="Cari kode / nama…"
              @keydown.enter="doSearchCustomer"
            />
            <button class="tb-btn" @click="doSearchCustomer">Cari</button>
          </div>
        </div>
        <div class="modal-list">
          <div
            v-for="c in modalItems"
            :key="c.kode"
            class="modal-row"
            @click="selectCustomer(c)"
          >
            <span class="mono modal-kode">{{ c.kode }}</span>
            <span>{{ c.nama }}</span>
          </div>
          <div v-if="!modalItems.length && !modalLoading" class="modal-empty">
            Customer tidak ditemukan.
          </div>
          <div v-if="modalLoading" class="modal-empty">Memuat…</div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 16px 20px;
  background: #f4f6fa;
  min-height: calc(100vh - 56px);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.head-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.head-ico {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-primary, #3b5998);
  color: white;
}

.head-title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
}

.head-sub {
  font-size: 12px;
  color: #6b7280;
}

.head-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.filter-sep {
  font-size: 12px;
  color: #9ca3af;
}

.date-inp {
  height: 32px;
  border: 1px solid var(--ds-border, #a0aab8);
  border-radius: 0;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 140px;
  background: white;
}

.date-inp:focus {
  border-color: var(--ds-primary, #3b5998);
}

.cus-inp {
  height: 32px;
  border: 1px solid var(--ds-border, #a0aab8);
  border-radius: 0;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 200px;
  background: white;
  cursor: pointer;
  color: #1f2937;
}

.tb-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ds-border, #a0aab8);
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tbl-wrap {
  background: white;
  padding-bottom: 1px;
  border: 1px solid var(--ds-border, #a0aab8);
}

.data-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-tbl thead tr {
  background: var(--ds-primary, #3b5998);
}

.data-tbl th {
  color: white;
  font-weight: 700;
  padding: 6px 8px;
  white-space: nowrap;
  text-align: left;
}

.data-tbl th.tr {
  text-align: right;
}
.data-tbl th.tc {
  text-align: center;
}

.data-tbl td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
  vertical-align: top;
}

.data-tbl tbody tr:hover td,
.data-tbl tbody tr:hover td.awal-lbl {
  background: var(--ds-primary-50, #e8edf5);
}

.saldo-awal-row td {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.saldo-awal-row td.awal-lbl {
  color: #6b7280;
  font-style: italic;
  font-size: 11px;
}

.cus-kode {
  color: #6b7280;
  font-size: 11px;
}

.ket {
  white-space: normal;
  max-width: 320px;
}

.badge-jenis {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.badge-masuk {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-pakai {
  background: #fce4ec;
  color: #c62828;
}

.masuk-num {
  color: #2e7d32;
}

.pakai-num {
  color: #c62828;
}

.neg {
  color: #c62828;
  font-weight: 700;
}

.sub-row td {
  background: #f0f0fd;
  border-top: 1px solid var(--ds-border, #a0aab8);
  font-size: 11px;
}

.sum-row td {
  background: #f9fafb;
  border-top: 2px solid var(--ds-primary, #3b5998);
}

.sum-row.thin td {
  border-top: none;
  color: #6b7280;
  font-size: 11px;
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
.num {
  font-variant-numeric: tabular-nums;
}

.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
}

.loading-bar {
  padding: 10px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

/* ── Modal ── */
.modal-card {
  background: white;
  border: 1px solid var(--ds-border, #a0aab8);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--ds-primary, #3b5998);
  color: white;
  font-weight: 700;
  font-size: 13px;
}

.modal-search {
  display: flex;
  gap: 6px;
}

.modal-search input {
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 0;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 200px;
}

.modal-list {
  max-height: 45vh;
  overflow-y: auto;
}

.modal-row {
  display: flex;
  gap: 10px;
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.modal-row:hover {
  background: var(--ds-primary-50, #e8edf5);
}

.modal-kode {
  color: var(--ds-primary, #3b5998);
  font-weight: 700;
  min-width: 70px;
}

.modal-empty {
  padding: 14px;
  font-size: 12px;
  color: #9e9e9e;
  text-align: center;
  font-style: italic;
}
</style>
