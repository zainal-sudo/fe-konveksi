import api from "@/api/axios";

export interface MutasiCabangInRow {
  Nomor: string;
  Tanggal: string;
  Asal: string;
  Tujuan: string;
  Gudang: string;
  NoMutasiOut: string;
}

export interface MutasiCabangInDetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Jumlah: number;
  Expired: string | null;
  Keterangan: string;
  Gudang: string;
}

export const mutasiCabangInApi = {
  getBrowse: async (startDate: string, endDate: string, cabang = "ALL") => {
    const { data } = await api.get("/transaksi/mutasi-in", {
      params: { startDate, endDate, cabang },
    });
    return data.data as MutasiCabangInRow[];
  },
  getDetail: async (nomor: string) => {
    const { data } = await api.get(
      `/transaksi/mutasi-in/detail/${encodeURIComponent(nomor)}`
    );
    return data.data as MutasiCabangInDetailRow[];
  },
};
