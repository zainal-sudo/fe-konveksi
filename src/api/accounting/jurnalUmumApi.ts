import api from "@/api/axios";

export interface JurnalUmumRow {
  Nomor: string;
  Tipe: string;
  Tanggal: string;
  Debet: number;
  Kredit: number;
  Keterangan: string;
  Closed: string;
}

export interface JurnalUmumDetailRow {
  Nomor: string;
  Account: string;
  NamaAccount: string;
  Debet: number;
  Kredit: number;
  Uraian: string;
}

export interface JUPerusahaan {
  nama: string;
  alamat: string;
  kota: string;
  notelp: string;
}

export interface JUPrintDetail {
  account: string;
  accountName: string;
  costCenter: string;
  debet: number;
}

export interface JUPrintData {
  nomor: string;
  tanggal: string;
  keterangan: string;
  rekkredit: string;
  kredit: number;
  terbilang: string;
  perusahaan: JUPerusahaan;
  detail: JUPrintDetail[];
}

export const jurnalUmumApi = {
  getBrowse: async (startDate: string, endDate: string) => {
    const { data } = await api.get("/accounting/jurnal-umum", {
      params: { startDate, endDate },
    });
    return data.data as JurnalUmumRow[];
  },
  getBrowseDetail: async (startDate: string, endDate: string) => {
    const { data } = await api.get("/accounting/jurnal-umum/detail", {
      params: { startDate, endDate },
    });
    return data.data as JurnalUmumDetailRow[];
  },
  getPrintData: async (nomor: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: JUPrintData;
    }>(`/accounting/jurnal-umum/print/${encodeURIComponent(nomor)}`);
    return data.data;
  },
  delete: async (nomor: string) => {
    const { data } = await api.delete(
      `/accounting/jurnal-umum/${encodeURIComponent(nomor)}`,
    );
    return data;
  },
};
