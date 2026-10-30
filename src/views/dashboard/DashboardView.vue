<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { systemApi, type SystemInfo } from "@/api/systemApi";
import {
  dashboardApi,
  type DashboardSummary,
  type SalesWidget,
} from "@/api/dashboardApi";
import Chart from "chart.js/auto";
import {
  IconLayoutDashboard,
  IconReceipt2,
  IconTransferOut,
  IconBook,
  IconAlertCircle,
  IconClock,
  IconInfoCircle,
  IconReceipt,
  IconTransfer,
  IconCalendar,
  IconBuildingBank,
  IconArrowsExchange,
  IconList,
  IconChevronRight,
  IconTrendingUp,
  IconTrendingDown,
  IconFileInvoice,
  IconShoppingCart,
  IconCash,
  IconCoin,
} from "@tabler/icons-vue";
import PageLayout from "@/components/PageLayout.vue";

const authStore = useAuthStore();
const router = useRouter();
const appVersion = __APP_VERSION__;

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
});

const canViewTransfer = computed(() => authStore.can("28", "view"));
const canViewSetoran = computed(() => authStore.can("29", "view"));
const canViewKasbon = computed(() => authStore.can("21", "view"));
const canViewBkk = computed(() => authStore.can("22", "view"));
const canViewJurnal = computed(() => authStore.can("26", "view"));
const canViewVoucher = computed(() => authStore.can("30", "view"));

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v);
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Jt`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} Rb`;
  return String(v);
};

const showChangelog = ref(false);
const systemInfo = ref<SystemInfo | null>(null);

const summaryData = ref<DashboardSummary>({
  kasbon: { count: 0, total: 0 },
  transfer: { count: 0, total: 0 },
  setoran: { count: 0 },
  serverDate: "",
  saldoKas: { account: "", saldo: 0 },
  rekon: { selisihCount: 0 },
  stok: { negativeCount: 0 },
  voucherPt: { count: 0, total: 0 },
  hutang: { count: 0, total: 0 },
});
const isSummaryLoading = ref(true);

onMounted(async () => {
  try {
    systemInfo.value = await systemApi.getInfo();
  } catch {
    /* silent */
  }
  try {
    summaryData.value = await dashboardApi.getSummary();
  } catch {
    /* silent */
  } finally {
    isSummaryLoading.value = false;
  }
  await loadSales();
});

const serverDateFormatted = computed(() => {
  if (!summaryData.value.serverDate) return "—";
  const [y, m, d] = summaryData.value.serverDate.split("-");
  return `${d}/${m}/${y}`;
});

// ── Widget Penjualan ────────────────────────────────────────────────
const salesData = ref<SalesWidget | null>(null);
const isSalesLoading = ref(true);
const salesCabangFilter = ref<string>("");
const salesBarRef = ref<HTMLCanvasElement | null>(null);
const salesDonutRef = ref<HTMLCanvasElement | null>(null);
let salesBarChart: any = null;
let salesDonutChart: any = null;

const loadSales = async () => {
  isSalesLoading.value = true;
  try {
    salesData.value = await dashboardApi.getSales(
      salesCabangFilter.value || undefined,
    );
  } catch {
    /* silent */
  } finally {
    isSalesLoading.value = false;
  }
  await nextTick();
  renderSalesCharts();
};

const onSalesCabangChange = () => loadSales();

onMounted(async () => {
  try {
    salesData.value = await dashboardApi.getSales();
  } catch {
    /* silent */
  } finally {
    isSalesLoading.value = false;
  }
  await nextTick();
  renderSalesCharts();
});

const renderSalesCharts = () => {
  const s = salesData.value;
  if (!s) return;
  if (salesBarRef.value) {
    salesBarChart?.destroy();
    salesBarChart = new Chart(salesBarRef.value, {
      type: "bar",
      data: {
        labels: s.harian.map((h) => h.tanggal.slice(8) + "/" + h.tanggal.slice(5, 7)),
        datasets: [
          {
            label: "Penjualan (Rp)",
            data: s.harian.map((h) => h.nilai),
            backgroundColor: "#3B5998",
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => fmtCompact(Number(v)),
              font: { size: 10 },
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }
  if (salesDonutRef.value) {
    salesDonutChart?.destroy();
    const k = s.komposisi;
    const jenisPembayaran: [string, number][] = [
      ["Cash (DP)", k.dp],
      ["Kartu", k.card],
      ["Voucher", k.voucher],
      ["Piutang (Kredit)", k.piutang],
    ];
    salesDonutChart = new Chart(salesDonutRef.value, {
      type: "doughnut",
      data: {
        labels: jenisPembayaran.map(([lbl, val]) =>
          val ? `${lbl} = Rp ${fmtCompact(val)}` : lbl,
        ),
        datasets: [
          {
            data: jenisPembayaran.map(([, val]) => val),
            backgroundColor: ["#43a047", "#1e88e5", "#fb8c00", "#c62828"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } },
        },
      },
    });
  }
};

// Chart data — proporsi tugas
const chartBars = computed(() => {
  const bars = [];
  if (canViewKasbon.value)
    bars.push({
      label: "Kasbon",
      count: summaryData.value.kasbon.count,
      color: "#ef5350",
    });
  if (canViewTransfer.value)
    bars.push({
      label: "Transfer",
      count: summaryData.value.transfer.count,
      color: "#ef6c00",
    });
  if (canViewSetoran.value)
    bars.push({
      label: "Setoran",
      count: summaryData.value.setoran.count,
      color: "#1565c0",
    });

  const total = bars.reduce((s, b) => s + b.count, 0);
  if (!total) return [];
  return bars.map((b) => ({
    ...b,
    pct: Math.round((b.count / total) * 100),
  }));
});
</script>

<template>
  <PageLayout
    title="Dashboard"
    :icon="IconLayoutDashboard"
    :desktop-mode="false"
    max-width="100%"
  >
    <div class="dash-wrap">
      <!-- ── Greeting ── -->
      <div class="dash-greeting">
        <div class="greeting-left">
          <h2 class="greeting-text">
            {{ greeting }},
            <span class="name">{{ authStore.userName || "User" }}</span> 👋
          </h2>
          <p class="greeting-sub">Entri Manufacture Management System</p>
        </div>
        <div class="info-pills">
          <div
            class="info-pill clickable"
            @click="showChangelog = true"
            title="Catatan rilis"
          >
            <IconInfoCircle :size="13" />
            <span>Version {{ appVersion }}</span>
          </div>
          <div class="info-pill">
            <IconLayoutDashboard :size="13" />
            <span>{{ authStore.userCabang || "—" }}</span>
          </div>
          <div class="info-pill">
            <IconCalendar :size="13" />
            <span v-if="isSummaryLoading">...</span>
            <span v-else>{{ serverDateFormatted }}</span>
          </div>
        </div>
      </div>

      <!-- ── Changelog Dialog ── -->
      <v-dialog v-model="showChangelog" max-width="500" scrollable>
        <v-card rounded="lg">
          <v-card-title
            class="pa-4 pb-2"
            style="
              font-size: 14px;
              font-weight: 700;
              border-top: 3px solid #3B5998;
            "
          >
            Catatan Rilis (Changelog)
          </v-card-title>
          <v-card-text class="pa-4 pt-2" style="max-height: 400px">
            <div v-if="systemInfo">
              <div class="mb-3 text-caption" style="color: #555">
                Versi: <strong>v{{ appVersion }}</strong>
              </div>
              <div
                v-for="(logs, version) in systemInfo.all_changelogs"
                :key="version"
                class="mb-4"
              >
                <div class="changelog-version">Versi {{ version }}</div>
                <ul class="changelog-list">
                  <li v-for="(log, idx) in logs" :key="idx">{{ log }}</li>
                </ul>
              </div>
            </div>
            <div v-else class="text-center text-caption" style="color: #999">
              Memuat...
            </div>
          </v-card-text>
          <v-card-actions class="pa-3" style="border-top: 1px solid #eee">
            <v-spacer />
            <v-btn variant="text" size="small" @click="showChangelog = false"
              >Tutup</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ── Saldo Kas — hero card ── -->
      <div class="saldo-hero" @click="router.push('/laporan/buku-besar')">
        <div class="saldo-hero-left">
          <div class="saldo-hero-label">
            <IconBuildingBank :size="14" />
            Saldo Kas — {{ summaryData.saldoKas?.account }}
          </div>
          <div class="saldo-hero-val">
            <span v-if="isSummaryLoading" class="saldo-loading">Memuat...</span>
            <span v-else>Rp {{ fmt(summaryData.saldoKas?.saldo ?? 0) }}</span>
          </div>
          <div class="saldo-hero-sub">
            Per hari ini · Klik untuk lihat Buku Besar
          </div>
        </div>
        <div class="saldo-hero-icon">
          <IconBuildingBank :size="36" color="rgba(255,255,255,0.3)" />
        </div>
      </div>

      <!-- ── Penjualan ── -->
      <div class="sales-head" style="margin-top: 24px">
        <h3 class="section-title" style="margin: 0">
          <IconShoppingCart :size="14" style="color: #2e7d32" />
          Penjualan
        </h3>
        <select
          v-if="salesData?.userPusat"
          v-model="salesCabangFilter"
          @change="onSalesCabangChange"
          class="sales-filter"
        >
          <option
            v-for="opt in salesData!.daftarCabang"
            :key="opt.kode"
            :value="opt.kode"
          >
            {{ opt.nama }}
          </option>
        </select>
      </div>
      <div v-if="isSalesLoading" class="sales-loading">Memuat data penjualan…</div>
      <template v-else-if="salesData">
        <!-- KPI -->
        <div class="sales-kpis">
          <div class="kpi-card kpi-blue">
            <div class="kpi-ico"><IconReceipt2 :size="18" /></div>
            <div>
              <div class="kpi-label">Penjualan Bulan Ini</div>
              <div class="kpi-val">Rp {{ fmtCompact(salesData.bulan.penjualan) }}</div>
              <div class="kpi-sub" v-if="salesData.bulan.deltaPct !== null">
                <IconTrendingUp v-if="salesData.bulan.deltaPct >= 0" :size="11" />
                <IconTrendingDown v-else :size="11" />
                {{ Math.abs(salesData.bulan.deltaPct).toFixed(1) }}% vs bulan lalu (Rp {{ fmtCompact(salesData.bulan.penjualanPrev) }})
              </div>
              <div class="kpi-sub" v-else>Bulan lalu: Rp {{ fmtCompact(salesData.bulan.penjualanPrev) }}</div>
            </div>
          </div>
          <div class="kpi-card kpi-green">
            <div class="kpi-ico"><IconCash :size="18" /></div>
            <div>
              <div class="kpi-label">Cash Masuk (DP/Kartu/Voucher)</div>
              <div class="kpi-val">Rp {{ fmtCompact(salesData.bulan.cash) }}</div>
              <div class="kpi-sub">{{ salesData.bulan.nota }} nota bulan ini · {{ salesData.bulan.notaPrev }} bulan lalu</div>
            </div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-ico"><IconAlertCircle :size="18" /></div>
            <div>
              <div class="kpi-label">Piutang Belum Lunas</div>
              <div class="kpi-val">Rp {{ fmtCompact(salesData.piutang.total) }}</div>
              <div class="kpi-sub">{{ salesData.piutang.nota }} nota · baru bulan ini Rp {{ fmtCompact(salesData.bulan.piutangBaru) }}</div>
            </div>
          </div>
        </div>

        <!-- Chart harian + komposisi -->
        <div class="sales-grid">
          <div class="sales-card">
            <div class="sales-card-title">Penjualan Harian (Bulan Ini)</div>
            <div class="chart-box">
              <canvas ref="salesBarRef"></canvas>
              <div v-if="!salesData.harian.length" class="chart-empty">Belum ada penjualan bulan ini</div>
            </div>
          </div>
          <div class="sales-card">
            <div class="sales-card-title">Cara Pembayaran</div>
            <div class="chart-box">
              <canvas ref="salesDonutRef"></canvas>
              <div v-if="salesData.bulan.nota === 0" class="chart-empty">Belum ada transaksi</div>
            </div>
          </div>
        </div>

        <!-- Cabang + top customer + piutang -->
        <div class="sales-grid3">
          <div v-if="salesData.isPusat" class="sales-card">
            <div class="sales-card-title">Per Cabang</div>
            <div
              v-for="c in salesData.perCabang"
              :key="c.cabang"
              class="row-item clickable"
              @click="router.push('/transaksi/penjualan')"
            >
              <span class="row-main">{{ c.cabang }} · {{ c.nama }}</span>
              <span class="row-val">Rp {{ fmtCompact(c.bulanIni) }}</span>
              <span class="row-sub">{{ c.nota }} nota · bulan lalu Rp {{ fmtCompact(c.bulanLalu) }}</span>
            </div>
            <div v-if="!salesData.perCabang.length" class="row-empty">Tidak ada data</div>
          </div>
          <div class="sales-card">
            <div class="sales-card-title">Top Customer (Bulan Ini)</div>
            <div v-for="(c, i) in salesData.topCustomer" :key="'tc'+i" class="row-item">
              <span class="row-main">{{ c.nama }}</span>
              <span class="row-val">Rp {{ fmtCompact(c.nilai) }}</span>
              <span class="row-sub">{{ c.nota }} nota</span>
            </div>
            <div v-if="!salesData.topCustomer.length" class="row-empty">Tidak ada data</div>
          </div>
          <div class="sales-card">
            <div class="sales-card-title">Piutang Tertunggak Teratas</div>
            <router-link
              v-for="(p, i) in salesData.piutang.top"
              :key="'pt'+i"
              :to="`/transaksi/bayarCustomer`"
              class="row-item clickable no-deco"
            >
              <span class="row-main mono">{{ p.nomor }}</span>
              <span class="row-val text-red">Rp {{ fmtCompact(p.sisa) }}</span>
              <span class="row-sub">{{ p.customer }} · {{ p.tanggal }}</span>
            </router-link>
            <div v-if="!salesData.piutang.top.length" class="row-empty">Semua piutang lunas</div>
          </div>
        </div>

        <!-- Terbaru -->
        <div class="sales-card" style="margin-top: 12px">
          <div class="sales-card-title">Nota Terbaru</div>
          <div class="terbaru-wrap">
            <router-link
              v-for="t in salesData.terbaru"
              :key="t.nomor"
              :to="`/transaksi/penjualan`"
              class="nota-chip no-deco"
              :title="t.customer"
            >
              <span class="mono">{{ t.nomor }}</span>
              <span class="nota-amt">Rp {{ fmtCompact(t.total) }}</span>
              <span v-if="t.sisaPiutang > 0" class="nota-badge warn">Piutang</span>
              <span v-else-if="!t.closed" class="nota-badge ok">Tunai</span>
              <span v-else class="nota-badge done">Closed</span>
            </router-link>
          </div>
          <div v-if="!salesData.terbaru.length" class="row-empty">Tidak ada transaksi</div>
        </div>
      </template>

      <!-- ── Tugas Menunggu ── -->
      <h3 class="section-title">
        <IconAlertCircle :size="14" style="color: #c62828" />
        Tugas Menunggu
      </h3>
      <div class="task-grid">
        <!-- Kasbon -->
        <div
          v-if="canViewKasbon"
          class="task-card task-red"
          @click="
            router.push({
              path: '/transaksi/uang-muka',
              query: { filter: 'pending' },
            })
          "
        >
          <div class="task-top">
            <div class="task-icon-wrap red">
              <IconAlertCircle :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.kasbon.count }}</span>
          </div>
          <div class="task-label">Kasbon Belum Selesai</div>
          <div class="task-sub">
            <span v-if="!isSummaryLoading"
              >Rp {{ fmtCompact(summaryData.kasbon.total) }}</span
            >
          </div>
        </div>

        <!-- Transfer -->
        <div
          v-if="canViewTransfer"
          class="task-card task-orange"
          @click="
            router.push({
              path: '/transaksi/pengajuan-transfer',
              query: { filter: 'pending' },
            })
          "
        >
          <div class="task-top">
            <div class="task-icon-wrap orange">
              <IconClock :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.transfer.count }}</span>
          </div>
          <div class="task-label">Transfer Menunggu</div>
          <div class="task-sub">
            <span v-if="!isSummaryLoading"
              >Rp {{ fmtCompact(summaryData.transfer.total) }}</span
            >
          </div>
        </div>

        <!-- Setoran -->
        <div
          v-if="canViewSetoran"
          class="task-card task-blue"
          @click="
            router.push({
              path: '/transaksi/terima-setoran',
              query: { filter: 'pending' },
            })
          "
        >
          <div class="task-top">
            <div class="task-icon-wrap blue">
              <IconReceipt :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.setoran.count }}</span>
          </div>
          <div class="task-label">Setoran Belum Verifikasi</div>
          <div class="task-sub">Klik untuk verifikasi</div>
        </div>

        <!-- Rekonsiliasi -->
        <div
          class="task-card"
          :class="
            summaryData.rekon?.selisihCount > 0 ? 'task-red' : 'task-green'
          "
          @click="router.push('/laporan/rekonsiliasi-bank')"
        >
          <div class="task-top">
            <div
              class="task-icon-wrap"
              :class="summaryData.rekon?.selisihCount > 0 ? 'red' : 'green'"
            >
              <IconArrowsExchange :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.rekon?.selisihCount ?? 0 }}</span>
          </div>
          <div class="task-label">Rekonsiliasi Selisih</div>
          <div class="task-sub">Bulan ini</div>
        </div>

        <!-- Stok Negatif -->
        <div
          class="task-card"
          :class="
            summaryData.stok?.negativeCount > 0 ? 'task-orange' : 'task-green'
          "
          @click="router.push('/laporan/stok-finance')"
        >
          <div class="task-top">
            <div
              class="task-icon-wrap"
              :class="summaryData.stok?.negativeCount > 0 ? 'orange' : 'green'"
            >
              <IconList :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.stok?.negativeCount ?? 0 }}</span>
          </div>
          <div class="task-label">Stok Finance Negatif</div>
          <div class="task-sub">
            {{
              summaryData.stok?.negativeCount > 0
                ? "Perlu perhatian"
                : "Semua normal"
            }}
          </div>
        </div>

        <!-- Voucher Belum PT -->
        <div
          v-if="canViewVoucher"
          class="task-card"
          :class="
            summaryData.voucherPt?.count > 0 ? 'task-orange' : 'task-green'
          "
          @click="
            router.push({
              path: '/transaksi/voucher-pembayaran',
              query: { filter: 'pending' },
            })
          "
        >
          <div class="task-top">
            <div
              class="task-icon-wrap"
              :class="summaryData.voucherPt?.count > 0 ? 'orange' : 'green'"
            >
              <IconReceipt2 :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.voucherPt?.count ?? 0 }}</span>
          </div>
          <div class="task-label">Voucher Belum PT</div>
          <div class="task-sub">
            <span v-if="!isSummaryLoading">
              Rp {{ fmtCompact(summaryData.voucherPt?.total ?? 0) }}
            </span>
          </div>
        </div>

        <!-- Daftar Hutang Belum Terbayar -->
        <div
          v-if="canViewVoucher"
          class="task-card"
          :class="summaryData.hutang?.count > 0 ? 'task-red' : 'task-green'"
          @click="router.push('/laporan/daftar-hutang')"
        >
          <div class="task-top">
            <div
              class="task-icon-wrap"
              :class="summaryData.hutang?.count > 0 ? 'red' : 'green'"
            >
              <IconFileInvoice :size="20" />
            </div>
            <IconChevronRight :size="14" class="task-arrow" />
          </div>
          <div class="task-count">
            <span v-if="isSummaryLoading">—</span>
            <span v-else>{{ summaryData.hutang?.count ?? 0 }}</span>
          </div>
          <div class="task-label">Hutang Belum Lunas</div>
          <div class="task-sub">
            <span v-if="!isSummaryLoading">
              Rp {{ fmtCompact(summaryData.hutang?.total ?? 0) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Chart proporsi tugas ── -->
      <div v-if="!isSummaryLoading && chartBars.length" class="chart-section">
        <h3 class="section-title">
          <IconTrendingUp :size="14" style="color: #3B5998" />
          Proporsi Tugas Menunggu
        </h3>
        <div class="bar-chart-wrap">
          <div v-for="bar in chartBars" :key="bar.label" class="bar-row">
            <div class="bar-lbl">{{ bar.label }}</div>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: bar.pct + '%', background: bar.color }"
              />
            </div>
            <div class="bar-info">
              <span class="bar-count">{{ bar.count }}</span>
              <span class="bar-pct">{{ bar.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Aksi Cepat ── -->
      <h3 class="section-title" style="margin-top: 28px">
        <IconTrendingUp :size="14" style="color: #3B5998" />
        Aksi Cepat
      </h3>
      <div class="quick-actions">
        <button
          v-if="canViewBkk"
          class="qa-btn"
          @click="router.push('/transaksi/bkk')"
        >
          <IconTransferOut :size="18" class="qa-icon" />
          <span>Buat BKK</span>
        </button>
        <button
          v-if="canViewKasbon"
          class="qa-btn"
          @click="router.push('/transaksi/uang-muka')"
        >
          <IconReceipt2 :size="18" class="qa-icon" />
          <span>Penyelesaian Kasbon</span>
        </button>
        <button
          v-if="canViewJurnal"
          class="qa-btn"
          @click="router.push('/transaksi/jurnal-umum')"
        >
          <IconBook :size="18" class="qa-icon" />
          <span>Jurnal Umum</span>
        </button>
        <button
          v-if="canViewSetoran"
          class="qa-btn"
          @click="router.push('/transaksi/terima-setoran')"
        >
          <IconReceipt :size="18" class="qa-icon" />
          <span>Terima Setoran</span>
        </button>
        <button
          v-if="canViewTransfer"
          class="qa-btn"
          @click="router.push('/transaksi/pengajuan-transfer')"
        >
          <IconTransfer :size="18" class="qa-icon" />
          <span>Pengajuan Transfer</span>
        </button>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.dash-wrap {
  width: 100%;
  max-width: 100%;
  padding: 4px 8px 32px;
}

/* ── Greeting ── */
.dash-greeting {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.greeting-text {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
}
.name {
  color: #3B5998;
}
.greeting-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}
.info-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.info-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f1f1f8;
  border: 1px solid #c8c8e6;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #3B5998;
}
.info-pill.clickable {
  cursor: pointer;
  transition: background 0.15s;
}
.info-pill.clickable:hover {
  background: #e8e8f5;
}

/* ── Saldo Hero ── */
.saldo-hero {
  background: linear-gradient(135deg, #3B5998, #3B5998);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  margin-bottom: 24px;
  transition: opacity 0.15s;
  box-shadow: 0 4px 16px rgba(46, 46, 125, 0.25);
}
.saldo-hero:hover {
  opacity: 0.92;
}
.saldo-hero-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.saldo-hero-val {
  font-size: 26px;
  font-weight: 800;
  color: white;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}
.saldo-loading {
  font-size: 14px;
  opacity: 0.7;
}
.saldo-hero-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

/* ── Section title ── */
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Task Grid ── */
.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.task-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}
.task-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.task-red::before {
  background: #ef5350;
}
.task-orange::before {
  background: #ef6c00;
}
.task-blue::before {
  background: #1565c0;
}
.task-green::before {
  background: #3B5998;
}

.task-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.task-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-icon-wrap.red {
  background: #ffebee;
  color: #c62828;
}
.task-icon-wrap.orange {
  background: #fff3e0;
  color: #ef6c00;
}
.task-icon-wrap.blue {
  background: #e3f2fd;
  color: #1565c0;
}
.task-icon-wrap.green {
  background: #e8e8f5;
  color: #3B5998;
}
.task-arrow {
  color: #9ca3af;
}

.task-count {
  font-size: 28px;
  font-weight: 800;
  color: #111;
  line-height: 1;
  margin-bottom: 4px;
}
.task-red .task-count {
  color: #c62828;
}
.task-orange .task-count {
  color: #e65100;
}
.task-blue .task-count {
  color: #1565c0;
}
.task-green .task-count {
  color: #3B5998;
}

.task-label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}
.task-sub {
  font-size: 10px;
  color: #9ca3af;
}

/* ── Bar Chart ── */
.chart-section {
  margin-bottom: 24px;
}
.bar-chart-wrap {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  width: 70px;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 10px;
  background: #f3f4f6;
  border-radius: 99px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease;
}
.bar-info {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 70px;
  flex-shrink: 0;
}
.bar-count {
  font-size: 12px;
  font-weight: 700;
  color: #111;
}
.bar-pct {
  font-size: 10px;
  color: #9ca3af;
}

/* ── Quick Actions ── */
.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.qa-btn {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}
.qa-btn:hover {
  border-color: #3B5998;
  background: #f1f1f8;
  color: #3B5998;
}
.qa-icon {
  color: #3B5998;
}

/* ── Changelog ── */
.changelog-version {
  font-size: 13px;
  font-weight: 700;
  color: #3B5998;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #e0e0e0;
}
.changelog-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #333;
}
.changelog-list li {
  margin-bottom: 3px;
}

/* ── Responsif ── */
@media (max-width: 768px) {
  .saldo-hero-val {
    font-size: 20px;
  }
  .task-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .task-count {
    font-size: 22px;
  }
  .dash-greeting {
    flex-direction: column;
    gap: 10px;
  }
}
@media (max-width: 480px) {
  .task-grid {
    grid-template-columns: 1fr 1fr;
  }
  .quick-actions .qa-btn span {
    display: none;
  }
  .quick-actions .qa-btn {
    padding: 10px;
  }
}

/* ── Widget Penjualan ── */
.sales-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.sales-filter {
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  background: #fff;
  outline: none;
  cursor: pointer;
}
.sales-filter:focus {
  border-color: #3b5998;
}
.sales-loading {
  background: #fff;
  border: 1px dashed #ccc;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: #888;
}

.sales-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}
@media (max-width: 900px) {
  .sales-kpis {
    grid-template-columns: 1fr;
  }
}
.kpi-card {
  background: #fff;
  border: 1px solid #e4e4ee;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.kpi-ico {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.kpi-blue .kpi-ico { background: #3b5998; }
.kpi-blue .kpi-val { color: #3b5998; }
.kpi-green .kpi-ico { background: #2e7d32; }
.kpi-green .kpi-val { color: #2e7d32; }
.kpi-orange .kpi-ico { background: #ef6c00; }
.kpi-orange .kpi-val { color: #ef6c00; }

.kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: #777;
  margin-bottom: 2px;
}
.kpi-val {
  font-size: 18px;
  font-weight: 700;
}
.kpi-sub {
  font-size: 10.5px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
}

.sales-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
@media (max-width: 900px) {
  .sales-grid {
    grid-template-columns: 1fr;
  }
}
.sales-grid3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 900px) {
  .sales-grid3 {
    grid-template-columns: 1fr;
  }
}
.sales-card {
  background: #fff;
  border: 1px solid #e4e4ee;
  border-radius: 10px;
  padding: 12px 14px;
}
.sales-card-title {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 10px;
}
.chart-box {
  position: relative;
  height: 200px;
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #aaa;
  font-style: italic;
}

.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f2f2f6;
  font-size: 12px;
}
.row-item:last-child {
  border-bottom: none;
}
.row-item.clickable {
  cursor: pointer;
}
.row-item.clickable:hover {
  background: #f8f8fc;
}
.row-main {
  flex: 1;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-val {
  font-weight: 700;
  color: #3b5998;
  white-space: nowrap;
}
.row-val.text-red {
  color: #c62828;
}
.row-sub {
  width: 100%;
  font-size: 10px;
  color: #999;
}
.row-empty {
  font-size: 11px;
  color: #aaa;
  font-style: italic;
  padding: 10px 0;
}
.mono {
  font-family: "Courier New", monospace;
  font-weight: 700;
  font-size: 11px;
}
.no-deco {
  text-decoration: none;
  display: flex;
  flex-wrap: wrap;
}

.terbaru-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.nota-chip {
  border: 1px solid #e4e4ee;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.nota-chip:hover {
  border-color: #3b5998;
  background: #f4f6fb;
}
.nota-amt {
  font-weight: 700;
  color: #3b5998;
}
.nota-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  text-transform: uppercase;
}
.nota-badge.warn { background: #fdecea; color: #c62828; }
.nota-badge.ok { background: #e8f5e9; color: #2e7d32; }
.nota-badge.done { background: #eceff1; color: #546e7a; }
</style>
