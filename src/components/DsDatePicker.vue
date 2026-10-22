<script setup lang="ts">
import { computed, ref } from "vue";

// id/style/@keydown dari pemakai (mis. id sel grid) diteruskan ke input di dalam,
// supaya getElementById().focus() ala useDetailGrid tetap bekerja.
defineOptions({ inheritAttrs: false });

// Kontrak v-model: string "YYYY-MM-DD" atau "" sama dengan <input type="date"> lama.
const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    disabled?: boolean;
    readonly?: boolean;
    /** toolbar = filter 130px; form = melebar seperti .f-inp; cell = sel grid detail */
    variant?: "toolbar" | "form" | "cell";
    placeholder?: string;
  }>(),
  {
    modelValue: "",
    disabled: false,
    readonly: false,
    variant: "form",
    placeholder: "dd/mm/yyyy",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string | null): void;
  // Hanya saat nilai berubah lewat UI (picker/ketik), meniru @change
  // pada <input type="date"> yang dipakai form-form lama.
  (e: "change", v: string | null): void;
  // Diteruskan dari input di dalam; dipakai grid detail utk melacak editMode.
  (e: "focus", ev: FocusEvent): void;
  (e: "blur", ev: FocusEvent): void;
}>();

const menu = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

const display = computed(() => {
  if (!props.modelValue) return "";
  const [y, m, d] = props.modelValue.split("-");
  return d && m && y ? `${d}/${m}/${y}` : props.modelValue;
});

const pickerModel = computed<Date | undefined>(() => {
  if (!props.modelValue) return undefined;
  // Parse lokal (bukan UTC) supaya tanggal tidak geser satu hari.
  const [y, m, d] = props.modelValue.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
});

function setValue(v: string | null) {
  if (props.modelValue !== v) {
    emit("update:modelValue", v);
    emit("change", v);
  }
}

function onPick(v: unknown) {
  const val = Array.isArray(v) ? (v[0] as Date | undefined) : (v as Date | undefined);
  if (!val) return;
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, "0");
  const d = String(val.getDate()).padStart(2, "0");
  // Tidak menutup popup: pengguna bisa mengganti-ganti tanggal dulu.
  // Tutup dengan klik di luar, Escape, atau Enter (seperti input native).
  setValue(`${y}-${m}-${d}`);
}

// Ketik manual dd/mm/yyyy; selain itu teks dikembalikan ke nilai ter-format.
function onTyped(e: Event) {
  const el = e.target as HTMLInputElement;
  const raw = el.value.trim();
  if (!raw) {
    setValue(null);
    return;
  }
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const chk = new Date(Number(y), Number(mo) - 1, Number(d));
    if (
      chk.getFullYear() === Number(y) &&
      chk.getMonth() === Number(mo) - 1 &&
      chk.getDate() === Number(d)
    ) {
      setValue(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
      return;
    }
  }
  el.value = display.value;
}

// Keyboard: ArrowDown buka kalender, Escape tutup, Enter tutup bila terbuka.
// stopPropagation agar handler grid useDetailGrid (arrow/Enter pindah sel)
// tidak ikut bereaksi saat fokus di sel date.
function onKeydown(e: KeyboardEvent) {
  if (props.disabled || props.readonly) return;
  const k = e.key;
  if (k === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    menu.value = true;
  } else if (k === "Escape") {
    e.stopPropagation();
    menu.value = false;
  } else if (k === "Enter" && menu.value) {
    e.stopPropagation();
    menu.value = false;
  }
}

function onFieldFocus(ev: FocusEvent) {
  emit("focus", ev);
}
function onFieldBlur(ev: FocusEvent) {
  emit("blur", ev);
}

defineExpose({ focus: () => inputEl.value?.focus() });

const cls = computed(() => ["ds-date", `ds-date--${props.variant}`]);
</script>

<template>
  <div :class="cls">
    <VMenu
      v-model="menu"
      activator="parent"
      :close-on-content-click="false"
      location="bottom start"
      origin="top start"
      transition="scale-transition"
      :disabled="disabled || readonly"
      :z-index="10001"
      content-class="ds-date-menu"
    >
      <VDatePicker
        :model-value="pickerModel"
        @update:model-value="onPick"
        show-adjacent-months
        color="primary"
        locale="id-ID"
      />
    </VMenu>
    <input
      ref="inputEl"
      v-bind="$attrs"
      class="ds-date__input"
      :value="display"
      :disabled="disabled"
      :readonly="readonly"
      :placeholder="placeholder"
      autocomplete="off"
      @focus="onFieldFocus"
      @blur="onFieldBlur"
      @change="onTyped"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.ds-date {
  display: inline-flex;
}

/* Input pakai resep yang sama dengan input tanggal/design-system lama
   (single-line input browser selalu center vertikal, tanpa metrik Vuetify). */
.ds-date__input {
  width: 100%;
  box-sizing: border-box;
  outline: none;
  background: #fff;
  color: #000000;
  font-weight: 500;
  border: 1px solid var(--ds-border, #A0AAB8);
  border-top-color: var(--ds-border-inset-edge, #7E8B9B);
  border-left-color: var(--ds-border-inset-edge, #7E8B9B);
  border-radius: 0;
  font-family: inherit;
}
.ds-date__input:focus {
  border-color: var(--ds-primary, #3B5998);
}
.ds-date__input:disabled {
  background: var(--ds-surface-inset, #E0E4EA);
  cursor: not-allowed;
}
.ds-date__input::placeholder {
  color: #8494A7;
  font-weight: 500;
}

/* Ukuran per konteks, sama seperti sebelum migrasi:
   toolbar = .date-inp (30px), form = .f-inp (22px), cell = .cell-inp (20px). */
.ds-date--toolbar {
  width: 130px;
}
.ds-date--toolbar .ds-date__input {
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
}

.ds-date--form {
  flex: 1 1 auto;
  min-width: 120px;
  max-width: 400px;
}
.ds-date--form .ds-date__input {
  height: 22px;
  padding: 1px 6px;
  font-size: 11px;
}

.ds-date--cell {
  flex: 1 1 auto;
  width: 100%;
}
.ds-date--cell .ds-date__input {
  height: 20px;
  padding: 0 3px;
  font-size: 11px;
}
</style>

<!-- Popup ter-teleport ke body, jadi butuh style non-scoped. -->
<style>
.ds-date-menu .v-picker {
  border-radius: 0;
  border: 1px solid var(--ds-border, #A0AAB8);
  box-shadow: 0 8px 24px rgba(15, 26, 46, 0.18);
}

/* Popup dipadatkan ke skala aplikasi (font 11px): default Vuetify dirancang
   utk sentuhan (sel 40px, container 328px, padding 24px). */
.ds-date-menu .v-date-picker {
  width: 252px;
  padding-inline: 6px;
}

/* Label tanggal terpilih di atas: font 32px/tinggi 70px milik Vuetify
   terlalu dominan; dibuat 16px dan rapat ke kalender di bawahnya. */
.ds-date-menu .v-date-picker-header {
  height: 40px;
  padding-inline: 8px;
  padding-bottom: 2px;
}
.ds-date-menu .v-date-picker-header__content {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
}
.ds-date-menu .v-date-picker-header .v-btn {
  --v-btn-height: 20px;
  --v-btn-size: 12px;
}
.ds-date-menu .v-date-picker-controls {
  font-size: 12px;
}
.ds-date-menu .v-date-picker-controls .v-btn {
  --v-btn-height: 22px;
  --v-btn-size: 12px;
}
.ds-date-menu .v-date-picker-month {
  padding-inline: 0;
}
.ds-date-menu .v-date-picker-month__day {
  height: 26px;
  width: 26px;
}
.ds-date-menu .v-date-picker-month__day .v-btn.v-date-picker-month__day-btn {
  --v-btn-height: 20px;
  --v-btn-size: 11px;
}
.ds-date-menu .v-date-picker-month__weekday {
  font-size: 10px;
  font-weight: 600;
}
</style>
