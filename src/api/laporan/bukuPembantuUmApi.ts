import api from "@/api/axios";

export interface UmRow {
  cusKode: string;
  cusNama: string;
  tanggal: string;
  jenis: "MASUK" | "PAKAI";
  nomor: string;
  keterangan: string;
  masuk: number;
  pakai: number;
  saldo: number;
}

export interface UmCustomerSummary {
  cusKode: string;
  cusNama: string;
  saldoAwal: number;
  masuk: number;
  pakai: number;
  saldoAkhir: number;
}

export interface UmReportTotal {
  saldoAwal: number;
  masuk: number;
  pakai: number;
  saldoAkhir: number;
}

export interface UmReport {
  rekUm: string;
  startDate: string;
  endDate: string;
  cusKode: string;
  rows: UmRow[];
  summary: UmCustomerSummary[];
  total: UmReportTotal;
}

export const bukuPembantuUmApi = {
  getReport: async (params: {
    startDate: string;
    endDate: string;
    cusKode?: string;
  }): Promise<UmReport> => {
    const { data } = await api.get("/laporan/buku-pembantu-um", { params });
    return data.data as UmReport;
  },
};
