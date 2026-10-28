<script setup lang="ts">
import { ref, watch } from "vue";

type ModelValue = number | string | null | undefined;

const props = withDefaults(
  defineProps<{
    modelValue?: ModelValue;
    maxDecimals?: number;
    min?: number;
    max?: number;
    allowNegative?: boolean;
    decimalSep?: "dot" | "comma";
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    inputClass?: string;
    inputId?: string;
    /**
     * Tampilkan nilai 0 sebagai field KOSONG (default-nya tampil "0").
     *
     * UNTUK APA INI: sebagian form meng-default-kan quantity-nya ke 0.
     * Kalau angka 0 itu benar-benar terlihat di dalam kolom, user yang
     * mau ngetik "5" fear salah tempat lalu ketik jadi "50"/"05",
     * karena angka 0 dianggap sudah berisi. Dengan flag ini kolom mulai
     * kosong, jadi angka yang diketik user yang pertama.
     *
     * Catatan: blank TIDAK mengubah modelValue jadi string kosong —
     * komponen tetap emit `null`, dan 0 yang diketik user sendiri juga
     * ikut jadi blank (0 == kosong untuk kolom qty).
     */
    zeroAsEmpty?: boolean;
  }>(),
  {
    modelValue: undefined,
    maxDecimals: 2,
    min: undefined,
    max: undefined,
    allowNegative: false,
    decimalSep: "dot",
    placeholder: "",
    disabled: false,
    readonly: false,
    inputClass: "",
    inputId: undefined,
    zeroAsEmpty: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void;
  (e: "input", value: string): void;
  (e: "change", value: number | null): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
}>();

const inputEl = ref<HTMLInputElement | null>(null);

// ── Parse helpers ─────────────────────────────────────────────────────
// Raw value sanitized: hanya digit, minus (jika diizinkan), dan maks. satu titik.
//
// decimalSep="comma" (mode Indonesia): koma DITERIMA sebagai pemisah desimal
// saat mengetik — "5,7" berarti 5.7, bukan 57. Untuk pasted value, pemisah
// desimal ditentukan dari yang TERAKHIR muncul: "1.234,56" (ID) dan
// "1,234.56" (EN) dua-duanya benar jadi 1234.56. Koma ribuan yang ketinggal
// dibuang. Aliasannya: "1,000" Paste dianggap desimal (1.0) — grouped value
// tidak pernah tampil saat field difokus, jadi ini cuma sisa kasus paste.
const sanitizeRaw = (raw: string): string => {
  let s = raw;
  if (props.decimalSep === "comma") {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      // desimalnya koma -> titik, buang semua titik sebelumnya (koma ribuan)
      s = s.slice(0, lastComma).replace(/\./g, "") + "." + s.slice(lastComma + 1);
    } else {
      // tidak ada desimal koma -> koma apa pun adalah koma ribuan
      s = s.replace(/,/g, "");
    }
  } else {
    s = s.replace(/,/g, ""); // buang koma ribuan (hanya tampilan)
  }
  if (!props.allowNegative) {
    s = s.replace(/-/g, "");
  } else {
    // minus hanya boleh di posisi awal, max satu
    const hasMinus = s.includes("-");
    s = s.replace(/-/g, "");
    if (hasMinus && s.length) s = "-" + s;
  }
  // hanya simpan digit & maks. satu titik
  const parts = s.split(".");
  const intPart = parts.shift() ?? "";
  const decPart = parts.join(".");
  const cleanDec = decPart.replace(/[^\d]/g, "");
  let clean = intPart.replace(/[^\d]/g, "");
  if (parts.length > 0) clean += "." + cleanDec;
  return clean;
};

const rawToNumber = (raw: string): number | null => {
  if (!raw || raw === "-" || raw === ".") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
};

// Format angka tanpa koma menjadi tampilan dengan koma ribuan + titik desimal
const formatDisplay = (raw: string): string => {
  if (!raw) return "";
  let negative = false;
  let body = raw;
  if (body.startsWith("-")) {
    negative = true;
    body = body.slice(1);
  }
  const t = body.split(".");
  const intPart = t[0] || "0";
  const decPart = t.length > 1 ? "." + t[1] : "";
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "-" : "") + grouped + decPart;
};

// Hitung indeks string (posisi kursor) untuk digit ke-N pada string berformat.
const indexForDigit = (formatted: string, digitIndex: number): number => {
  let digitCount = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9]/.test(formatted[i])) {
      if (digitCount === digitIndex) return i;
      digitCount++;
    }
  }
  return formatted.length;
};

// ── State: raw string adalah sumber kebenaran ─────────────────────────
const raw = ref<string>("");
const display = ref<string>("");
const isFocused = ref(false);

// Dengan zeroAsEmpty, nilai 0 diperlakukan sama dengan null/undefined/"",
// jadi kolom tampil KOSONG. Dipakai form yang default quantity-nya 0.
const isKosong = (v: ModelValue): boolean => {
  if (v === undefined || v === null || v === "") return true;
  if (!props.zeroAsEmpty) return false;
  const n = Number(v);
  return Number.isFinite(n) && n === 0;
};

// Inisialisasi dari modelValue (mis. edit)
const initFromModel = (v: ModelValue) => {
  if (isKosong(v)) {
    raw.value = "";
  } else {
    raw.value = sanitizeRaw(String(v));
  }
  display.value = formatDisplay(raw.value);
};
const needsInit = ref(true);
watch(
  () => props.modelValue,
  (v) => {
    if (needsInit.value) {
      initFromModel(v);
      needsInit.value = false;
      return;
    }
    // Jika nilai luar berubah karena sumber lain (reset form, load data) —
    // sinkronkan ke display, kecuali sedang fokus ketik (hindari tiban input user).
    if (!isFocused.value) {
      raw.value = isKosong(v) ? "" : sanitizeRaw(String(v ?? ""));
      display.value = formatDisplay(raw.value);
    }
  },
  { immediate: true },
);

// ── Emit ke parent ────────────────────────────────────────────────────
const commitRaw = (nextRaw: string) => {
  raw.value = nextRaw;
  display.value = formatDisplay(nextRaw);
  const num = rawToNumber(nextRaw);
  emit("update:modelValue", num);
  emit("input", nextRaw);
  emit("change", num);
};

const onInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const oldFormatted = el.value;
  const cursor = el.selectionStart ?? oldFormatted.length;

  // Hitung berapa digit sebelum kursor di string lama (sudah berformat),
  // serta berapa pemisah (koma-ribuan & minus) sebelum kursor.
  let digitBefore = 0;
  for (let i = 0; i < cursor; i++) {
    if (/[0-9]/.test(oldFormatted[i])) digitBefore++;
  }

  const newRaw = sanitizeRaw(el.value);
  commitRaw(newRaw);

  // Pulihkan posisi kursor: cari titik di string baru di mana digit ke-digitBefore berada.
  requestAnimationFrame(() => {
    if (!inputEl.value) return;
    const formatted = display.value;
    const pos = indexForDigit(formatted, digitBefore);
    inputEl.value.setSelectionRange(pos, pos);
  });
};

const onFocus = (e: FocusEvent) => {
  isFocused.value = true;
  // Lepas grouping + tampilkan raw apa adanya (pemisah desimal internal).
  // WAJIB di mode comma: kalau tetap "1,000" di layar, user ketik "5"
  // berubah jadi "1,0005" -> 1.0005. Nilai tidak berubah, hanya tampilan.
  display.value = raw.value;
  emit("focus", e);
};

const onBlur = (e: FocusEvent) => {
  isFocused.value = false;
  // Bersihkan leading zeros & nilai invalid saat kehilangan fokus. TIDAK
  // meng-clamp ke min/max di sini — kalau qty melebihi sisa SO, biarkan
  // apa adanya (kolom jadi merah lewat isOverSisa di parent) supaya user
  // sadar sendiri nilainya salah, dan biar validateForm/backend yang
  // menolak simpan dgn toast error — bukan diam-diam dikoreksi.
  const num = rawToNumber(raw.value);
  if (num !== null) {
    // zeroAsEmpty: 0 yang diketik user juga diratakan jadi kosong, supaya
    // tidak ada angka 0 nyasar di kolom yang sengaja dibiarkan blank.
    if (props.zeroAsEmpty && num === 0) {
      raw.value = "";
      display.value = "";
      emit("update:modelValue", null);
      emit("change", null);
      emit("blur", e);
      return;
    }
    let out: string;
    if (raw.value.includes(".")) {
      const [int, dec] = raw.value.split(".");
      out = String(Number(int || "0")) + (dec ? "." + dec : "");
    } else {
      out = String(Number(raw.value));
    }
    raw.value = out;
    display.value = formatDisplay(out);
    const finalNum = rawToNumber(out);
    emit("update:modelValue", finalNum);
    emit("change", finalNum);
  } else if (raw.value !== "") {
    raw.value = "";
    display.value = "";
    emit("update:modelValue", null);
    emit("change", null);
  }
  emit("blur", e);
};

const onKeydown = (e: KeyboardEvent) => {
  const keyDesimal = props.decimalSep === "comma" ? "," : ".";
  // Koma hanya sah sebagai pemisah desimal di mode comma; di mode dot koma
  // diblokir (dipakai sebagai koma ribuan di formatDisplay).
  if (e.key === "," && props.decimalSep !== "comma") {
    e.preventDefault();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return; // izinkan shortcut
  if (e.key === "Tab" || e.key === "Enter" || e.key === "Backspace" ||
      e.key === "Delete" || e.key === "ArrowLeft" || e.key === "ArrowRight" ||
      e.key === "Home" || e.key === "End") return;
  if (!props.allowNegative && (e.key === "-" || e.key === "+")) {
    e.preventDefault();
    return;
  }
  // mode comma: izinkan koma sebagai pemisah desimal, titik jadi karakter
  // asing yang diblokir (cuma boleh satu desimal).
  const polaHuruf = props.decimalSep === "comma" ? /^[0-9,]$/ : /^[0-9.]$/;
  if (!polaHuruf.test(e.key)) {
    e.preventDefault();
    return;
  }
  // cegah desimal kedua
  if (e.key === keyDesimal && raw.value.includes(".")) {
    e.preventDefault();
    return;
  }
  if (props.maxDecimals !== undefined && props.maxDecimals >= 0 && e.key !== keyDesimal) {
    // cek apakah sudah melewati batas desimal di ujung
    const dotIdx = raw.value.indexOf(".");
    if (dotIdx !== -1) {
      const cursor = (e.target as HTMLInputElement).selectionStart ?? raw.value.length;
      if (cursor > dotIdx) {
        const decLen = raw.value.length - dotIdx - 1;
        if (decLen >= props.maxDecimals) {
          e.preventDefault();
          return;
        }
      }
    }
  }
};

// expose untuk tooltip/title dsb bila perlu
defineExpose({ raw: () => raw.value, getNumber: () => rawToNumber(raw.value), focus: () => inputEl.value?.focus() });
</script>

<template>
  <input
    ref="inputEl"
    :id="inputId || undefined"
    type="text"
    inputmode="decimal"
    :value="display"
    class="num-input"
    :class="inputClass"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeydown"
  />
</template>

<style scoped>
.num-input {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 8px;
  font-family: var(--font-sans, "Plus Jakarta Sans", sans-serif);
  font-size: var(--fs-body, 13px);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: #1e293b;
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-default, #cbd5e1);
  border-radius: 8px;
  outline: none;
  transition:
    border-color var(--transition-base, 150ms),
    box-shadow var(--transition-base, 150ms);
}
.num-input:hover:not(:disabled):not(:focus) {
  border-color: #94a3b8;
}
.num-input:focus {
  border-color: var(--border-focus, #1e40af);
  box-shadow: var(--focus-glow, 0 0 0 3px rgba(30, 64, 175, 0.15));
}
.num-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
.num-input:read-only:not(:disabled) {
  background: #f8fafc;
}
</style>