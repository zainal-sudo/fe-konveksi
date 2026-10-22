import api from "@/api/axios";

export interface InvoicePiutang {
  invoiceNomor: string;
  invoiceTanggal: string;
  invoiceNetto: number;
  sisaPiutang: number;
  nilaiBayar: number;
  isChecked: boolean; // Flag kontrol checkbox di sisi frontend
}

export interface CustomerOpt {
  kode: string;
  nama: string;
  alamat: string;
  telp: string;
}

export interface RekeningOpt {
  kode: string;
  nama: string;
}

export const bayarCustomerApi = {
  getInitData: async () => {
    const { data } = await api.get("/transaksi/bayarCustomer/init");
    return data.data;
  },
  searchCustomer: async (q: string): Promise<CustomerOpt[]> => {
    const { data } = await api.get("/transaksi/bayarCustomer/customer-search", {
      params: { search: q },
    });
    return data.data;
  },
  getRekeningOptions: async (q: string): Promise<RekeningOpt[]> => {
    const { data } = await api.get("/transaksi/bayarCustomer/rekening-search", {
      params: { search: q },
    });
    return data.data;
  },
  getInvoicePiutang: async (cusKode: string): Promise<InvoicePiutang[]> => {
    const { data } = await api.get(
      `/transaksi/bayarCustomer/invoice-piutang/${encodeURIComponent(cusKode)}`,
    );
    return data.data;
  },
  saveData: async (payload: any) => {
    const { data } = await api.post("/transaksi/bayarCustomer/save", payload);
    return data;
  },
  getAll: async (startDate?: string, endDate?: string) => {
    const { data } = await api.get("/transaksi/bayarCustomer", {
      params: { startDate, endDate },
    });
    return data.data;
  },
  delete: async (nomor: string) => {
    const { data } = await api.delete(
      `/transaksi/bayarCustomer/${encodeURIComponent(nomor)}`,
    );
    return data;
  },
  getDetailForm: (nomor: string) =>
    api
      .get(`/transaksi/bayarCustomer/${encodeURIComponent(nomor)}`)
      .then((r) => r.data.data),
  getDetail: async (nomor: string) => {
    const { data } = await api.get(
      `/transaksi/bayarCustomer/detail/${encodeURIComponent(nomor)}`,
    );
    return data.data;
  },
};
