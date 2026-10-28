import api from "@/api/axios";

export interface SpkDetail {
  id: number;
  urutan: number;
  nama: string;
  target: number;
  selesai: number;
  finalisasi?: number | null;
  jasa?: number | null; // 1 = tahap dari proses Jasa (snapshot prsd_jasa)
  // ⚠️ pic / tglMulai / tglSelesai / keterangan DIHAPUS (2026-10-08).
  // Kolomnya di-drop dari tspk_dtl karena tidak pernah diisi dari layar,
  // dan `update()` sudah dinonaktifkan di backend (selalu throw).
  status: "Belum Mulai" | "Proses" | "Selesai";
}

export interface SpkKategoriProses {
  kode: string;
  nama: string | null;
  keterangan: string | null;
  jasa?: number; // 1 = proses jasa (1 tahap, tanpa finalisasi stok)
}

// ⬇️ BARU: type untuk item template tahapan (bukan tahapan SPK yang sudah jalan)
export interface SpkMasterProsesDetail {
  id: number;
  urutan: number;
  nama: string;
  jasa?: number; // 1 = tahap dari proses Jasa
}

export interface SpkSyncTahapResult {
  added: number;
  stages: { urutan: number; nama: string; target: number }[];
}

export const spkDetailApi = {
  // Backfill tahap Master Proses yang belum masuk ke SPK lama.
  syncTahap: (nomor: string) =>
    api
      .post(`/transaksi/spk/tahapan/sync/${encodeURIComponent(nomor)}`)
      .then((r) => r.data as { success: boolean; message: string; data: SpkSyncTahapResult }),

  getKategoriList: () =>
    api.get(`/transaksi/spk/tahapan/kategori`).then((r) => r.data.data as SpkKategoriProses[]),

  // ⬇️ BARU: inilah fungsi yang dipanggil di form tapi sebelumnya tidak ada
  getTahapanByProses: (prsKode: string) =>
    api
      .get(`/transaksi/spk/tahapan/template/${encodeURIComponent(prsKode)}`)
      .then((r) => r.data.data as SpkMasterProsesDetail[]),

  getBySpk: (nomor: string) =>
    api.get(`/transaksi/spk/tahapan/${encodeURIComponent(nomor)}`).then((r) => r.data.data as SpkDetail[]),

  // ⚠️ Endpoint ini sudah dinonaktifkan di backend (selalu throw).
  // Jangan dipakai lagi — belum ada layar yang memanggilnya.
  update: (id: number, payload: Partial<SpkDetail>) =>
    api.put(`/transaksi/spk/tahapan/${id}`, payload).then((r) => r.data),
};