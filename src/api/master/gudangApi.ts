import api from "@/api/axios";

export interface Gudang {
  kode: string;
  nama: string;
  penanggungjawab: string;
  keterangan: string;
  cabang: string;
  cabangNama?: string;
}

export interface CabangOption {
  kode: string;
  nama: string;
}

export const gudangApi = {
  getAll: async (): Promise<Gudang[]> => {
    const { data } = await api.get("/master/gudang");
    return data.data;
  },
  getCabang: async (): Promise<CabangOption[]> => {
    const { data } = await api.get("/master/gudang/cabang");
    return data.data;
  },
  save: async (payload: {
    isEdit: boolean;
    kode: string;
    nama: string;
    penanggungjawab: string;
    keterangan: string;
    cabang: string;
  }) => {
    const { data } = await api.post("/master/gudang/save", payload);
    return data;
  },
  delete: async (kode: string) => {
    const { data } = await api.delete(`/master/gudang/${encodeURIComponent(kode)}`);
    return data;
  },
};
