// composables/useBrowseNavigation.ts
import { useRouter } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";

// BUGFIX flow "Simpan & Tutup" (dan flow pindah-halaman lain yang menutup
// tab form lalu kembali ke Browse):
//
// Pola lama yang dipakai SEMUA form = closeTab() DULU, baru router.push(browse).
// Masalah: closeTab() memindahkan activeTabId secara SINKRON ke tab TETANGGA
// (mis. tab form BPB yang sempat dibuka dari form ini — urutan tab: [browse,
// formA, formBPB]). Watcher di TabView.vue lalu ikut me-navigate router ke
// tab tetangga itu, MENYALIP navigasi router.push(browse) kita — akibatnya
// user "nyangkut" di form lain (BPB) alih-alih balik ke halaman browse.
//
// Solusinya di sini: urutkan sebaliknya:
//   1. router.push() ke route browse DULU, tunggu sampai navigasi selesai
//      (di sinilah activeTabId sudah beralih ke tab browse via openTab()).
//   2. Baru tutup tab form ini menggunakan id-nya (BUKAN "tab aktif"), jadi
//      closeTab() tidak perlu memilih tab aktif baru & watcher TabView tidak
//      menavigasi ke mana-mana.
export function useBrowseNavigation() {
  const router = useRouter();
  const tabsStore = useTabsStore();

  const goBrowseCloseCurrent = async (routeName: string) => {
    // Pakai id tab yang SEDANG AKTIF: di semua pemanggilan, user memang
    // berada di tab form ini (klik Simpan/Tutup/Cetak), jadi tab ini pasti
    // tab aktif saat dipanggil.
    const formTabId = tabsStore.activeTabId;
    try {
      await router.push({ name: routeName });
    } catch {
      // navigasi gagal — tetap tutup tab form supaya tidak nyangkut;
      // tab aktif saat itu akan diambil dari tetangganya oleh closeTab().
    }
    if (formTabId) tabsStore.closeTab(formTabId);
  };

  return { goBrowseCloseCurrent };
}