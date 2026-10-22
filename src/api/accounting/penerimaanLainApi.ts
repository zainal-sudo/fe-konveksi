import api from "@/api/axios";

export interface PenerimaanLainRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  IsClosed: string;
  Nilai: number;
}

export interface PenerimaanLainDetailRow {
  Nomor: string;
  Account: string;
  AccountName: string;
  Debet: number;
  Kredit: number;
  CostCenter: string;
}

export interface PenerimaanLainPrintData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  rekdebet: string;
  debet: number;
  terbilang: string;
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    notelp: string;
  };
  detail: {
    account: string;
    accountName: string;
    kredit: number;
    costCenter: string;
  }[];
}

export const penerimaanLainApi = {
  getBrowse: async (startDate: string, endDate: string): Promise<PenerimaanLainRow[]> => {
    const { data } = await api.get<{ success: boolean; data: PenerimaanLainRow[] }>(
      "/accounting/penerimaan-lain",
      { params: { startDate, endDate } }
    );
    return data.data;
  },

  getDetail: async (nomor: string): Promise<PenerimaanLainDetailRow[]> => {
    const { data } = await api.get<{ success: boolean; data: PenerimaanLainDetailRow[] }>(
      `/accounting/penerimaan-lain/detail/${encodeURIComponent(nomor)}`
    );
    return data.data;
  },

  // GET /accounting/penerimaan-lain/print/:nomor — data cetak Penerimaan Lain (browser print)
  getPrintData: async (nomor: string): Promise<PenerimaanLainPrintData> => {
    const { data } = await api.get<{ success: boolean; data: PenerimaanLainPrintData }>(
      `/accounting/penerimaan-lain/print/${encodeURIComponent(nomor)}`
    );
    return data.data;
  },

  delete: async (nomor: string): Promise<void> => {
    await api.delete(`/accounting/penerimaan-lain/${encodeURIComponent(nomor)}`);
  },
};
