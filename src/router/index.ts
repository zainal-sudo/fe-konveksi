import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth ──────────────────────────────────────────────────────────
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: { title: "Login", layout: "BlankLayout", requiresAuth: false },
    },

    // ── Dashboard ─────────────────────────────────────────────────────
    {
      path: "/",
      name: "Dashboard",
      component: () => import("@/views/dashboard/DashboardView.vue"),
      meta: { layout: "DefaultLayout", requiresAuth: true, title: "Dashboard" },
    },

    // ── Setting Printer ─────────────────────────────────────────────────
    {
      path: "/settings/printer",
      name: "settingPrinter",
      component: () => import("@/views/tools/SettingPrinterView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Setting Printer",
      },
    },

    // ── Master ────────────────────────────────────────────────────────
      {
      path: "/master/Supplier",
      name: "MasterSupplier",
      component: () => import("@/views/master/SupplierView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "10",
        title: "Master Supplier",
      },
    },
    {
      path: "/master/kategori",
      name: "MasterKategori",
      component: () => import("@/views/master/KategoriView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "11",
        title: "Master Kategori",
      },
    },
	  {
      path: "/master/cabang",
      name: "MasterCabang",
      component: () => import("@/views/master/CabangView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "95",
        title: "Master Proses",
      },
    },
    {
      path: "/master/proses",
      name: "MasterProses",
      component: () => import("@/views/master/ProsesView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "30",
        title: "Master Proses",
      },
    },
    {
      path: "/master/barang",
      name: "MasterBarang",
      component: () => import("@/views/master/BarangView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "13",
        title: "Master Barang",
      },
    },
    {
  path: "/master/jenis-barang",
  name: "MasterJenisBarang",
  component: () => import("@/views/master/JenisBarangView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "20",
    title: "Master Jenis Barang",
  },
},
    {
      path: "/master/barang-jadi",
      name: "MasterBarangJadi",
      component: () => import("@/views/master/BarangJadiView.vue"),
      meta: {
      layout: "DefaultLayout",
      requiresAuth: true,
      menuId: "",
      title: "Master Barang Jadi",
      },
    },
    {
      path: "/master/customer",
      name: "MasterCustomer",
      component: () => import("@/views/master/CustomerView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "14",
        title: "Master Customer",
      },
    },
	{
      path: "/master/gudang",
      name: "MasterGudang",
      component: () => import("@/views/master/GudangView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "16",
        title: "Master Gudang",
      },
	  
    },
	{
      path: "/master/kelompok",
      name: "MasterKelompok",
      component: () => import("@/views/master/KelompokView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "7",
        title: "Master Kelompok",
      },
	},  
	{
      path: "/master/rekening",
      name: "MasterRekening",
      component: () => import("@/views/master/RekeningView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "6",
        title: "Master Rekening",
      },
	},  



    // ── Transaksi ─────────────────────────────────────────────────────
    {
      path: "/transaksi/po",
      name: "poBrowse",
      component: () => import("@/views/transaksi/poBrowseView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "PO",
      },
    },
    {
      path: "/transaksi/po/create",
      name: "poCreate",
      component: () => import("@/views/transaksi/poFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "Tambah PO",
        browseRoute: "poBrowse",
      },
    },
    {
      path: "/transaksi/po/edit/:nomor",
      name: "poEdit",
      component: () => import("@/views/transaksi/poFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "Ubah PO",
        browseRoute: "poBrowse",
      },
    },
    
    {
      path: "/transaksi/po/print/:nomor",
      name: "poPrint",
      component: () => import("@/views/transaksi/poPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak PO",
      },
    },
	 {
	  path: "/transaksi/bpb",
	  name: "bpbBrowse",
	  component: () => import("@/views/transaksi/bpbBrowseView.vue"),
	  meta: {  layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        browseRoute: "bpbBrowse", },
	},
	{
	  path: "/transaksi/bpb/baru",
	  name: "bpbCreate",
	  component: () => import("@/views/transaksi/bpbFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        title: "Tambah BPB",
        browseRoute: "bpbBrowse", },
	},
	{
	  path: "/transaksi/bpb/ubah/:nomor",
	  name: "bpbEdit",
	  component: () => import("@/views/transaksi/bpbFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        title: "Ubah BPB",
        browseRoute: "bpbBrowse",},
	},
	{
	  path: "/transaksi/penyesuaian-stok",
	  name: "penyesuaianStokBrowse",
	  component: () => import("@/views/transaksi/penyesuaianStokBrowseView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "27",
        browseRoute: "penyesuaianStokBrowse", },
	},
	{
	  path: "/transaksi/penyesuaian-stok/baru",
	  name: "penyesuaianStokCreate",
	  component: () => import("@/views/transaksi/penyesuaianStokFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "27",
        title: "Tambah Penyesuaian Stok",
        browseRoute: "penyesuaianStokBrowse", },
	},
	{
	  path: "/transaksi/penyesuaian-stok/ubah/:nomor",
	  name: "penyesuaianStokEdit",
	  component: () => import("@/views/transaksi/penyesuaianStokFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "27",
        title: "Ubah Penyesuaian Stok",
        browseRoute: "penyesuaianStokBrowse",},
	},
  {
	  path: "/transaksi/invoice",
	  name: "invBrowse",
	  component: () => import("@/views/transaksi/InvBrowse.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "12",
        title: "Invoice Pembelian",
        browseRoute: "invBrowse", },
	},
	{
	  path: "/transaksi/invoice/baru",
	  name: "invCreate",
	  component: () => import("@/views/transaksi/InvForm.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "12",
        title: "Tambah Invoice",
        browseRoute: "invBrowse", },
	},
	{
	  path: "/transaksi/invoice/ubah/:nomor",
	  name: "invEdit",
	  component: () => import("@/views/transaksi/InvForm.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "12",
        title: "Ubah Invoice",
        browseRoute: "invBrowse", },
	},
	{
	  path: "/transaksi/retur",
	  name: "returBrowse",
	  component: () => import("@/views/transaksi/returBrowseView.vue"),
	  meta: {  layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "19",
        browseRoute: "returBrowse", },
	},
	{
	  path: "/transaksi/retur/baru",
	  name: "returCreate",
	  component: () => import("@/views/transaksi/returFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "19",
        title: "Tambah Retur",
        browseRoute: "returBrowse", },
	},
	{
	  path: "/transaksi/retur/ubah/:nomor",
	  name: "returEdit",
	  component: () => import("@/views/transaksi/returFormView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "19",
        title: "Ubah Retur",
        browseRoute: "returBrowse",},
	},
	{
	  path: "/transaksi/bayarSupplier",
	  name: "bayarSupplierBrowse",
	  component: () => import("@/views/transaksi/BayarSupplierView.vue"),
	  meta: {  layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "53",
        browseRoute: "bayarSupplierBrowse", },
	},
	{
	  path: "/transaksi/bayarSupplier/baru",
	  name: "bayarSupplierCreate",
	  component: () => import("@/views/transaksi/BayarSupplierForm.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "53",
        title: "Tambah bayarSupplier",
        browseRoute: "bayarSupplierBrowse", },
	},
	{
	  path: "/transaksi/bayarSupplier/ubah/:nomor",
	  name: "bayarSupplierEdit",
	  component: () => import("@/views/transaksi/BayarSupplierForm.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "53",
        title: "Ubah bayarSupplier",
        browseRoute: "bayarSupplierBrowse",},
	},
  {
  path: "/transaksi/stbj",
  name: "stbjBrowse",
  component: () => import("@/views/transaksi/stbjBrowseView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "40",
    title: "STBJ",
    browseRoute: "stbjBrowse",
  },
},
{
  path: "/transaksi/stbj/baru",
  name: "stbjCreate",
  component: () => import("@/views/transaksi/stbjFormView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "40",
    title: "Tambah STBJ",
    browseRoute: "stbjBrowse",
  },
},
{
  path: "/transaksi/stbj/ubah/:nomor",
  name: "stbjEdit",
  component: () => import("@/views/transaksi/stbjFormView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "40",
    title: "Ubah STBJ",
    browseRoute: "stbjBrowse",
  },
},
{
  path: "/transaksi/spk",
  name: "spkBrowse",
  component: () => import("@/views/transaksi/SpkBrowseView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "84",
    title: "Surat Perintah Kerja",
    browseRoute: "spkBrowse",
  },
},
{
  path: "/transaksi/spk/baru",
  name: "spkCreate",
  component: () => import("@/views/transaksi/SpkFormView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "84",
    title: "Tambah SPK",
    browseRoute: "spkBrowse",
  },
},
{
  path: "/transaksi/spk/ubah/:nomor",
  name: "spkEdit",
  component: () => import("@/views/transaksi/SpkFormView.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "84",
    title: "Ubah SPK",
    browseRoute: "spkBrowse",
  },
},
{
  path: "/transaksi/spk/print/:nomor",
  name: "spkPrint",
  component: () => import("@/views/transaksi/SpkPrintView.vue"),
  meta: {
    layout: "BlankLayout",
    requiresAuth: true,
    title: "Cetak SPK",
  },
},

{
  path: "/transaksi/mutasi",
  name: "mutasiBrowse",
  component: () => import("@/views/transaksi/MutasiBrowse.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "13",
    title: "Mutasi Gudang",
    browseRoute: "mutasiBrowse",
  },
},
{
  path: "/transaksi/mutasi/baru",
  name: "mutasiCreate",
  component: () => import("@/views/transaksi/MutasiForm.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "13",
    title: "Tambah Mutasi Gudang",
    browseRoute: "mutasiBrowse",
  },
},
{
  path: "/transaksi/mutasi/ubah/:nomor",
  name: "mutasiEdit",
  component: () => import("@/views/transaksi/MutasiForm.vue"),
  meta: {
    layout: "DefaultLayout",
    requiresAuth: true,
    menuId: "13",
    title: "Ubah Mutasi Gudang",
    browseRoute: "mutasiBrowse",
  },
},
	{
	  path: "/transaksi/penjualan",
	  name: "penjualanBrowse",
	  component: () => import("@/views/transaksi/penjualanBrowseView.vue"),
	  meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "33",
        title: "Penjualan",
        browseRoute: "penjualanBrowse",}
	 
	},
	{
	  path: "/transaksi/penjualan/create",
	  name: "penjualanCreate",
	  component: () => import("@/views/transaksi/penjualanFormView.vue"),
	   meta: { layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "33",
        title: "Tambah Penjualan",
        browseRoute: "penjualanBrowse",}
	  
	},
    {
      path: "/transaksi/penjualan/edit/:nomor",
      name: "penjualanEdit",
      component: () => import("@/views/transaksi/penjualanFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "33",
        title: "Ubah Penjualan",
        browseRoute: "penjualanBrowse",
      },
    },
    // PEMBAYARAN CUSTOMER (tbayarcus_* di DB minimarket)
    {
      path: "/transaksi/bayarCustomer",
      name: "BayarCustomerBrowse",
      component: () => import("@/views/transaksi/BayarCustomerView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
        title: "Pembayaran Customer",
        browseRoute: "BayarCustomerBrowse",
      },
    },
    {
      path: "/transaksi/bayarCustomer/baru",
      name: "BayarCustomerCreate",
      component: () => import("@/views/transaksi/BayarCustomerForm.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
        title: "Tambah Pembayaran Customer",
        browseRoute: "BayarCustomerBrowse",
      },
    },
    {
      path: "/transaksi/bayarCustomer/ubah/:nomor",
      name: "BayarCustomerEdit",
      component: () => import("@/views/transaksi/BayarCustomerForm.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
        title: "Ubah Pembayaran Customer",
        browseRoute: "BayarCustomerBrowse",
      },
    },
    // MUTASI OUT (antar cabang — tmutcab_*)
    {
      path: "/transaksi/mutasi-out",
      name: "MutasiOut",
      component: () => import("@/views/transaksi/MutasiOutView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "Mutasi Cabang Out",
      },
    },
    {
      path: "/transaksi/mutasi-out/create",
      name: "MutasiOutCreate",
      component: () => import("@/views/transaksi/MutasiOutFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "Buat Mutasi Out",
        browseRoute: "MutasiOut",
      },
    },
    {
      path: "/transaksi/mutasi-out/edit/:nomor",
      name: "MutasiOutEdit",
      component: () => import("@/views/transaksi/MutasiOutFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "15",
        title: "Ubah Mutasi Out",
        browseRoute: "MutasiOut",
      },
    },

    // MUTASI IN (penerimaan antar cabang — tmutcabin_*)
    {
      path: "/transaksi/mutasi-in",
      name: "MutasiIn",
      component: () => import("@/views/transaksi/MutasiInView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        title: "Mutasi Cabang In",
      },
    },
    {
      path: "/transaksi/mutasi-in/create",
      name: "MutasiInCreate",
      component: () => import("@/views/transaksi/MutasiInFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        title: "Terima Mutasi Cabang",
        browseRoute: "MutasiIn",
      },
    },
    {
      path: "/transaksi/mutasi-in/edit/:nomor",
      name: "MutasiInEdit",
      component: () => import("@/views/transaksi/MutasiInFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "17",
        title: "Ubah Mutasi In",
        browseRoute: "MutasiIn",
      },
    },

  
    // ── Accounting ────────────────────────────────────────────────────
    {
      path: "/accounting/jurnal-umum",
      name: "AccountingJurnalUmumBrowse",
      component: () => import("@/views/accounting/JurnalUmumView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "41",
        title: "Jurnal Umum",
      },
    },
    {
      path: "/accounting/jurnal-umum/create",
      name: "AccountingJurnalUmumCreate",
      component: () => import("@/views/accounting/JurnalUmumFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "41",
        title: "Tambah Jurnal Umum",
        browseRoute: "AccountingJurnalUmumBrowse",
      },
    },
    {
      path: "/accounting/jurnal-umum/edit/:nomor",
      name: "AccountingJurnalUmumEdit",
      component: () => import("@/views/accounting/JurnalUmumFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "41",
        title: "Ubah Jurnal Umum",
        browseRoute: "AccountingJurnalUmumBrowse",
      },
    },
    {
      path: "/accounting/jurnal-umum/print/:nomor",
      name: "AccountingJurnalUmumPrint",
      component: () => import("@/views/accounting/JurnalUmumPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Jurnal Umum",
      },
    },
    {
      path: "/accounting/pembayaran-lain",
      name: "AccountingPembayaranLainBrowse",
      component: () => import("@/views/accounting/PembayaranLainView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Pembayaran Lain Lain",
      },
    },
    {
      path: "/accounting/pembayaran-lain/create",
      name: "AccountingPembayaranLainCreate",
      component: () => import("@/views/accounting/PembayaranLainFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Tambah Pembayaran Lain Lain",
        browseRoute: "AccountingPembayaranLainBrowse",
      },
    },
    {
      path: "/accounting/pembayaran-lain/edit/:nomor",
      name: "AccountingPembayaranLainEdit",
      component: () => import("@/views/accounting/PembayaranLainFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "24",
        title: "Ubah Pembayaran Lain Lain",
        browseRoute: "AccountingPembayaranLainBrowse",
      },
    },
    {
      path: "/accounting/pembayaran-lain/print/:nomor",
      name: "AccountingPembayaranLainPrint",
      component: () => import("@/views/accounting/PembayaranLainPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Pembayaran Lain Lain",
      },
    },
    {
      path: "/accounting/penerimaan-lain",
      name: "AccountingPenerimaanLainBrowse",
      component: () => import("@/views/accounting/PenerimaanLainView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Penerimaan Lain Lain",
      },
    },
    {
      path: "/accounting/penerimaan-lain/create",
      name: "AccountingPenerimaanLainCreate",
      component: () => import("@/views/accounting/PenerimaanLainFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Tambah Penerimaan Lain Lain",
        browseRoute: "AccountingPenerimaanLainBrowse",
      },
    },
    {
      path: "/accounting/penerimaan-lain/edit/:nomor",
      name: "AccountingPenerimaanLainEdit",
      component: () => import("@/views/accounting/PenerimaanLainFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "23",
        title: "Ubah Penerimaan Lain Lain",
        browseRoute: "AccountingPenerimaanLainBrowse",
      },
    },
    {
      path: "/accounting/penerimaan-lain/print/:nomor",
      name: "AccountingPenerimaanLainPrint",
      component: () => import("@/views/accounting/PenerimaanLainPrintView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: true,
        title: "Cetak Penerimaan Lain Lain",
      },
    },
    // Rekonsiliasi Bank
    

    // ── Posting ──
    {
      path: "/posting/pembayaran-customer",
      name: "PembayaranCustomerBrowse",
      component: () => import("@/views/posting/PembayaranCustomerView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
        title: "Pembayaran Customer",
      },
    },
    {
      path: "/posting/pembayaran-customer/form",
      name: "PembayaranCustomerForm",
      component: () => import("@/views/posting/PembayaranCustomerFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "51",
        title: "Posting Pembayaran Customer",
        browseRoute: "PembayaranCustomerBrowse",
      },
    },
    {
      path: "/posting/pembayaran-cust-kaosan",
      name: "PembayaranCustKaosanBrowse",
      component: () => import("@/views/posting/PembayaranCustKaosanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "52",
        title: "Pembayaran Customer Kaosan",
      },
    },
    {
      path: "/posting/pembayaran-cust-kaosan/form",
      name: "PembayaranCustKaosanForm",
      component: () =>
        import("@/views/posting/PembayaranCustKaosanFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "52",
        title: "Posting Pembayaran Customer Kaosan",
        browseRoute: "PembayaranCustKaosanBrowse",
      },
    },

    // ── Laporan ──
    {
      path: "/laporan/list-jurnal",
      name: "ListJurnal",
      component: () => import("@/views/laporan/ListJurnalView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "List Jurnal",
      },
    },
    {
      path: "/laporan/persediaan",
      name: "LapPersediaan",
      component: () => import("@/views/laporan/PersediaanView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Lap Persediaan",
      },
    },
    {
      path: "/laporan/penjualan-item",
      name: "LapPenjualanItem",
      component: () => import("@/views/laporan/PenjualanItemView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Jual Per Item",
      },
    },
    {
      path: "/laporan/kasbon-belum-selesai",
      name: "LapKasbonBelumSelesai",
      component: () => import("@/views/laporan/KasbonBelumSelesaiView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Kasbon Belum Selesai",
      },
    },
    {
      path: "/laporan/rekonsiliasi-bank",
      name: "LapRekonsiliasi",
      component: () => import("@/views/laporan/LapRekonsiliasiBankView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Rekonsiliasi Bank",
      },
    },
    {
      path: "/laporan/stok-finance",
      name: "LapStokFinance",
      component: () => import("@/views/laporan/StokFinanceView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Stok Finance",
      },
    },
    {
      path: "/laporan/daftar-hutang",
      name: "LapDaftarHutang",
      component: () => import("@/views/laporan/DaftarHutangView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Daftar Hutang",
      },
    },
    {
      path: "/laporan/neraca",
      name: "LapNeraca",
      component: () => import("@/views/laporan/NeracaView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Neraca",
      },
    },
    {
      path: "/laporan/laba-rugi",
      name: "LapLabaRugi",
      component: () => import("@/views/laporan/LabaRugiView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        title: "Laba Rugi",
      },
    },

    // ── Tools ─────────────────────────────────────────────────────────
    {
      path: "/tools/users",
      name: "MasterUser",
      component: () => import("@/views/tools/MasterUserView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "1",
        title: "Master User",
      },
    },
    {
      path: "/tools/users/create",
      name: "MasterUserCreate",
      component: () => import("@/views/tools/MasterUserFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "1",
        title: "Tambah User",
        browseRoute: "MasterUser",
      },
    },
    {
      path: "/tools/users/edit/:kode",
      name: "MasterUserEdit",
      component: () => import("@/views/tools/MasterUserFormView.vue"),
      meta: {
        layout: "DefaultLayout",
        requiresAuth: true,
        menuId: "1",
        title: "Ubah User",
        browseRoute: "MasterUser",
      },
    },

    // ── Error Pages ───────────────────────────────────────────────────
    {
      path: "/403",
      name: "Unauthorized",
      component: () => import("@/views/errors/UnauthorizedView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: false,
        title: "Akses Ditolak",
      },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/errors/NotFoundView.vue"),
      meta: {
        layout: "BlankLayout",
        requiresAuth: false,
        title: "Halaman Tidak Ditemukan",
      },
    },
  ],
});

// ── Navigation Guard ──────────────────────────────────────────────────
router.beforeEach((to) => {
  const authStore = useAuthStore();
  document.title = `${String(to.meta?.title || to.name || "Retail")} — E R P`;

  if (to.meta.requiresAuth && !authStore.isAuthenticated)
    return { name: "Login" };

  if (to.name === "Login" && authStore.isAuthenticated)
    return { name: "Dashboard" };

  // Hanya cek permission kalau menus sudah ada isinya
  const menuId = to.meta.menuId as string | undefined;
  if (
    menuId &&
    menuId !== "0" &&
    authStore.user?.menus?.length &&
    !authStore.can(menuId, "view")
  )
    return { name: "Unauthorized", query: { from: to.fullPath } };

  // ── Pembatasan user CABANG ('00' = pusat): hanya Penjualan + Mutasi (out/in).
  // Sama daftarnya dengan menu di DefaultLayout — bertahan walau lewat URL langsung.
  const cabang = authStore.userCabang || "00";
  if (cabang !== "00" && authStore.isAuthenticated) {
    const izinkanPrefix = [
      "/",
      "/settings/printer",
      "/transaksi/penjualan",
      "/transaksi/mutasi-out",
      "/transaksi/mutasi-in",
      "/laporan/persediaan",
      "/laporan/Persediaan",
      "/laporan/penjualan-item",
    ];
    const okPath = izinkanPrefix.some(
      (p) =>
        p === "/"
          ? to.path === "/"
          : to.path === p || to.path.startsWith(p + "/"),
    );
    if (!okPath) return { name: "Unauthorized", query: { from: to.fullPath } };
  }
});

// ── Auto-open Tab Bar ────────────────────────────────────────────────
const browseFallbackTitle: Record<string, string> = {
  "/transaksi/bpb": "Penerimaan Barang",
  "/transaksi/penyesuaian-stok": "Penyesuaian Stok",
  "/transaksi/retur": "Retur Pembelian",
  "/transaksi/bayarSupplier": "Pembayaran Supplier",
  "/transaksi/spk": "Surat Perintah Kerja (SPK)",
  "/transaksi/terima-setoran": "Terima Setoran",
};

const prettyRouteName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

router.afterEach((to) => {
  // Halaman BlankLayout (login/cetak/error) tidak punya tab
  if (to.meta.layout === "BlankLayout") return;

  const tabsStore = useTabsStore();
  if (!tabsStore.isReady) tabsStore.initDefaultTabs();

  const title = String(
    to.meta?.title ||
    browseFallbackTitle[to.path] ||
    (to.name ? prettyRouteName(String(to.name)) : "Halaman"),
  );

  tabsStore.openTab({
    title,
    path: to.path,
    query: to.query,
    closable: to.path !== "/",
  });
});

export default router;
