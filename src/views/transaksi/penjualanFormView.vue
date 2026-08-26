<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick,watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { IconSearch, IconDeviceFloppy, IconArrowLeft, IconTrash, IconReload } from "@tabler/icons-vue";
import { penjualanApi } from "@/api/transaksi/penjualanApi";
import { returFormApi } from "@/api/transaksi/returFormApi";

// 🔴 SAMAKAN IMPORT DENGAN RETUR (Mengambil SearchModal global)
import SearchModal from "@/components/SearchModal.vue";

const router = useRouter();
const toast = useToast();

const tipeHargaAktif = ref("eceran"); 

// Opsi tingkat harga untuk Combo Box (v-select)
const opsiTingkatHarga = [
  { title: "Harga Eceran (PCS)", value: "eceran" },
  { title: "Harga Grosir (LSN)", value: "grosir" },
  { title: "Harga Besar (CRT)", value: "besar" },
  { title: "Harga Khusus / Promo", value: "khusus" }
];

const dapatkanHargaValid = (barang: any, tingkat: string): number => {
  let hargaTerpilih = 0;

  // Sesuaikan nama properti field dengan data dari objek master barang Anda
  if (tingkat === "eceran") hargaTerpilih = Number(barang.brg_harga_eceran || barang.brg_harga_eceran || 0);
  else if (tingkat === "grosir") hargaTerpilih = Number(barang.brg_harga_grosir || barang.hargaGrosir || 0);
  else if (tingkat === "besar") hargaTerpilih = Number(barang.brg_harga_besar || barang.hargaBesar || 0);
  else if (tingkat === "khusus") hargaTerpilih = Number(barang.brg_harga_khusus || barang.hargaKhusus || 0);

  // Jika harga tingkat yang dipilih bernilai 0, lemparkan peringatan dan gunakan eceran sebagai cadangan
  if (hargaTerpilih === 0) {
    const namaTingkat = tingkat.toUpperCase();
    toast.warning(`Master ${namaTingkat} untuk barang "${barang.brg_nama || barang.nama}" bernilai Rp 0! Otomatis beralih ke Harga Eceran.`);
    
    // Gunakan harga eceran sebagai fallback utama
    return Number(barang.brg_harga_eceran || barang.hargaEceran || 0);
  }

  return hargaTerpilih;
};

const showPendingModal = ref(false);
const pendingList = ref<any[]>([]);
const pendingLoading = ref(false);

const handlePendingTransaksi = async () => {
  if (listCart.value.length === 0) {
    // Swal.fire("Peringatan", "Keranjang belanja masih kosong!", "warning");
    return;
  }

  try {
    const payload = {
      header: {
        tanggal: form.value.tanggal,
        cusKode: form.value.cusKode,
        amount: grandTotalNetto.value, // Sesuaikan variabel total belanja Anda
      },
      details: listCart.value
    };

    const res = await penjualanApi.savePending(payload);
    if (res.success) {
      // 1. Reset Form & Keranjang ke default (Kembali ke Umum)
      listCart.value = [];
      form.value.cusKode = "0000000001";
      form.value.cusNama = "umum";
      
      // 2. Refresh nomor nota baru
      if (typeof fetchInitData === "function") fetchInitData();

      // Swal.fire("Berhasil", "Transaksi berhasil ditunda (Pending)", "success");
    }
  } catch (err: any) {
    // Swal.fire("Error", err.message, "error");
  }
};

// FUNGSI 2: MEMBUKA LIST PENDING
const openPendingList = async () => {
  showPendingModal.value = true;
  pendingLoading.value = true;
  try {
    pendingList.value = await penjualanApi.getPendingList();
  } catch {
    pendingList.value = [];
  } finally {
    pendingLoading.value = false;
  }
};

// FUNGSI 3: MENGAMBIL NOTA PENDING KE LAYAR KASIR
const handleTakePending = async (item: any) => {
  try {
    // Jika kasir sedang melayani orang lain, tanyakan dulu atau cegah agar tidak tertimpa
    if (listCart.value.length > 0) {
      // const confirm = await Swal.fire({ title: 'Konfirmasi', text: 'Keranjang aktif tidak kosong. Ingin menimpa dengan data pending?', icon: 'question', showCancelButton: true });
      // if (!confirm.isConfirmed) return;
    }

    const dataRestored = await penjualanApi.takePending(item.NO_PENDING);
    
    // Kembalikan data customer dan item belanja ke layar
    form.value.cusKode = dataRestored.header.pen_cus_kode;
    form.value.cusNama = item.CUSTOMER || "umum";
    
    // Kembalikan isi keranjang belanja
    listCart.value = dataRestored.details;

    // Tutup modal
    showPendingModal.value = false;
    // Swal.fire("Selesai", "Data pending berhasil dimuat kembali", "success");
  } catch (err: any) {
    // Swal.fire("Gagal", err.message, "error");
  }
};

const validateCustomer = () => {
  if (!form.value.cusKode || form.value.cusKode.trim() === "") {
    form.value.cusKode = "0000000001";
  }
};

const handleGlobalKeyDown = (event: KeyboardEvent) => {
  // Mendeteksi tombol F2
  if (event.key === "F2" || event.code === "KeyF2" || event.keyCode === 112) {
    // SANGAT PENTING: matikan fungsi bawaan browser terlebih dahulu!
    event.preventDefault(); 
    event.stopPropagation();
    
    // Panggil fungsi membuka modal barang
    openBarangModal();
  }
};

const searchBarang = async (query: string) => {
  barangLoading.value = true;
  try {
    barangOptions.value = await returFormApi.getBarang(query || "");
  } catch { /* silent */ } finally { barangLoading.value = false; }
};

const form = ref({
  notaNomor: "Otomatis...",
  tanggal: new Date().toISOString().substring(0, 10),
  cusKode: "0000000001", // Default Umum / Non-Member
  cusNama: "Umum",
  
  // Metode Pembayaran Lengkap
  ongkir: 0,
  cash: 0,
  voucher: 0,
  noVoucher: "",
  card: 0,
  noCard: "",
  bankCard: "",
  piutang: 0
});

const barcodeInput = ref("");
const listCart = ref<any[]>([]);
const isSaving = ref(false);
const showBarangModal = ref(false);
const barangOptions = ref<any[]>([]);
const barangLoading = ref(false);
const showCustomerModal = ref(false);
const customerOptions = ref<any[]>([]);
const customerLoading = ref(false); 
    
const refBarcode = ref<HTMLInputElement | null>(null);

  const loadCustomerOptions = async () => {
  customerLoading.value = true;
  try {
    customerOptions.value = await penjualanApi.getCustomer("");
  } catch (e) {
    console.error("Gagal memuat data customer:", e);
  } finally {
    customerLoading.value = false;
  }
};

// Fungsi pencarian secara dinamis saat user mengetik di modal
const searchCustomer = async (query: string) => {
  customerLoading.value = true;
  try {
    customerOptions.value = await penjualanApi.getCustomer(query || "");
  } catch { /* silent */ } finally { customerLoading.value = false; }
};

// Event saat salah satu customer dipilih dari modal
const selectCustomer = (cus: any) => {
  if (!cus) return;
  form.value.cusKode = cus.kode;
  form.value.cusNama = cus.nama; // Jika Anda menyimpan nama customer di form state
  showCustomerModal.value = false;
};

// Jalankan fungsi load data awal di dalam onMounted
onMounted(() => {
  // ... load data lainnya ...
  loadCustomerOptions();
});

onMounted(async () => {
  window.addEventListener("keydown", handleGlobalKeyDown);
  
  try {
    const init = await penjualanApi.getInitData();
    form.value.notaNomor = init.notaOtomatis;
  } catch {
    toast.error("Gagal memuat nomor nota otomatis.");
  }
  focusBarcode();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeyDown);
});

const focusBarcode = () => {
  nextTick(() => { refBarcode.value?.focus(); });
};

watch(() => showBarangModal.value, (isOpen) => {
  if (isOpen) {
    // nextTick bertugas menunggu sampai HTML modal dirender sempurna oleh Vue
    nextTick(() => {
      // Mencari elemen inputan teks pencarian yang ada di dalam SearchModal
      const inputCari = document.querySelector(
        ".v-dialog input[type='text'], .v-card input, input[placeholder*='Cari kode']"
      ) as HTMLInputElement;

      if (inputCari) {
        inputCari.focus();  // Kursor langsung aktif berkedip di kotak pencarian
        inputCari.select(); // Memblok teks lama (jika ada) supaya siap ditimpa ketikan baru
      }
    });
  }
});
watch(tipeHargaAktif, (tingkatBaru) => {
  if (!listCart.value || listCart.value.length === 0) return;

  // Iterasi setiap item yang ada di keranjang kasir
  listCart.value.forEach((item: any) => {
    // 🔴 PERBAIKAN: Gunakan item.brgKode sesuai dengan template tabel kasir Anda
    const kodeCari = item.brgKode; 

    // Cari data master barang yang cocok berdasarkan KODE BARANG
    const dataAsli = barangOptions.value.find((b: any) => {
      const kodeMaster = b.brg_kode || b.brgKode || b.kode || b.id;
      return kodeMaster === kodeCari;
    });
    
    if (dataAsli) {
      // Ambil harga yang valid untuk barang ini berdasarkan tingkat harga yang baru dipilih
      const hargaBaru = dapatkanHargaValid(dataAsli, tingkatBaru);
      
      // Update harga dan hitung ulang baris barang tersebut
      item.harga = hargaBaru;
      
      // Sesuaikan rumus dengan properti diskon Anda (item.discRp atau item.potonganRp)
      const diskon = Number(item.discRp || 0);
      item.subtotal = (Number(item.qty) * hargaBaru) - diskon;
    }
  });
  
  
  
  toast.success(`Tingkat harga dialihkan ke: ${tingkatBaru.toUpperCase()}`);
});

const handleBarcodeScan = async () => {
  const code = barcodeInput.value.trim();
  if (!code) return;

  try {
    const barang = await returFormApi.getBarang(code);
    if (barang && barang.length > 0) {
      const match = barang.find((b: any) => b.brg_kode === code || b.brg_barcode === code) || barang[0];
      addToCart(match);
    } else {
      toast.warning(`Barang dengan barcode/kode "${code}" tidak ditemukan.`);
    }
  } catch (e) {
    toast.error("Gagal memproses barcode.");
  } finally {
    barcodeInput.value = "";
    focusBarcode();
  }
};

const addToCart = (barang: any) => {
  const bKode = barang.brg_kode || barang.KODE || barang.kode;
  const bNama = barang.brg_nama || barang.NAMA || barang.nama;
  const hargaFinal = dapatkanHargaValid(barang, tipeHargaAktif.value);

  const bHarga = hargaFinal ; //Number(barang.brg_hargajual || barang.HARGA || barang.harga || 0);

  const existingItem = listCart.value.find(item => item.brgKode === Number(bKode));

  if (existingItem) {
    existingItem.qty += 1;
    calculateRow(existingItem);
  } else {
    const newItem = {
      brgKode: Number(bKode),
      barangNama: bNama,
      harga: bHarga,
      hargaKasir: bHarga,
      qty: 1,
      discPr: 0,
      discRp: 0,
      subtotal: bHarga
    };
    listCart.value.push(newItem);
  }
  focusBarcode();
};

const calculateRow = (row: any) => {
  const gross = row.harga * row.qty;
  row.subtotal = gross - Number(row.discRp * row.qty|| 0);
};

const removeItem = (idx: number) => {
  listCart.value.splice(idx, 1);
  focusBarcode();
};

// ── PERHITUNGAN NETTO & KEMBALIAN ──────────────────
const totalBelanja = computed(() => {
  return listCart.value.reduce((acc, row) => acc + Number(row.subtotal || 0), 0);
});

const grandTotalNetto = computed(() => {
  return totalBelanja.value + Number(form.value.ongkir || 0);
});

const totalBayarMasyarakat = computed(() => {
  return (
    Number(form.value.cash || 0) +
    Number(form.value.voucher || 0) +
    Number(form.value.card || 0) +
    Number(form.value.piutang || 0)
  );
});

const uangKembalian = computed(() => {
  const kembali = totalBayarMasyarakat.value - grandTotalNetto.value;
  return kembali < 0 ? 0 : kembali;
});

const openBarangModal = async () => {
  try {
    showBarangModal.value = true;
    const res = await returFormApi.getBarang(""); 
    barangOptions.value = res || [];
  } catch (error) {
    toast.error("Gagal mengambil daftar barang.");
  }
};

const selectBarang = (b: any) => {
  addToCart(b);
  showBarangModal.value = false;
};

const handleSave = async () => {
  if (listCart.value.length === 0) {
    toast.warning("Keranjang belanja kasir masih kosong!");
    return;
  }
  
  if (totalBayarMasyarakat.value < grandTotalNetto.value) {
    toast.warning("Total pembayaran kurang dari Grand Total Netto!");
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      header: {
        tanggal: form.value.tanggal,
        cusKode: form.value.cusKode,
        amount: grandTotalNetto.value,
        ongkir: form.value.ongkir,
        bayar: form.value.cash,
        voucher: form.value.voucher,
        noVoucher: form.value.noVoucher,
        card: form.value.card,
        noCard: form.value.noCard,
        bankCard: form.value.bankCard,
        piutang: form.value.piutang,
        kembali: uangKembalian.value
      },
      details: listCart.value
    };

    await penjualanApi.saveData(payload);
    toast.success("Transaksi Kasir Berhasil Disimpan!");
    
    // Reset Form
    listCart.value = [];
    form.value.ongkir = 0;
    form.value.cash = 0;
    form.value.voucher = 0;
    form.value.noVoucher = "";
    form.value.card = 0;
    form.value.noCard = "";
    form.value.bankCard = "";
    form.value.piutang = 0;
    form.value.cusKode = "0000000001";
    form.value.cusNama = "umum";
    
    const init = await penjualanApi.getInitData();
    form.value.notaNomor = init.notaOtomatis;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan transaksi.");
  } finally {
    isSaving.value = false;
    focusBarcode();
  }
};

const fmtCurrency = (v: number) => new Intl.NumberFormat("id-ID").format(v);
</script>

<template>
  <div class="pos-wrap">
    <div class="action-bar mb-2">
      <button class="btn-back" type="button" @click="router.push('/transaksi/penjualan')">
        <IconArrowLeft :size="16" /> Kembali ke List
      </button>
      <span class="page-title">Mesin Kasir / POS (Multi-Payment)</span>
      <button
        class="btn-back"
        type="button"
        title="Reload halaman (kalau data barang/customer gagal kemuat)"
        @click="() => window.location.reload()"
      >
        <IconReload :size="16" /> Reload
      </button>
    </div>
    

    <div class="grid grid-cols-3 gap-3 mb-2">
      <div class="display-total">
        <div class="lbl">GRAND TOTAL NETTO</div>
        <div class="val">Rp {{ fmtCurrency(grandTotalNetto) }}</div>
      </div>

      <div class="panel-info col-span-2">
        <div class="grid grid-cols-2 gap-3">
          <div class="f-row">
            <label class="f-lbl">No. Nota</label>
            <input type="text" :value="form.notaNomor" class="f-inp readonly-bg" readonly />
          </div>
          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input type="date" v-model="form.tanggal" class="f-inp" />
          </div>
        </div>
        
        <div class="barcode-customer-row mt-3">
          <div class="input-inline-group">
            <label class="lbl-inline text-primary">SCAN BARCODE</label>
            <div class="search-combine">
              <input 
                ref="refBarcode"
                type="text" 
                v-model="barcodeInput" 
                @keydown.enter="handleBarcodeScan"
                class="f-inp barcode-field" 
                placeholder="Scan Barcode / Tekan ENTER..." 
              />
              <button class="btn-search-compact" type="button" @click="openBarangModal">
                <IconSearch :size="14" /> F2
              </button>
            </div>
          </div>

          <div class="f-row">
  <span class="text-green-600 font-bold mr-2">Customer</span>
  
  
  <div class="search-group active-barcode-style" @click="showCustomerModal = true">
    <input 
      type="text" 
      :value="form.cusKode" 
      class="f-inp-custom w-30" 
      readonly 
      placeholder="Kode" 
    />
    <input 
      type="text" 
      :value="form.cusNama" 
      class="f-inp-custom w-70 ml-1" 
      readonly 
      placeholder="Nama Customer..." 
    />
    <button class="btn-search-icon" type="button" @click.stop="showCustomerModal = true">
      <IconSearch :size="14" />
    </button>
  </div>
</div>
        </div>

      </div>
    </div>

    <div class="pos-main-content">
      
      <div class="table-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px; width: 100%;">
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn-pending" @click="handlePendingTransaksi">
                <span>F8 - Pending</span>
              </button>
              <button type="button" class="btn-ambil-pending" @click="openPendingList">
                <span>F9 - Ambil Pending</span>
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 13px; font-weight: bold; color: #374151; white-space: nowrap; margin: 0;">
                Tingkat Harga:
              </label>
              <select 
                v-model="tipeHargaAktif" 
                style="height: 34px; min-width: 180px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 24px 0 8px; font-size: 13px; background-color: #fff; font-weight: bold; color: #1f2937; cursor: pointer; outline: none;"
              >
                <option v-for="opsi in opsiTingkatHarga" :key="opsi.value" :value="opsi.value">
                  {{ opsi.title }}
                </option>
              </select>
            </div>
          
        </div>
        
        <table class="pos-table">
          <thead>
            <tr>
              <th style="width: 40px;" class="tc">No</th>
              <th style="width: 110px;">Kode Barang</th>
              <th>Nama Item Barang</th>
              <th style="width: 100px;" class="tr">Harga</th>
              <th style="width: 65px;" class="tc">Qty</th>
              <th style="width: 90px;" class="tr">Pot. Rp / item</th>
              <th style="width: 120px;" class="tr">Subtotal</th>
              <th style="width: 45px;" class="tc">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in listCart" :key="idx">
              <td class="tc">{{ idx + 1 }}</td>
              <td class="mono">{{ item.brgKode }}</td>
              <td><span class="font-weight-bold">{{ item.barangNama }}</span></td>
              <td class="tr">Rp {{ fmtCurrency(item.harga) }}</td>
              <td class="tc">
                <input type="number" v-model.number="item.qty" @input="calculateRow(item)" class="cell-input tc w-full" min="1" />
              </td>
              <td class="tr">
                <input type="number" v-model.number="item.discRp" @input="calculateRow(item)" class="cell-input tr w-full" placeholder="0" />
              </td>
              <td class="tr font-weight-bold text-blue">Rp {{ fmtCurrency(item.subtotal) }}</td>
              <td class="tc">
                <button class="btn-del" @click="removeItem(idx)"><IconTrash :size="14" /></button>
              </td>
            </tr>
            <tr v-if="listCart.length === 0">
              <td colspan="8" class="tc empty-text">Belum ada item. Silakan scan barcode atau tekan F9.</td>
            </tr>
          </tbody>
        </table>
      </div>
      

      <div class="sidebar-payment">
        <div class="panel-pay-box">
          
          <div class="pay-field-group mb-1">
            <label class="pay-lbl-input text-amber-600">5. ONGKIR (Rp)</label>
            <input type="number" v-model.number="form.ongkir" class="f-inp pay-field field-ongkir" placeholder="0" />
          </div>

          <div class="section-title">PEMBAYARAN</div>

          <div class="pay-field-group mb-1">
            <label class="pay-lbl-input text-emerald-600">1. CASH / TUNAI (Rp)</label>
            <input type="number" v-model.number="form.cash" class="f-inp pay-field field-cash" placeholder="0" />
          </div>

          <div class="pay-field-group mb-1">
            <label class="pay-lbl-input text-blue-600">2. VOUCHER (Rp)</label>
            <div class="grid grid-cols-3 gap-1">
              <input type="number" v-model.number="form.voucher" class="f-inp pay-field col-span-1" placeholder="0" />
              <input type="text" v-model="form.noVoucher" class="f-inp text-xs col-span-2" placeholder="No. Voucher" />
            </div>
          </div>

          <div class="pay-field-group mb-1">
            <label class="pay-lbl-input text-purple-600">3. CARD / DEBIT / KREDIT (Rp)</label>
            <input type="number" v-model.number="form.card" class="f-inp pay-field mb-1" placeholder="0" />
            <div class="grid grid-cols-2 gap-1">
              <input type="text" v-model="form.noCard" class="f-inp text-xs" placeholder="No. Kartu" />
              <input type="text" v-model="form.bankCard" class="f-inp text-xs" placeholder="Nama Bank" />
            </div>
          </div>

          <div class="pay-field-group mb-2">
            <label class="pay-lbl-input text-red-600">4. PIUTANG / BON (Rp)</label>
            <input type="number" v-model.number="form.piutang" class="f-inp pay-field field-piutang" placeholder="0" />
          </div>

          <div class="pay-field-group mt-1">
            <label class="pay-lbl-input text-slate-700 font-bold">KEMBALIAN</label>
            <div class="change-display">Rp {{ fmtCurrency(uangKembalian) }}</div>
          </div>
      
          <button class="btn-save-pos-sidebar mt-2" type="button" @click="handleSave" :disabled="isSaving || listCart.length === 0">
            <IconDeviceFloppy :size="16" /> SIMPAN NOTA (ENTER)
          </button>
        </div>
      </div>

    </div>

    <SearchModal
      v-model="showBarangModal"
      title="Pilih Item Barang"
      :columns="[
        { key: 'kode', title: 'KODE BARANG', width: '120px' },
        { key: 'nama', title: 'NAMA ITEM BARANG' },
        { key: 'satuan', title: 'SATUAN', width: '80px', align: 'center' }
      ]"
      :items="barangOptions"
      :loading="barangLoading"
      :server-search="true"
      search-placeholder="Cari kode atau nama barang..."
      :search-keys="['kode', 'nama']"
      @select="selectBarang"
      @search="searchBarang"
    />

    <SearchModal
  v-model="showCustomerModal"
  title="Pilih Customer / Member"
  :columns="[
    { key: 'kode', title: 'KODE CUSTOMER', width: '130px' },
    { key: 'nama', title: 'NAMA CUSTOMER' },
  ]"
  :items="customerOptions"
  :loading="customerLoading"
  :server-search="true"
  search-placeholder="Cari kode atau nama member..."
  :search-keys="['kode', 'nama']"
  @select="selectCustomer"
  @search="searchCustomer"
/>

<SearchModal
  v-model="showPendingModal"
  title="Daftar Transaksi Dipending (Hold)"
  :columns="[
    { key: 'NO_PENDING', title: 'NO. PENDING', width: '200px' },
    { key: 'TANGGAL', title: 'WAKTU PENDING', width: '180px' },
    { key: 'CUSTOMER', title: 'CUSTOMER / MEMBER' },
    { key: 'TOTAL', title: 'TOTAL BELANJA', width: '150px', align: 'right' }
  ]"
  :items="pendingList"
  :loading="pendingLoading"
  search-placeholder="Cari nomor pending atau customer..."
  :search-keys="['NO_PENDING', 'CUSTOMER']"
  @select="handleTakePending"
/>
  </div>
</template>

<style scoped>
.pos-wrap { padding: 10px; background: #edf2f7; min-height: 100vh; font-size: 12px; }
.action-bar { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 14px; font-weight: 700; color: #1a202c; }
.panel-info { background: white; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
.f-row { display: flex; align-items: center; gap: 8px; }
.f-lbl { width: 95px; font-weight: 600; color: #4a5568; }
.f-inp { flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; }
.readonly-bg { background-color: #f7fafc; cursor: not-allowed; }

/* Grid khusus Scan Barcode & Customer */
.barcode-customer-row {
  display: grid;
  grid-template-columns: 55% 45%;
  gap: 12px;
  align-items: center;
}

.input-inline-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lbl-inline {
  font-weight: bold;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}
.input-inline-group:first-child .lbl-inline { width: 90px; }
.input-inline-group:last-child .lbl-inline { width: 65px; }

.search-combine {
  display: flex;
  flex: 1;
  align-items: stretch;
  height: 28px;
}

.barcode-field {
  flex: 1;
  font-size: 12px;
  font-weight: bold;
  background-color: #fffaf0;
  border-color: #ed8936;
  border-radius: 4px 0 0 4px !important;
  padding: 0 8px;
}

.btn-search-compact {
  background: #ed8936;
  color: white;
  border: 1px solid #ed8936;
  border-radius: 0 4px 4px 0;
  padding: 0 10px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.customer-field {
  flex: 1;
  font-size: 12px;
  font-weight: bold;
  background-color: #f0f0fd;
  border-color: #8686ef;
  border-radius: 4px 0 0 4px !important;
  text-align: center;
  padding: 0 4px;
}

.customer-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e2e8f0;
  color: #334155;
  padding: 0 8px;
  border-radius: 0 4px 4px 0;
  font-weight: bold;
  font-size: 10px;
  border: 1px solid #cbd5e1;
  border-left: none;
  min-width: 55px;
  white-space: nowrap;
}

/* Display Total (Kiri, Besar, Rata Kanan) */
.display-total { 
  background: #1a202c; 
  color: #4848bb; 
  padding: 12px 18px; 
  border-radius: 4px; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  text-align: right; 
}
.display-total .lbl { font-size: 11px; color: #a0aec0; font-weight: bold; margin-bottom: 2px; }
.display-total .val { font-size: 36px; font-weight: 900; font-family: monospace; line-height: 1.1; }

/* Main layout */
.pos-main-content { display: flex; gap: 12px; align-items: flex-start; margin-top: 4px; }
.table-container { flex: 1; background: white; border-radius: 4px; border: 1px solid #cbd5e1; max-height: 500px; overflow-y: auto; }
.pos-table { width: 100%; border-collapse: collapse; }
.pos-table th { background: #4a5568; color: white; padding: 6px 8px; font-weight: bold; position: sticky; top: 0; }
.pos-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
.cell-input { padding: 2px 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; }

/* Sidebar Pembayaran */
.sidebar-payment { width: 330px; flex-shrink: 0; margin-top: 0px; }
.panel-pay-box { background: #ffffff; border: 1px solid #cbd5e1; border-top: 4px solid #3182ce; border-radius: 4px; padding: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.section-title { font-weight: 800; border-bottom: 2px dashed #e2e8f0; padding-bottom: 2px; margin: 4px 0 6px 0; color: #2d3748; }

.pay-field-group { display: flex; flex-direction: column; gap: 1px; }
.pay-lbl-input { font-weight: 700; font-size: 11px; }
.pay-field { font-size: 13px; font-weight: 700; text-align: right; padding: 4px 6px; }

.field-ongkir { background-color: #fffaf0; color: #dd6b20; border-color: #fbd38d; }
.field-cash { background-color: #f0f0ff; color: #3838a1; border-color: #9a9ae6; font-size: 14px; }
.field-piutang { background-color: #fff5f5; color: #e53e3e; border-color: #feb2b2; }

.change-display { background: #f7fafc; border: 1px solid #cbd5e1; padding: 6px; font-size: 16px; font-weight: 800; color: #3838a1; text-align: right; border-radius: 4px; font-family: monospace; }
.btn-save-pos-sidebar { width: 100%; background: #3838a1; color: white; border: none; padding: 8px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-save-pos-sidebar:disabled { background: #cbd5e1; color: #94a3b8; cursor: not-allowed; }
.btn-back { display: flex; align-items: center; gap: 4px; background: white; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.btn-del { color: #e53e3e; background: none; border: none; cursor: pointer; }
.tc { text-align: center; } .tr { text-align: right; } .mono { font-family: monospace; }
.empty-text { padding: 20px !important; color: #a0aec0; font-style: italic; }
.active-barcode-style {
  display: flex;
  align-items: center;
  background-color: #fffaf0; /* Warna krem lembut khas scan barcode */
  border: 1.5px solid #f28e2b; /* Border oranye */
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.active-barcode-style:hover {
  background-color: #fff5e6; /* Sedikit lebih gelap saat di-hover */
}

/* Hilangkan border bawaan input asli agar menyatu dengan background grup */
.f-inp-custom {
  background: transparent;
  border: none;
  outline: none;
  color: #333;
  font-weight: 500;
}

.btn-search-icon {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding-left: 5px;
}
.text-green-font {
  color: #1616a3; /* Ini kode warna hijau standar (setara text-green-600) */
}
.font-bold {
  font-weight: 700;
}
.btn-pending {
  background-color: #6b7280; /* Abu-abu metalik */
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.btn-pending:hover { background-color: #4b5563; }

.btn-ambil-pending {
  background-color: #0284c7; /* Biru langit cerah */
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.btn-ambil-pending:hover { background-color: #0369a1; }
</style>