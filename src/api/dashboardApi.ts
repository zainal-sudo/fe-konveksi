import apiClient from "./axios";

export interface DashboardSummary {
  kasbon: { count: number; total: number };
  transfer: { count: number; total: number };
  setoran: { count: number };
  serverDate: string;
  // Tambahan:
  saldoKas: { account: string; saldo: number };
  rekon: { selisihCount: number };
  stok: { negativeCount: number };
  voucherPt: { count: number; total: number };
  hutang: { count: number; total: number };
}

export interface SalesWidget {
  isPusat: boolean;
  userPusat: boolean;
  scopeCabang: string;
  daftarCabang: { kode: string; nama: string }[];
  cabang: string;
  bulan: {
    penjualan: number;
    penjualanPrev: number;
    deltaPct: number | null;
    nota: number;
    notaPrev: number;
    cash: number;
    piutangBaru: number;
  };
  harian: { tanggal: string; nilai: number; nota: number }[];
  perCabang: {
    cabang: string;
    nama: string;
    bulanIni: number;
    bulanLalu: number;
    nota: number;
  }[];
  komposisi: {
    dp: number;
    card: number;
    voucher: number;
    piutang: number;
  };
  piutang: {
    nota: number;
    total: number;
    top: { nomor: string; tanggal: string; customer: string; sisa: number }[];
  };
  topCustomer: { nama: string; nilai: number; nota: number }[];
  terbaru: {
    nomor: string;
    tanggal: string;
    customer: string;
    total: number;
    sisaPiutang: number;
    closed: boolean;
  }[];
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get("/dashboard/summary");
    return data.data;
  },
  getSales: async (cabang?: string): Promise<SalesWidget> => {
    const { data } = await apiClient.get("/dashboard/sales", {
      params: cabang ? { cabang } : {},
    });
    return data.data;
  },
};
