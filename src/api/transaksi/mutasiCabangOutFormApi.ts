import api from "@/api/axios";

export interface MutasiCabangDetail {
  no?: number;
  sku: string;
  namaBarang: string;
  satuan: string;
  qty: number;
  expired: string;
  keterangan: string;
  harga: number;
  gudang?: string;
  stok?: number;
}

export interface MutasiCabangForm {
  isEdit: boolean;
  nomor: string;
  tanggal: string;
  cabangAsal: string;
  cabangTujuan: string;
  gudang: string;
  keterangan: string;
  detail: MutasiCabangDetail[];
}

export interface SkuOption {
  sku: string;
  expired: string | null;
  namaBarang: string;
  satuan: string;
  stok: number;
  harga: number;
}

export const mutasiCabangOutFormApi = {
  getNomor: (tanggal: string, cabangAsal: string) =>
    api
      .get("/transaksi/mutasi-out/form/nomor", { params: { tanggal, cabangAsal } })
      .then((r) => r.data.data.nomor as string),

  getCabang: () =>
    api.get("/transaksi/mutasi-out/form/cabang").then((r) => r.data.data as { kode: string; nama: string }[]),

  getGudang: (cabangAsal: string) =>
    api
      .get("/transaksi/mutasi-out/form/gudang", { params: { cabangAsal } })
      .then((r) => r.data.data as { kode: string; nama: string }[]),

  searchSKU: (gudang: string, q = "") =>
    api
      .get("/transaksi/mutasi-out/form/sku", { params: { gudang, q } })
      .then((r) => r.data.data as SkuOption[]),

  getForm: (nomor: string) =>
    api
      .get(`/transaksi/mutasi-out/form/form/${encodeURIComponent(nomor)}`)
      .then((r) => r.data.data),

  save: (payload: MutasiCabangForm) =>
    api.post("/transaksi/mutasi-out/form/save", payload).then((r) => r.data),
};
