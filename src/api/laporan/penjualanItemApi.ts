import api from "@/api/axios";

export interface PenjualanItemRow {
  Bulan: number;
  Tahun: number;
  Nota: string;
  Tanggal: string;
  Customer: string;
  Cabang: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Kategori: string;
  Qty: number;
  Nilai: number;
  Disc: number;
  Hpp: number;
  Margin: number;
}

export const penjualanItemApi = {
  // cabang: "all" (semua), "00" (pusat), atau kode cabang "01"/"02".
  // Hanya berlaku untuk user pusat; user cabang selalu dipaksa ke cabangnya.
  getPenjualanItem: async (startDate: string, endDate: string, cabang = "all") => {
    const { data } = await api.get("/laporan/penjualanitem", {
      params: { startDate, endDate, cabang },
    });
    return data.data as PenjualanItemRow[];
  },
};
