/**
 * Kolom USER untuk browse SPK & LHK.
 *
 * Sumbernya dua kolom audit di DB:
 *   - user_create   = siapa yang pertama membuat record
 *   - user_modified = siapa yang terakhir mengubahnya (NULL kalau belum diedit)
 *
 * Ditampilkan sebagai SATU kolom (sesuai permintaan): kalau belum pernah
 * diedit -> nama pembuat; kalau sudah diedit -> nama editor terakhir dengan
 * tanda ↻, plus tooltip "Dibuat oleh: X / Terakhir diubah: Y (tanggal)".
 *
 * Record lama yang dibuat sebelum kolom audit ada akan punya NULL → tampil "-".
 */

export interface UserCellItem {
  UserCreate?: string | null;
  UserModified?: string | null;
  DateCreate?: string | null;
  DateModified?: string | null;
}

const bersih = (v?: string | null) => String(v ?? "").trim();

export interface UserCell {
  /** Teks yang ditampilkan di sel. */
  text: string;
  /** true kalau nilai yang tampil adalah editor terakhir, bukan pembuat. */
  edited: boolean;
  /** Tooltip penjelas. Kosong kalau tidak ada info audit sama sekali. */
  title: string;
}

function waktu(v?: string | null): string {
  return bersih(v).replace("T", " ");
}

/**
 * Bentuk isi sel USER dari baris browse. Tidak pernah melempar error —
 * baris tanpa data audit tetap tampil "-".
 */
export function userCell(item?: UserCellItem | null): UserCell {
  const creator = bersih(item?.UserCreate);
  const editor = bersih(item?.UserModified);
  // Editor dihitung hanya kalau memang beda; user yang sama bisa saja
  // create lalu edit, dan itu tidak perlu ditandai.
  const editorBeda =
    editor && editor.toUpperCase() !== creator.toUpperCase();

  if (!creator && !editor) return { text: "-", edited: false, title: "" };

  const parts: string[] = [];
  if (creator) {
    const t = waktu(item?.DateCreate);
    parts.push(`Dibuat oleh: ${creator}${t ? ` (${t})` : ""}`);
  }
  if (editorBeda) {
    const t = waktu(item?.DateModified);
    parts.push(`Terakhir diubah: ${editor}${t ? ` (${t})` : ""}`);
  }

  return {
    text: editorBeda ? `${editor} ↻` : creator || editor,
    edited: !!editorBeda,
    title: parts.join("\n"),
  };
}

/**
 * Versi teks polos untuk export Excel — tanpa simbol ↻ supaya aman di
 * Excel versi lama.
 */
export function userCellText(item?: UserCellItem | null): string {
  const creator = bersih(item?.UserCreate);
  const editor = bersih(item?.UserModified);
  const editorBeda =
    editor && editor.toUpperCase() !== creator.toUpperCase();
  if (!creator && !editor) return "";
  if (editorBeda && creator) return `${creator} / ${editor}`;
  return creator || editor;
}