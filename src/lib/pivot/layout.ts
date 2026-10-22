/**
 * Simpan/muat layout pivot per user (localStorage).
 *
 * Scope kunci = `<userKode>:<viewKey>` sehingga tiap user punya susunan field
 * sendiri untuk tiap laporan. localStorage dipakai (bukan sessionStorage) karena
 * layout dimaksudkan bertahan lintas sesi.
 */
import type { SavedPivotLayout } from "./types";

const PREFIX = "bsm-pivot-layout:";

export function layoutKey(viewKey: string, userKode?: string): string {
  const scope = `${userKode || "anon"}:${viewKey}`;
  return `${PREFIX}${scope}`;
}

export function saveLayout(
  viewKey: string,
  layout: Omit<SavedPivotLayout, "version" | "savedAt">,
  userKode?: string,
): void {
  try {
    const payload: SavedPivotLayout = {
      version: 1,
      ...layout,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(layoutKey(viewKey, userKode), JSON.stringify(payload));
  } catch {
    /* storage penuh / diblokir: abaikan, layout bukan data kritis */
  }
}

export function loadLayout(
  viewKey: string,
  userKode?: string,
): SavedPivotLayout | null {
  try {
    const raw = localStorage.getItem(layoutKey(viewKey, userKode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPivotLayout;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLayout(viewKey: string, userKode?: string): void {
  try {
    localStorage.removeItem(layoutKey(viewKey, userKode));
  } catch {
    /* abaikan */
  }
}
