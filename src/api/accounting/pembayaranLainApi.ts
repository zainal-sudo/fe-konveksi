import api from "@/api/axios";

export interface PembayaranLainRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  IsClosed: string;
  Nilai: number;
}

export interface PembayaranLainDetailRow {
  Nomor: string;
  Account: string;
  AccountName: string;
  Debet: number;
  Kredit: number;
  Keterangan: string;
  CostCenter: string;
}

export interface PembayaranLainPrintData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  rekkredit: string;
  kredit: number;
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
    debet: number;
    costCenter: string;
  }[];
}

export const pembayaranLainApi = {
  getBrowse: async (startDate: string, endDate: string): Promise<PembayaranLainRow[]> => {
    const { data } = await api.get<{ success: boolean; data: PembayaranLainRow[] }>(
      "/accounting/pembayaran-lain",
      { params: { startDate, endDate } }
    );
    return data.data;
  },

  getDetail: async (nomor: string): Promise<PembayaranLainDetailRow[]> => {
    const { data } = await api.get<{ success: boolean; data: PembayaranLainDetailRow[] }>(
      `/accounting/pembayaran-lain/detail/${encodeURIComponent(nomor)}`
    );
    return data.data;
  },

  // GET /kasbank/pembayaran-lain/print/:nomor — data cetak Pembayaran Lain (browser print)
  getPrintData: async (nomor: string): Promise<PembayaranLainPrintData> => {
    const { data } = await api.get<{ success: boolean; data: PembayaranLainPrintData }>(
      `/accounting/pembayaran-lain/print/${encodeURIComponent(nomor)}`
    );
    return data.data;
  },

  delete: async (nomor: string): Promise<void> => {
    await api.delete(`/accounting/pembayaran-lain/${encodeURIComponent(nomor)}`);
  },
};