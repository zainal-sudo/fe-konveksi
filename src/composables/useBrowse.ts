import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import * as XLSX from "xlsx";

interface UseBrowseOptions<T> {
  menuId: string;
  fetchApi: () => Promise<T[]>;
  immediate?: boolean;
  deleteApi?: (id: string) => Promise<void>;
}

export function useBrowse<T = any>(options: UseBrowseOptions<T>) {
  const authStore = useAuthStore();
  const toast = useToast();

  const items = ref<T[]>([]) as ReturnType<typeof ref<T[]>>;
  const isLoading = ref(false);
  const selected = ref<T[]>([]);

  const canView = computed(
    () => !options.menuId || authStore.can(options.menuId, "view"),
  );
  const canInsert = computed(
    () => !options.menuId || authStore.can(options.menuId, "insert"),
  );
  const canEdit = computed(
    () => !options.menuId || authStore.can(options.menuId, "edit"),
  );
  const canDelete = computed(
    () => !options.menuId || authStore.can(options.menuId, "delete"),
  );
  const canPrint = computed(
    () => !options.menuId || authStore.can(options.menuId, "print"),
  );
  const canExport = computed(
    () => !options.menuId || authStore.can(options.menuId, "view"),
  );

  const isSingleSelected = computed(() => selected.value.length === 1);
  const selectedItem = computed(() => selected.value[0] || null);

  const clearSelection = () => {
    selected.value = [];
  };

  const fetchData = async () => {
    if (!canView.value) {
      toast.error("Akses ditolak: Anda tidak memiliki izin untuk menu ini.");
      return;
    }
    isLoading.value = true;
    clearSelection();
    try {
      items.value = await options.fetchApi();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memuat data.");
    } finally {
      isLoading.value = false;
    }
  };

  const deleteData = async (id: string) => {
    if (!options.deleteApi) return;
    if (!canDelete.value) {
      toast.error("Akses ditolak: Anda tidak memiliki hak hapus.");
      return;
    }
    try {
      await options.deleteApi(id);
      toast.success("Data berhasil dihapus.");
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus data.");
    }
  };

  const exportToExcel = (fileName = "Export_Data") => {
    if (!canExport.value) {
      toast.error("Akses ditolak.");
      return;
    }
    if (!items.value?.length) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(items.value);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success(`Berhasil export ke ${fileName}.xlsx`);
    } catch {
      toast.error("Gagal melakukan export Excel.");
    }
  };

  onMounted(() => {
    if (options.immediate !== false) fetchData();
  });

  return {
    items,
    isLoading,
    selected,
    canView,
    canInsert,
    canEdit,
    canDelete,
    canPrint,
    canExport,
    isSingleSelected,
    selectedItem,
    fetchData,
    clearSelection,
    deleteData,
    exportToExcel,
  };
}
