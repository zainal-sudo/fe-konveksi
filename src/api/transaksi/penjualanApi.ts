import api from "@/api/axios";

// Ganti isi interface ini di file penjualanApi.ts Anda
export interface DetailPenjualan {
  brgKode: number;       // Sesuai tipe INT pada sod_brg_kode
  brgSatuan: string;     // Sesuai sod_brg_satuan
  barangNama: string;    // Untuk keperluan display nama di tabel
  harga: number;         // Sesuai sod_harga
  qty: number;           // Sesuai sod_qty / sod_qtykasir
  discPr: number;        // Sesuai sod_discpr
  discRp: number;        // Sesuai sod_discrp
  hargaKasir: number;    // Sesuai sod_hargakasir
  subtotal: number;      // Nilai total bersih per baris item
  ktgKode?: string;      // Sesuai sod_ktg_kode (opsional)
  avgCost?: number;      // Sesuai sod_brg_avgcost (opsional)
  tipeHarga?: number;    // Sesuai sod_tipeharga (opsional)
}

export const penjualanApi = {
  getAll: async () => {
    const { data } = await api.get("/transaksi/penjualan");
    return data.data;
  },
  async getAllHistory(startDate: string, endDate: string) {
    const response = await api.get(
      `/transaksi/penjualan?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data;
  },
  getDetailHistory: async (nomor: string) => {
    const { data } = await api.get(`/transaksi/penjualan/detail/${encodeURIComponent(nomor)}`);
    return data.data;
  },
  getInitData: async () => {
    const { data } = await api.get("/transaksi/penjualan/init");
    return data.data;
  },
  saveData: async (payload: { header: any; details: DetailPenjualan[] }) => {
    const { data } = await api.post("/transaksi/penjualan/save", payload);
    return data;
  },
  async getCustomer(search: string = "") {
    const response = await api.get(`/transaksi/penjualan/customer?search=${search}`);
    return response.data.data; // Mengembalikan array [{ kode, nama }]
  },

    async savePending(payload: any) {
      const response = await api.post("/transaksi/penjualan/pending-save", payload);
      return response.data;
    },
  
    async getPendingList() {
      const response = await api.get("/transaksi/penjualan/pending-list");
      return response.data.data; // Mengembalikan array list nota pending
    },
  
    async takePending(noPending: string) {
      const response = await api.post("/transaksi/penjualan/pending-take", { noPending });
      return response.data.data; // Mengembalikan { header, details }
    }
 
};