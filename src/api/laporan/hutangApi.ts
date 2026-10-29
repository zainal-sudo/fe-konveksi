import api from "@/api/axios";

export interface HutangRow {
  Nomor: string;
  Tanggal: string;
  JthTempo: string;
  SupKode: string;
  Supplier: string;
  Tax: string;
  NoBukti: string;
  Total: number;
  Retur: number;
  Bayar: number;
  SisaHutang: number;
  Overdue: number;
  RangeOverdue: string;
  Cabang: string;
}

export const hutangApi = {
  // Laporan hutang "per tanggal" (invoice outstanding s/d tanggal tsb)
  getHutang: async (tanggal: string) => {
    const { data } = await api.get("/laporan/hutang", {
      params: { tanggal },
    });
    return data.data as HutangRow[];
  },
};
