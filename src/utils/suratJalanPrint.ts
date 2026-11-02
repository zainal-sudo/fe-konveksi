// Generator cetak Surat Jalan Mutasi Cabang Out (Dot Matrix via QZ Tray).
// Satu lembar kertas dot matrix = PAS 33 baris (34 sudah tidak pas):
//   header 10 + data 16 + pengisi + ttd 7 = 33
//   halaman lanjutan: header 10 + data 16 + pengisi 7 = 33

// ── Layout halaman (kertas dot matrix) ─────────────────────────────────
export const LINES_PER_PAGE = 33;
// jumlah baris yang dihasilkan formatHeaderLinesSuratJalan
const HEADER_LINE_COUNT = 10;
// blok tanda tangan = 7 baris (buildSignatureRowsSuratJalan)
const SIG_LINE_COUNT = 7;
// data per halaman = 33 - header - ttd (halaman terakhir sudah memuat ttd)
export const DATA_PER_PAGE = LINES_PER_PAGE - HEADER_LINE_COUNT - SIG_LINE_COUNT; // 16
// pengisi halaman lanjutan (tanpa blok ttd): sisanya baris kosong
export const PAGE_FILL = LINES_PER_PAGE - (HEADER_LINE_COUNT + DATA_PER_PAGE); // 7

export const totalW = 110;

// kolom tabel: No | Kode | Nama | Satuan | Jumlah | Keterangan
export const colNo = 3, colKode = 12, colNama = 32, colSat = 9, colQty = 10;
export const colKet =
  totalW - (colNo + 1 + colKode + 1 + colNama + 1 + colSat + 1 + colQty);
export const TL_COL1 = 40; // lebar kolom info kiri (Nomor/Tanggal/Keterangan)

export const padRight = (str: string, len: number): string =>
  str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
export const padLeft = (str: string, len: number): string =>
  str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
export const fmtFloat = (v: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

// ── Header halaman (10 baris) ──────────────────────────────────────────
export const formatHeaderLinesSuratJalan = (data: any): string[] => {
  const p = data.perusahaan || { nama: "", alamat: "", kota: "", notelp: "" };

  return [
    padRight(p.nama, 69) + "SURAT JALAN MUTASI ANTAR CABANG",
    padRight(p.alamat + ", " + p.kota, totalW),
    padRight(p.notelp, totalW),
    "",
    padRight("Nomor      : " + data.nomor, TL_COL1) + padRight("Asal      : " + (data.cabangAsal || ""), TL_COL1 + 15),
    padRight("Tanggal    : " + data.tanggal, TL_COL1) + padRight("Tujuan    : " + (data.cabangTujuan || ""), TL_COL1 + 15),
    padRight("Keterangan : " + (data.keterangan || ""), TL_COL1) + padRight("Gudang    : " + (data.gudang || ""), TL_COL1 + 15),
    "-".repeat(totalW),
    padRight("No", colNo) + " " + padRight("Kode", colKode) + " " +
    padRight("Nama", colNama) + " " + padRight("Satuan", colSat) + " " +
    padLeft("Jumlah", colQty) + "  Keterangan",
    "-".repeat(totalW),
  ];
};

// ── Baris data ─────────────────────────────────────────────────────────
export const formatDetailLineSuratJalan = (i: number, d: any): string => {
  return (
    padRight(String(i), colNo) + " " +
    padRight(d.kode || "", colKode) + " " +
    padRight(String(d.nama || ""), colNama) + " " +
    padRight(d.satuan || "", colSat) + " " +
    padLeft(fmtFloat(Number(d.jumlah) || 0), colQty) + "  " +
    (d.keterangan || "")
  );
};

// ── Blok tanda tangan (7 baris: Diserahkan Oleh | Diterima | Mengetahui) ─
export const buildSignatureRowsSuratJalan = (data: any): string[] => {
  const SIG_COL_W = 30;
  return [
    "",
    padRight("Diserahkan Oleh,", SIG_COL_W) +
      padRight("Diterima,", SIG_COL_W) +
      padRight("Mengetahui,", SIG_COL_W),
    data.userNama || data.usr || "",
    "",
    "",
    "",
    padRight("(            )", SIG_COL_W) +
      padRight("(            )", SIG_COL_W) +
      padRight("(            )", SIG_COL_W),
  ];
};

// ── Preview teks (dialog) ──────────────────────────────────────────────
export const generatePreviewSuratJalan = (data: any): string[] => {
  const lines: string[] = [];
  lines.push(...formatHeaderLinesSuratJalan(data));

  const total = (data.detail || []).length;
  let i = 0;
  for (const d of data.detail || []) {
    i++;
    lines.push(formatDetailLineSuratJalan(i, d));
    if (i % DATA_PER_PAGE === 0 && i < total) {
      for (let a = 0; a < PAGE_FILL; a++) lines.push("");
      lines.push(...formatHeaderLinesSuratJalan(data));
    }
  }

  // pengisi agar blok data pas DATA_PER_PAGE sebelum blok ttd
  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) lines.push("");
  }

  lines.push(...buildSignatureRowsSuratJalan(data));
  return lines;
};

// ── Raw command ESC/P untuk dot matrix ─────────────────────────────────
export const generateEscPosSuratJalan = (data: any): string[] => {
  const NL = "\r\n";
  const ESC = "\x1B";
  const SI = "\x0F";
  const commands: string[] = [];

  commands.push(ESC + "@");
  commands.push(SI); // condensed
  commands.push(ESC + "2");
  commands.push(ESC + "C" + String.fromCharCode(LINES_PER_PAGE));
  commands.push(ESC + "d" + "\x00"); // tear off / auto cut off

  for (const line of formatHeaderLinesSuratJalan(data)) {
    commands.push(line + NL);
  }

  const total = (data.detail || []).length;
  let i = 0;
  for (const d of data.detail || []) {
    i++;
    commands.push(formatDetailLineSuratJalan(i, d) + NL);
    if (i % DATA_PER_PAGE === 0 && i < total) {
      for (let a = 0; a < PAGE_FILL; a++) commands.push(NL);
      for (const line of formatHeaderLinesSuratJalan(data)) {
        commands.push(line + NL);
      }
    }
  }

  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) commands.push(NL);
  }

  for (const row of buildSignatureRowsSuratJalan(data)) {
    commands.push(row + NL);
  }

  return commands;
};
