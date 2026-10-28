import api from "@/api/axios";

export interface SpkKomposisiRow {
  bahanKode: string;
  bahanNama: string;
  qtyPerUnit: number;
  satuan: string;
  urutan: number;
  spesifikasi: string | null;
}

// Satu baris kebutuhan bahan untuk satu SPK: hasil hitung
// qtyPerUnit x jumlah target dari tbarangkomposisi.
export interface SpkKebutuhanBahanRow {
  bahanKode: string;
  bahanNama: string;
  satuanBahan: string | null;
  qtyPerUnit: number;
  satuan: string;
  urutan: number;
  spesifikasi: string | null;
  totalDibutuhkan: number;
}

export interface SpkKebutuhanBahan {
  nomor: string;
  jumlah: number;
  brgKode: string;
  brgNama: string;
  satuan: string;
  bahan: SpkKebutuhanBahanRow[];
}

// Hasil PATCH /transaksi/spk/:nomor/close dan PATCH /transaksi/spk/:nomor/memo.
// `target` & `jadi` dikirim balik supaya form bisa menampilkan kalimat
// "target 100, jadi 76" tanpa refetch.
//
// Revisi 2026-10-05: memoClose bisa null — memo sekarang diisi TERPISAH,
// setelah status CLOSED, dan boleh dikosongkan.
export interface SpkCloseResult {
  nomor: string;
  isClosed: number;
  memoClose: string | null;
  closeUser: string | null;
  closeDate: string | null;
  target: number;
  jadi: number;
}

export const spkApi = {
  getBrowse: async (
    startDate: string,
    endDate: string,
    excludeSelesai?: boolean,
    excludeClosed?: boolean,
  ) => {
    const { data } = await api.get("/transaksi/spk", {
      params: {
        startDate,
        endDate,
        excludeSelesai: excludeSelesai ? "1" : undefined,
        excludeClosed: excludeClosed ? "1" : undefined,
      },
    });
    return data.data;
  },
  getDetail: async (nomor: string) => {
    const { data } = await api.get(`/transaksi/spk/detail/${encodeURIComponent(nomor)}`);
    return data.data;
  },
  getDetailAll: async (startDate: string, endDate: string) => {
    const { data } = await api.get("/transaksi/spk/detail-all", {
      params: { startDate, endDate },
    });
    return data.data;
  },
  delete: async (nomor: string) => {
    const { data } = await api.delete(`/transaksi/spk/${encodeURIComponent(nomor)}`);
    return data;
  },
  // Kebutuhan bahan untuk satu SPK (komposisi x jumlah target SPK).
  getKebutuhanBahan: async (nomor: string): Promise<SpkKebutuhanBahan> => {
    const { data } = await api.get(
      `/transaksi/spk/kebutuhan-bahan/${encodeURIComponent(nomor)}`,
    );
    return data.data;
  },
  getHistoryBySpk: async (spkNomor: string) => {
    const { data } = await api.get(`/transaksi/lhk/history/${encodeURIComponent(spkNomor)}`);
    return data.data;
  },
  // ⬅️ BARU: Bahan Baku & Kemasan (BOM) untuk cetak SPK — diambil dari
  // tbarangkomposisi berdasarkan kode barang jadi.
  getKomposisi: async (brgKode: string): Promise<SpkKomposisiRow[]> => {
    const { data } = await api.get(`/transaksi/spk/komposisi/${encodeURIComponent(brgKode)}`);
    return data.data;
  },
  // Close / update status SPK (revisi 2026-10-05). Memo TIDAK lagi syarat
  // di sini — backend menolak kalau tahap proses terakhir belum punya
  // laporan LHK. Parameter `memo` tetap ada (opsional) supaya form versi
  // lama yang mengirimnya tidak error.
  closeStatus: async (nomor: string, memo?: string) => {
    const { data } = await api.patch(`/transaksi/spk/${encodeURIComponent(nomor)}/close`, {
      memo: memo ?? "",
    });
    return data.data as SpkCloseResult;
  },
  // Memo/catatan hasil produksi. Backend hanya menerima kalau status SPK
  // sudah CLOSED. Boleh kosong (memo dihapus) dan boleh diubah berulang.
  updateMemo: async (nomor: string, memo: string) => {
    const { data } = await api.patch(`/transaksi/spk/${encodeURIComponent(nomor)}/memo`, { memo });
    return data.data as SpkCloseResult;
  },
};