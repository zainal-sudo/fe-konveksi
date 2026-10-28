// composables/useFormSession.ts
//
// Utility kecil untuk menyimpan draft form "+ Baru" (create mode) sementara
// ke sessionStorage, supaya:
//  - kalau user pindah-pindah tab (KeepAlive) data TETAP ada — ini otomatis
//    jalan tanpa utility ini, tapi...
//  - kalau user me-refresh browser (F5) di tengah isi form, data TIDAK
//    hilang — untuk ini draft-nya perlu disimpan ke sessionStorage supaya
//    bisa di-restore lagi setelah reload.
//
// Draft ini HARUS dihapus (clearFormData) di dua momen saja:
//   1. Sesaat sebelum navigasi ke route create dari tombol "+ Baru" di
//      Browse — supaya form yang muncul kosong walau tab lama masih ada
//      draft lamanya.
//   2. Setelah submit/simpan form berhasil — supaya draft tidak nyangkut
//      dipakai lagi utk entri berikutnya.
//
// JANGAN dipanggil dari watcher route / tab switch — pindah tab semata
// tidak boleh menghapus draft (lihat komponen KeepAlive di TabView.vue).

const PREFIX = "form_";

export function useFormSession<T = any>(moduleName: string) {
  const key = PREFIX + moduleName;

  const saveFormData = (data: T) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* quota penuh / storage diblokir — abaikan saja */
    }
  };

  const loadFormData = (): T | null => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const clearFormData = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* abaikan */
    }
  };

  return { saveFormData, loadFormData, clearFormData };
}
