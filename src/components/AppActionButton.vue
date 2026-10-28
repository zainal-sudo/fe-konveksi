<script setup lang="ts">
// Tombol aksi toolbar generik ala laporan laba rugi / neraca:
// layout kecil padat (.xbtn) + badge pintasan keyboard (<kbd>), dipakai
// oleh BaseBrowse (Baru/Ubah/Hapus/...) dan BaseForm (Simpan & ...).
// Varian warna dipilih lewat prop `variant`.
import { computed } from "vue";
import { IconLoader2 } from "@tabler/icons-vue";

const props = withDefaults(
  defineProps<{
    label: string;
    kbd?: string;
    icon?: any;
    variant?:
      | "primary"
      | "success"
      | "success-solid"
      | "error"
      | "outline"
      | "plain";
    disabled?: boolean;
    loading?: boolean;
    title?: string;
    dataMatch?: string;
  }>(),
  {
    kbd: undefined,
    icon: undefined,
    variant: "primary",
    disabled: false,
    loading: false,
    title: undefined,
    dataMatch: undefined,
  },
);

defineEmits(["click"]);

const btnClass = computed(() => [
  "xbtn",
  { [`xbtn-${props.variant}`]: props.variant !== "plain" },
]);

const titleText = computed(() => {
  if (props.title) return props.title;
  return props.kbd ? `${props.label} (${props.kbd})` : props.label;
});
</script>

<template>
  <button
    type="button"
    class="xbtn"
    :class="btnClass"
    :data-match="dataMatch"
    :disabled="disabled || loading"
    :title="titleText"
    @click="$emit('click')"
  >
    <IconLoader2
      v-if="loading"
      :size="12"
      :stroke-width="2"
      class="spin"
    />
    <component :is="icon" v-else-if="icon" :size="12" :stroke-width="1.8" />
    {{ label }}
    <kbd v-if="kbd" class="kbd">{{ kbd }}</kbd>
  </button>
</template>

<style scoped>
.xbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}
.xbtn:hover {
  transform: none;
}
.xbtn:active {
  transform: scale(0.97);
}
.xbtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.spin {
  animation: xbtn-spin 0.9s linear infinite;
}
@keyframes xbtn-spin {
  to {
    transform: rotate(360deg);
  }
}
/* ── Varian warna ── */
.xbtn-primary {
  color: #1d4ed8;
  background: rgba(239, 246, 255, 0.5);
  border: 1px solid rgba(37, 99, 235, 0.5);
}
.xbtn-primary:hover {
  background: #dbeafe;
  border-color: rgba(37, 99, 235, 0.7);
}
.xbtn-primary .kbd {
  color: #1d4ed8;
  background: #ffffff;
  border-color: #bfdbfe;
  box-shadow: 0 1px 0 rgba(29, 78, 216, 0.2);
}
.xbtn-success {
  color: #047857;
  background: rgba(236, 253, 245, 0.5);
  border: 1px solid rgba(5, 150, 105, 0.5);
}
.xbtn-success:hover {
  background: #d1fae5;
  border-color: rgba(5, 150, 105, 0.7);
}
.xbtn-success .kbd {
  color: #047857;
  background: #ffffff;
  border-color: #a7f3d0;
  box-shadow: 0 1px 0 rgba(5, 150, 105, 0.2);
}
/* Hijau solid (tombol aksi utama yang ditekankan, mis. Proses Penggajian):
   latar penuh + teks putih bold. Varian lain tetap seperti semula. */
.xbtn-success-solid {
  color: #ffffff;
  font-weight: 700;
  background: #16a34a;
  border: 1px solid #15803d;
}
.xbtn-success-solid:hover {
  background: #15803d;
  border-color: #166534;
}
.xbtn-success-solid .kbd {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: none;
}
.xbtn-error {
  color: #b91c1c;
  background: rgba(254, 242, 242, 0.5);
  border: 1px solid rgba(220, 38, 38, 0.5);
}
.xbtn-error:hover {
  background: #fee2e2;
  border-color: rgba(220, 38, 38, 0.7);
}
.xbtn-error .kbd {
  color: #b91c1c;
  background: #ffffff;
  border-color: #fecaca;
  box-shadow: 0 1px 0 rgba(220, 38, 38, 0.2);
}
.xbtn-outline {
  color: #475569;
  background: rgba(248, 250, 252, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.4);
}
.xbtn-outline:hover {
  background: #f1f5f9;
  border-color: rgba(100, 116, 139, 0.6);
}
.xbtn-outline .kbd {
  color: #475569;
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 1px 0 rgba(100, 116, 139, 0.2);
}
.xbtn-plain {
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
}
.xbtn-plain:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}
/* Badge pintasan — netral, disesuaikan per varian lewat selector di atas. */
.kbd {
  display: inline-block;
  padding: 1px 5px;
  margin-left: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
  line-height: 1.4;
  border-radius: 4px;
}
</style>