<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useQzPrint } from "@/composables/useQzPrint";
import {
  IconPrinter,
  IconRefresh,
  IconCheck,
  IconDeviceFloppy,
  IconTrash,
  IconPlayerPlay,
} from "@tabler/icons-vue";

const toast = useToast();
const { connect, getPrinters, savePrinter, getSavedPrinter, clearPrinter, printRaw, printers, isConnected, isConnecting } =
  useQzPrint();

const currentPrinter = ref<string | null>(null);
const selectedPrinter = ref<string | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(() => {
  currentPrinter.value = getSavedPrinter();
  selectedPrinter.value = currentPrinter.value;
});

const fetchPrinters = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const list = await getPrinters();
    if (list.length === 0) {
      errorMessage.value =
        "Tidak ditemukan printer. Pastikan QZ Tray sudah berjalan dan printer sudah terinstall.";
    }
  } catch (e: any) {
    errorMessage.value =
      e.message || "Gagal menghubungkan ke QZ Tray. Pastikan QZ Tray sudah berjalan.";
  } finally {
    isLoading.value = false;
  }
};

const doSimpan = () => {
  if (!selectedPrinter.value) {
    toast.warning("Pilih printer terlebih dahulu.");
    return;
  }
  savePrinter(selectedPrinter.value);
  currentPrinter.value = selectedPrinter.value;
  toast.success(`Printer "${selectedPrinter.value}" berhasil disimpan.`);
};

const doHapus = () => {
  clearPrinter();
  currentPrinter.value = null;
  selectedPrinter.value = null;
  toast.info("Setting printer dihapus.");
};

const doTestPrint = async () => {
  const printer = currentPrinter.value || selectedPrinter.value;
  if (!printer) {
    toast.warning("Pilih dan simpan printer terlebih dahulu.");
    return;
  }

  try {
    const NL = "\r\n";
    const ESC = "\x1B";
    const rawData = [
      ESC + "@",
      ESC + "a" + "\x01",
      "=== TEST PRINT ===",
      NL,
      ESC + "a" + "\x00",
      `Printer: ${printer}`,
      NL,
      `Tanggal: ${new Date().toLocaleDateString("id-ID")}`,
      NL,
      "Jika teks ini tercetak dengan benar,",
      "maka printer sudah siap digunakan.",
      NL,
      NL,
      NL,
    ];
    await printRaw(printer, rawData);

  } catch (e: any) {
    toast.error(e.message || "Gagal mengirim test print.");
  }
};
</script>

<template>
  <div class="setting-printer-page">
    <div class="sp-header">
      <IconPrinter :size="28" :stroke-width="1.8" color="#2e7d32" />
      <div>
        <h2 class="sp-title">Setting Printer</h2>
      </div>
    </div>

    <!-- Status Printer Saat Ini -->
    <div class="sp-card">
      <div class="sp-card-title">
        <IconCheck :size="18" :stroke-width="1.8" color="#2e7d32" />
        Printer Aktif
      </div>
      <div v-if="currentPrinter" class="sp-current-printer">
        <div class="sp-printer-name">{{ currentPrinter }}</div>
    
      </div>
      <div v-else class="sp-no-printer">
        Belum ada printer yang dipilih. Silakan pilih printer di bawah.
      </div>
    </div>

    <!-- Pilih Printer Baru -->
    <div class="sp-card">
      <div class="sp-card-title">
        <IconPrinter :size="18" :stroke-width="1.8" />
        Pilih Printer
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>

      <!-- <v-alert type="info" variant="tonal" class="mb-4">
        Klik <strong>Refresh</strong> untuk memuat daftar printer yang terinstall di komputer.
        Pilih printer dot matrix lalu klik <strong>Simpan</strong>.
      </v-alert> -->

      <div class="sp-select-row">
        <v-select
          v-model="selectedPrinter"
          :items="printers"
          label="Pilih Printer"
          placeholder="Klik Refresh untuk memuat daftar printer..."
          :loading="isLoading"
          :disabled="isLoading"
          density="comfortable"
          variant="outlined"
          hide-details
          class="sp-select"
          prepend-inner-icon="mdi-printer"
        />
        <v-btn
          icon
          variant="text"
          size="small"
          :loading="isLoading"
          @click="fetchPrinters"
          title="Refresh daftar printer"
        >
          <IconRefresh :size="20" />
        </v-btn>
      </div>

      <div v-if="isConnected" class="sp-qz-status sp-qz-ok">
        <IconCheck :size="14" />
        QZ Tray terhubung
      </div>
      <div v-else-if="isConnecting" class="sp-qz-status sp-qz-wait">
        Menghubungkan ke QZ Tray...
      </div>

      <div class="sp-actions">
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!selectedPrinter"
          @click="doSimpan"
          prepend-icon="mdi-content-save"
        >
          <template #prepend>
            <IconDeviceFloppy :size="18" />
          </template>
          Simpan
        </v-btn>
        <v-btn
          variant="outlined"
          color="error"
          :disabled="!currentPrinter"
          @click="doHapus"
        >
          <template #prepend>
            <IconTrash :size="18" />
          </template>
          Hapus Setting
        </v-btn>
      </div>
    </div>

    <!-- Test Print -->
    <div class="sp-card">
      <div class="sp-card-title">
        <IconPlayerPlay :size="18" :stroke-width="1.8" />
        Test Print
      </div>
      <p class="sp-desc">
        Kirim test print ke printer yang sudah dipilih untuk memastikan koneksi berfungsi.
      </p>
      <v-btn
        variant="tonal"
        color="primary"
        :disabled="!currentPrinter"
        @click="doTestPrint"
      >
        <template #prepend>
          <IconPrinter :size="18" />
        </template>
        Kirim Test Print
      </v-btn>
    </div>

    <!-- Info -->
    <div class="sp-card sp-info-card">
      <div class="sp-card-title">
        <IconRefresh :size="18" :stroke-width="1.8" />
        Informasi
      </div>
      <ul class="sp-info-list">
        <li>Setting printer disimpan di <strong>localStorage</strong> browser ini.</li>
        <li>Jika browser di-uninstall atau data di-clear, setting akan hilang dan perlu diatur ulang.</li>
        <li>Pastikan <strong>QZ Tray</strong> sudah berjalan di komputer yang terhubung ke printer.</li>
        <li>Setting printer berlaku untuk semua halaman cetak (SO, DO, dll).</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.setting-printer-page {
  padding: 20px 24px;
  max-width: 600px;
}

.sp-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.sp-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.sp-subtitle {
  font-size: 12px;
  color: #666;
  margin: 2px 0 0;
}

.sp-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.sp-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.sp-current-printer {
  background: #e8f5e9;
  border-radius: 6px;
  padding: 12px 16px;
}

.sp-printer-name {
  font-size: 15px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 4px;
}

.sp-printer-status {
  font-size: 12px;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sp-no-printer {
  color: #999;
  font-size: 13px;
  font-style: italic;
}

.sp-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.sp-select {
  flex: 1;
}

.sp-qz-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.sp-qz-ok {
  color: #2e7d32;
}

.sp-qz-wait {
  color: #f57f17;
}

.sp-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.sp-desc {
  font-size: 13px;
  color: #555;
  margin-bottom: 12px;
}

.sp-info-card {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.sp-info-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #555;
  line-height: 1.8;
}

.sp-info-list li {
  margin-bottom: 2px;
}
</style>
