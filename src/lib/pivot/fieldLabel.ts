/**
 * Label tampilan field pivot yang rapi.
 *
 * Field dari backend memakai snake_case/camelCase (Group_produk, Nilai_Net,
 * JenisCustomer, Nilaiblmppn). Digunakan hanya untuk TAMPILAN — key asli tetap
 * dipakai untuk logika (filter/agregasi/layout).
 */
const ALIAS: Record<string, string> = {
  fpd_cn: "CN",
  Fpd_cn: "CN",
  Nilaiblmppn: "Nilai Bruto PPN",
  NilaiEkspedisi: "Nilai Ekspedisi",
  Group_produk: "Group Produk",
  group_produk: "Group Produk",
  biaya_promosi: "Biaya Promosi",
  fee_marketing: "Fee Marketing",
  StatusHet: "Status HET",
  IsPf: "Is PF",
  isCatalog: "Katalog",
  JthTempo: "Jatuh Tempo",
  TglMasuk: "Tgl Masuk",
  HrgMin: "Hrg Min",
  Lastcost: "Last Cost",
  lastcost: "Last Cost",
  IdBatch: "Id Batch",
  idBatch: "Id Batch",
  TglFaktur: "Tgl Faktur",
  JatuhTempo: "Jatuh Tempo",
  RangeOverdue: "Range Overdue",
};

/**
 * Ubah nama field mentah jadi label rapi: snake_case/camelCase → spasi,
 * huruf pertama kapital. Alias khusus menang atas yang ambigu.
 */
export function prettyField(field: string): string {
  if (!field) return field;
  if (ALIAS[field]) return ALIAS[field];
  return field
    .replace(/_+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Rapikan label nilai agregat semacam "Nilaiblmppn (Sum)" /
 * "Kontrak (Count)" → "Nilai Bruto PPN (Sum)".
 */
export function prettyAggValueLabel(label: string): string {
  if (!label) return label;
  const m = /^(.*?)\s*\(([^)]*)\)$/.exec(label.trim());
  if (!m) return prettyField(label);
  return `${prettyField(m[1])} (${m[2]})`;
}