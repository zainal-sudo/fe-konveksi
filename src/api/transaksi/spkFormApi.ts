import api from "@/api/axios";

export interface SpkForm {
  isEdit: boolean;
  nomor: string;
  nama: string;
  brgKode: number | string;
  brgNama: string;
  satuan: string;
  prsKode: string;
  prsNama?: string;
  custKode: string;
  custNama: string;
  tanggal: string;
  // ⬅️ OPSIONAL (revisi 2026-10-13) — boleh "" = belum ada tanggal kirim.
  dateline: string;
  jumlah: number;
  jumlahJadi: number;
  keterangan: string;
  idBatch: string;
  hasLhk?: boolean; // ⬅️ BARU: true kalau SPK ini sudah punya laporan LHK

  // ── Field baru (revisi 2026-10-09) ─────────────────────────────────
  // ⬅️ WAJIB (revisi 2026-10-13). Nilai kosong hanya mungkin pada SPK lama
  //    yang belum pernah diedit — backend menolak simpan kalau kosong.
  tanggalProduksi: string;
  shift: number;           // 1/2/3, default 1
  noPo: string;
  tanggalPo: string;       // opsional (PO belum selalu ada tanggal)
  // ⚠️ isClosed / memoClose / closeDate / closeUser TIDAK bisa diset dari
  // form biasa. Satu-satunya jalannya tombol "Update Status"
  // (PATCH /:nomor/close). Memo punya jalannya sendiri
  // (PATCH /:nomor/memo) dan hanya boleh dipakai setelah status CLOSED —
  // itu sebabnya kolom memo di header terkunci sebelum status ditutup.
  isClosed?: number;
  memoClose?: string | null;
  closeDate?: string | null;
  closeUser?: string | null;
  // ⬅️ BARU (revisi 2026-10-05): true kalau tahap proses terakhir sudah
  // punya minimal 1 laporan LHK → tombol "Update Status" terbuka.
  adaLhkFinal?: boolean;
}

export const spkFormApi = {
  getBarang: (search: string) =>
    api.get("/transaksi/spk/form/barang", { params: { search } }).then((r) => r.data.data),

  getCustomer: (search: string) =>
    api.get("/transaksi/spk/form/customer", { params: { search } }).then((r) => r.data.data),

  getDetailForm: (nomor: string) =>
    api.get(`/transaksi/spk/form/form/${encodeURIComponent(nomor)}`).then((r) => r.data.data),

  getInitData: (tanggal: string) =>
    api.get("/transaksi/spk/form/init", { params: { tanggal: tanggal || undefined } }).then((r) => r.data.data),

  save: (payload: SpkForm) =>
    api.post("/transaksi/spk/form/save", payload).then((r) => r.data),
};