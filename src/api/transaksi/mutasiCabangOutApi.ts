import api from "@/api/axios";

export interface MutasiCabangRow {
  Nomor: string;
  Tanggal: string;
  Asal: string;
  Tujuan: string;
  Gudang: string;
  Keterangan: string;
  Realisasi: string;
}

export interface MutasiCabangDetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Jumlah: number;
  Expired: string | null;
  Keterangan: string;
  Gudang: string;
}

export const mutasiCabangOutApi = {
  getBrowse: async (startDate: string, endDate: string, cabang = "ALL") => {
    const { data } = await api.get("/transaksi/mutasi-out", {
      params: { startDate, endDate, cabang },
    });
    return data.data as MutasiCabangRow[];
  },
  getDetail: async (nomor: string) => {
    const { data } = await api.get(
      `/transaksi/mutasi-out/detail/${encodeURIComponent(nomor)}`
    );
    return data.data as MutasiCabangDetailRow[];
  },
  hapus: async (nomor: string) => {
    const { data } = await api.delete(
      `/transaksi/mutasi-out/${encodeURIComponent(nomor)}`
    );
    return data as { success: boolean; message?: string };
  },
  getPrintData: async (nomor: string) => {
    const { data } = await api.get(
      `/transaksi/mutasi-out/print/${encodeURIComponent(nomor)}`
    );
    return data.data;
  },
};
