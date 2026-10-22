import api from "@/api/axios";

export interface JurnalUmumFormDetail {
  no: number;
  uraian: string;
  debet: number;
  kredit: number;
  rekkode: string;
  reknama: string;
}

export interface JurnalUmumForm {
  nomor: string;
  tanggal: string;
  keterangan: string;
  detail: JurnalUmumFormDetail[];
}

export const jurnalUmumFormApi = {
  getAccountAll: async () => {
    const { data } = await api.get("/accounting/jurnal-umum/form/account-all");
    return data.data as { kode: string; nama: string; kol_id: string }[];
  },
  getCostCenterOptions: async () => {
    const { data } = await api.get("/accounting/jurnal-umum/form/cost-center");
    return data.data as { kode: number; nama: string }[];
  },
  getDcOptions: async (cckode: number) => {
    const { data } = await api.get(`/accounting/jurnal-umum/form/dc/${cckode}`);
    return data.data as { kode: number; nama: string }[];
  },
  getDetailForm: async (nomor: string): Promise<JurnalUmumForm> => {
    const { data } = await api.get(
      `/accounting/jurnal-umum/form/form/${encodeURIComponent(nomor)}`,
    );
    return data.data;
  },
  save: async (payload: any) => {
    const { data } = await api.post(
      "/accounting/jurnal-umum/form/save",
      payload,
    );
    return data;
  },
};
