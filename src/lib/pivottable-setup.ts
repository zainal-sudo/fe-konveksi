import $ from "jquery";

if (!($ as any).isFunction) {
  ($ as any).isFunction = (obj: any) => typeof obj === "function";
}
if (!($ as any).isArray) {
  ($ as any).isArray = Array.isArray;
}

let pivotLoaded = false;

export const initPivot = async () => Promise.resolve();
export const jQuery = (window as any).$;

// Subtotal.js (collapse/expand baris+kolom dengan subtotal) — dimuat via
// CDN di index.html setelah pivot.min.js. Null jika CDN gagal dimuat.
export const getSubtotalExtension = () => {
  const pu = (window as any)?.$?.fn?.pivotUtilities;
  if (!pu?.subtotal_renderers || !pu?.SubtotalPivotData) return null;
  return pu;
};
