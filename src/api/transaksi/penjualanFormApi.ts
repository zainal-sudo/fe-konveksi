import api from "@/api/axios";

export interface PenjualanDetail {
  no?: number;
  brgKode: number;
  brgNama: string;
  barcode: string;
  satuan: string;
  qty: number;
  harga: number;
  discPr: number;
  keterangan: string;
  isiCrt: number;
  isiLsn: number;
}

export interface PenjualanForm {
  isEdit: boolean;
  nomor: string;
  tanggal: string;
  cusKode: string;
  cusNama: string;
  cusAlamat?: string;
  cusTelp?: string;
  cusTop?: number;
  memo: string;
  isTax: number;
  discFakturPr: number;
  discFaktur: number;
  amount: number;
  taxAmount: number;
  ongkir?: number;
  bayar?: number; // cash/tunai diterima
  kembali?: number;
  dp?: number;
  voucher?: number;
  noVoucher?: string;
  card?: number;
  noCard?: string;
  bankCard?: string;
  piutang?: number;
  umPenjualan?: number;
  umNomor?: string;
  umNama?: string;
  umDetail?: UmDetailItem[];
  dateline: string;
  pemesan: string;
  detail: PenjualanDetail[];
}

export interface UmDetailItem {
  jurNo: string;
  nilai: number;
}

export interface CustomerDpResult {
  totalSisa: number;
  kurang: number;
  alokasi: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    nilai: number;
    sisa: number;
    alokasi: number;
  }[];
  list: UangMukaOption[];
}

export interface UangMukaOption {
  nomor: string;
  tanggal: string;
  keterangan: string;
  rek: string;
  rekNama: string;
  cusKode: string;
  cusNama: string;
  nilai: number;
  terpakai: number;
  sisa: number;
}

export const penjualanFormApi = {
  getCustomer: (search: string) =>
    api.get("/transaksi/penjualan/form/customer", { params: { search } }).then((r) => r.data.data),

  getBarang: (search: string) =>
    api.get("/transaksi/penjualan/form/barang", { params: { search } }).then((r) => r.data.data),

  getUangMuka: (cusKode: string, search = "", excludeNomor = "") =>
    api
      .get("/transaksi/penjualan/form/uang-muka", {
        params: { cusKode, search, excludeNomor },
      })
      .then((r) => r.data.data as UangMukaOption[]),

  getCustomerDp: (cusKode: string, target = 0, excludeNomor = "") =>
    api
      .get("/transaksi/penjualan/form/dp", {
        params: { cusKode, target, excludeNomor },
      })
      .then((r) => r.data.data as CustomerDpResult),

  getDetailForm: (nomor: string) =>
    api.get(`/transaksi/penjualan/form/form/${encodeURIComponent(nomor)}`).then((r) => r.data.data),

  save: (payload: PenjualanForm) =>
    api.post("/transaksi/penjualan/form/save", payload).then((r) => r.data),

  savePending: (payload: { cusKode?: string; memo?: string; detail: PenjualanDetail[] }) =>
    api.post("/transaksi/penjualan/form/pending-save", payload).then((r) => r.data),

  getPendingList: () =>
    api.get("/transaksi/penjualan/form/pending-list").then((r) => r.data.data),

  takePending: (noPending: string) =>
    api.post("/transaksi/penjualan/form/pending-take", { noPending }).then((r) => r.data.data),
};
