import api from "@/api/axios";

export interface NeracaAccount {
  kode: string;
  nama: string;
  saldo: number;
}

export interface NeracaGroup {
  key: string;
  label: string;
  accounts: NeracaAccount[];
  total: number;
}

export interface NeracaData {
  tanggal: string;
  aktiva: NeracaGroup[];
  pasiva: NeracaGroup[];
  labaRugi: number;
  total: {
    aktiva: number;
    akumulasiPenyusutan: number;
    kewajiban: number;
    ekuitas: number;
    selisih: number;
    balanced: boolean;
  };
}

export interface LabaRugiGroup {
  key: string;
  label: string;
  accounts: { kode: string; nama: string; saldo: number }[];
  total: number;
}

export interface LabaRugiData {
  periode: { start: string; end: string };
  cabang: string;
  groups: LabaRugiGroup[];
  total: {
    pendapatanPenjualan: number;
    hpp: number;
    labaKotor: number;
    bebanOperasional: number;
    labaOperasional: number;
    pendapatanLain: number;
    bebanNonOperasional: number;
    labaBersih: number;
  };
}

export const neracaApi = {
  getNeraca: async (endDate: string) => {
    const { data } = await api.get("/laporan/akunting/neraca", {
      params: { endDate },
    });
    return data.data as NeracaData;
  },
};

export const labaRugiApi = {
  getLabaRugi: async (startDate: string, endDate: string, cabang = "all") => {
    const { data } = await api.get("/laporan/akunting/labarugi", {
      params: { startDate, endDate, cabang },
    });
    return data.data as LabaRugiData;
  },
};
