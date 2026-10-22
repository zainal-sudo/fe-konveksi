import api from "@/api/axios";

export interface MutasiCabangInDetail {
  no?: number;
  sku: string;
  namaBarang: string;
  satuan: string;
  qty: number;
  expired: string;
  keterangan: string;
  harga: number;
}

export interface MutasiCabangInForm {
  isEdit: boolean;
  nomor: string;
  tanggal: string;
  nomorMutasi: string;
  cabangAsal: string;
  cabangTujuan: string;
  gudang: string;
  detail: MutasiCabangInDetail[];
}

export interface MuOutOption {
  nomor: string;
  tanggal: string;
  asal: string;
  tujuan: string;
}

export const mutasiCabangInFormApi = {
  getNomor: (tanggal: string, cabangTujuan: string) =>
    api
      .get("/transaksi/mutasi-in/form/nomor", { params: { tanggal, cabangTujuan } })
      .then((r) => r.data.data.nomor as string),

  getCabang: () =>
    api.get("/transaksi/mutasi-in/form/cabang").then((r) => r.data.data as { kode: string; nama: string }[]),

  getGudang: (cabangTujuan: string) =>
    api
      .get("/transaksi/mutasi-in/form/gudang", { params: { cabangTujuan } })
      .then((r) => r.data.data as { kode: string; nama: string }[]),

  searchMuOut: (cabangTujuan: string) =>
    api
      .get("/transaksi/mutasi-in/form/muout", { params: { cabangTujuan } })
      .then((r) => r.data.data as MuOutOption[]),

  loadMutasi: (nomorMutasi: string) =>
    api
      .get("/transaksi/mutasi-in/form/load", { params: { nomor: nomorMutasi } })
      .then((r) => r.data.data),

  getForm: (nomor: string) =>
    api
      .get(`/transaksi/mutasi-in/form/form/${encodeURIComponent(nomor)}`)
      .then((r) => r.data.data),

  save: (payload: MutasiCabangInForm) =>
    api.post("/transaksi/mutasi-in/form/save", payload).then((r) => r.data),
};
