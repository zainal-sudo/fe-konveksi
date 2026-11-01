import api from "@/api/axios";

export interface HarianPenjualanRow {
  Nomor: string;
  Tanggal: string;
  Customer: string;
  Memo: string;
  Pajak: string;
  Total: number;
  Ppn: number;
  Cash: number;
  Ongkir: number;
  Piutang: number;
  Card: number;
  Voucher: number;
  Status: string;
  Kirim: string;
}

export interface HarianLainRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  IsClosed: string;
  Nilai: number;
}

export interface HarianBayarCusRow {
  NOMOR: string;
  TANGGAL: string;
  CUS_NAMA: string;
  REK_KODE: string;
  REK_NAMA: string;
  TOTAL_BAYAR: number;
  MEMO: string;
  ISTAX: number;
  POSTING: number;
}

export interface HarianBrowseData {
  penjualan: HarianPenjualanRow[];
  penerimaanLain: HarianLainRow[];
  pembayaranLain: HarianLainRow[];
  bayarCustomer: HarianBayarCusRow[];
}

export interface HarianPrintData {
  tanggal: string;
  cabang: string;
  namaCabang: string;
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    notelp: string;
  };
  summary: {
    masukCash: number;
    masukTransfer: number;
    masukLain: number;
    voucher: number;
    piutang: number;
    keluarCash: number;
    keluarTransfer: number;
    keluarLain: number;
    setoranKas: number;
    sisaTransfer: number;
  };
  penjualanDetail: {
    nomor: string;
    tanggal: string;
    customer: string;
    cash: number;
    transfer: number;
    voucher: number;
    piutang: number;
    total: number;
  }[];
  penerimaanLain: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    nilai: number;
    rekKode: string;
    rekNama: string;
    metode: string;
  }[];
  pembayaranLain: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    nilai: number;
    rekKode: string;
    rekNama: string;
    metode: string;
  }[];
  bayarCustomer: {
    nomor: string;
    tanggal: string;
    customer: string;
    rekKode: string;
    rekNama: string;
    metode: string;
    nilai: number;
  }[];
}

export const harianApi = {
  getBrowse: async (tanggal: string): Promise<HarianBrowseData> => {
    const { data } = await api.get<{ success: boolean; data: HarianBrowseData }>(
      "/laporan/harian",
      { params: { tanggal } }
    );
    return data.data;
  },

  getPrintData: async (tanggal: string): Promise<HarianPrintData> => {
    const { data } = await api.get<{ success: boolean; data: HarianPrintData }>(
      "/laporan/harian/print",
      { params: { tanggal } }
    );
    return data.data;
  },
};
