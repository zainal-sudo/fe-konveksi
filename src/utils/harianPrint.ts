// Generator cetak Laporan Harian (Dot Matrix via QZ Tray).
// Paritas: faktur penjualan (`fakturPrint.ts`) — mode condensed 110 kolom,
// rata kanan manual via padding, halaman panjang dipecah per halaman.

export const LINES_PER_PAGE = 48;
const HEADER_LINES = 8; // header perusahaan+info+garis di tiap halaman
export const BODY_PER_PAGE = LINES_PER_PAGE - HEADER_LINES;

const totalW = 110;

const padRight = (str: string, len: number): string =>
  str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
const padLeft = (str: string, len: number): string =>
  str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const metodeStr = (m: string) =>
  m === "CASH" ? "Kas" : m === "TRANSFER" ? "Transfer" : "Lain";

// ── Header per halaman (nama + alamat + telp cabang) ──────────────────
const headerLines = (data: any): string[] => [
  padRight(String(data.perusahaan.nama || "").toUpperCase(), 66) +
    "LAPORAN HARIAN",
  padRight(String(data.perusahaan.alamat || ""), totalW),
  padRight(
    data.perusahaan.notelp ? "Telp : " + data.perusahaan.notelp : "",
    totalW
  ),
  "",
  padRight("Tanggal : " + data.tanggal, 55) + "Cabang : " + (data.namaCabang || "-"),
  "",
  "=".repeat(totalW),
];

// ── Ringkasan Cash vs Transfer ───────────────────────────────────────
const LBL_W = 52, CASH_W = 27, TRF_W = 27;
const summaryLine = (lbl: string, cash: number, trf: number, parentheses = false) => {
  const f = (v: number) => (parentheses && v !== 0 ? `(${fmt(Math.abs(v))})` : fmt(v));
  return padRight(lbl, LBL_W) + padLeft(f(cash), CASH_W) + " " + padLeft(f(trf), TRF_W);
};

const words = (text: string, len: number): string[] => {
  const w: string[] = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const x of w) {
    const candidate = cur ? `${cur} ${x}` : x;
    if (candidate.length > len) {
      if (cur) out.push(cur);
      cur = x;
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
};

const buildSummary = (data: any): string[] => {
  const s = data.summary;
  const rows: string[] = [
    "RINGKASAN SETORAN CASH & TRANSFER",
    "-".repeat(totalW),
    summaryLine("Uang Masuk (Penjualan/Terima Lain/Bayar Customer)", s.masukCash, s.masukTransfer),
    summaryLine("Uang Keluar (Pembayaran Lain-Lain)", s.keluarCash, s.keluarTransfer, true),
    "-".repeat(totalW),
    summaryLine("UANG KAS UNTUK DISETOR", s.setoranKas, s.sisaTransfer),
  ];
  const notes: string[] = [];
  if (s.masukLain) notes.push(`* Non kas/bank masuk lainnya (deposit/UM) : ${fmt(s.masukLain)}`);
  if (s.voucher) notes.push(`* Voucher penjualan : ${fmt(s.voucher)}`);
  if (s.piutang) notes.push(`* Piutang penjualan : ${fmt(s.piutang)}`);
  if (s.keluarLain) notes.push(`* Non kas/bank keluar lainnya : ${fmt(s.keluarLain)}`);
  for (const n of notes) rows.push(...words(n, totalW));
  rows.push("");
  return rows;
};

// ── Section 1: Penjualan ─────────────────────────────────────────────
const colPj = { no: 4, nomor: 15, tgl: 11, cust: 25, cash: 12, card: 12, piutang: 12, total: 13 };

const buildPenjualan = (data: any): string[] => {
  const rows: string[] = [
    "1. PENJUALAN",
    "-".repeat(totalW),
    padRight("No", colPj.no) + " " + padRight("Nomor", colPj.nomor) + " " +
    padRight("Tanggal", colPj.tgl) + " " + padRight("Customer", colPj.cust) + " " +
    padLeft("Cash", colPj.cash) + " " + padLeft("Card", colPj.card) + " " +
    padLeft("Piutang", colPj.piutang) + " " + padLeft("Total", colPj.total),
    "-".repeat(totalW),
  ];
  data.penjualanDetail.forEach((d: any, i: number) => {
    rows.push(
      padRight(String(i + 1), colPj.no) + " " +
      padRight(d.nomor, colPj.nomor) + " " +
      padRight(d.tanggal, colPj.tgl) + " " +
      padRight(d.customer || "-", colPj.cust) + " " +
      padLeft(fmt(d.cash), colPj.cash) + " " +
      padLeft(fmt(d.transfer), colPj.card) + " " +
      padLeft(fmt(d.piutang), colPj.piutang) + " " +
      padLeft(fmt(d.total), colPj.total)
    );
  });
  rows.push("-".repeat(totalW));
  const t = {
    cash: data.penjualanDetail.reduce((s: number, x: any) => s + (Number(x.cash) || 0), 0),
    card: data.penjualanDetail.reduce((s: number, x: any) => s + (Number(x.transfer) || 0), 0),
    piutang: data.penjualanDetail.reduce((s: number, x: any) => s + (Number(x.piutang) || 0), 0),
    total: data.penjualanDetail.reduce((s: number, x: any) => s + (Number(x.total) || 0), 0),
  };
  rows.push(
    padRight("Total", colPj.no + 1 + colPj.nomor + 1 + colPj.tgl + 1 + colPj.cust) +
    padLeft(fmt(t.cash), colPj.cash) + " " + padLeft(fmt(t.card), colPj.card) + " " +
    padLeft(fmt(t.piutang), colPj.piutang) + " " + padLeft(fmt(t.total), colPj.total)
  );
  if (!data.penjualanDetail.length) {
    rows.push("(tidak ada data penjualan)");
  } else {
    rows.push("");
  }
  return rows;
};

// ── Section: Penerimaan Lain (2) / Pembayaran Lain (4) ────────────────
const colLain = { no: 4, nomor: 17, tgl: 11, ket: 35, kasbank: 21, metode: 9, nilai: 12 };

const buildLain = (title: string, list: any[], emptyLabel: string): string[] => {
  const rows: string[] = [
    title,
    "-".repeat(totalW),
    padRight("No", colLain.no) + " " + padRight("Nomor", colLain.nomor) + " " +
    padRight("Tanggal", colLain.tgl) + " " + padRight("Keterangan", colLain.ket) + " " +
    padRight("Kas/Bank", colLain.kasbank) + " " +
    padRight("Metode", colLain.metode) + " " + padLeft("Nilai", colLain.nilai),
    "-".repeat(totalW),
  ];
  list.forEach((d: any, i: number) => {
    rows.push(
      padRight(String(i + 1), colLain.no) + " " +
      padRight(d.nomor, colLain.nomor) + " " +
      padRight(d.tanggal, colLain.tgl) + " " +
      padRight(d.keterangan || "-", colLain.ket) + " " +
      padRight(d.rekNama || d.rekKode || "-", colLain.kasbank) + " " +
      padRight(metodeStr(d.metode), colLain.metode) + " " +
      padLeft(fmt(d.nilai), colLain.nilai)
    );
  });
  rows.push("-".repeat(totalW));
  const t = list.reduce((s: number, x: any) => s + (Number(x.nilai) || 0), 0);
  rows.push(
    padRight("Total", colLain.no + 1 + colLain.nomor + 1 + colLain.tgl + 1 + colLain.ket + 1 + colLain.kasbank + 1 + colLain.metode) +
    padLeft(fmt(t), colLain.nilai)
  );
  if (!list.length) rows.push(emptyLabel);
  else rows.push("");
  return rows;
};

// ── Section 3: Pembayaran Customer ───────────────────────────────────
const colBc = { no: 4, nomor: 17, tgl: 11, cust: 26, kasbank: 23, metode: 9, nilai: 12 };

const buildBayarCustomer = (data: any): string[] => {
  const rows: string[] = [
    "3. PEMBAYARAN CUSTOMER",
    "-".repeat(totalW),
    padRight("No", colBc.no) + " " + padRight("Nomor", colBc.nomor) + " " +
    padRight("Tanggal", colBc.tgl) + " " + padRight("Customer", colBc.cust) + " " +
    padRight("Kas/Bank", colBc.kasbank) + " " +
    padRight("Metode", colBc.metode) + " " + padLeft("Nilai", colBc.nilai),
    "-".repeat(totalW),
  ];
  data.bayarCustomer.forEach((d: any, i: number) => {
    rows.push(
      padRight(String(i + 1), colBc.no) + " " +
      padRight(d.nomor, colBc.nomor) + " " +
      padRight(d.tanggal, colBc.tgl) + " " +
      padRight(d.customer || "-", colBc.cust) + " " +
      padRight(d.rekNama || d.rekKode || "-", colBc.kasbank) + " " +
      padRight(metodeStr(d.metode), colBc.metode) + " " +
      padLeft(fmt(d.nilai), colBc.nilai)
    );
  });
  rows.push("-".repeat(totalW));
  const t = data.bayarCustomer.reduce((s: number, x: any) => s + (Number(x.nilai) || 0), 0);
  rows.push(
    padRight("Total", colBc.no + 1 + colBc.nomor + 1 + colBc.tgl + 1 + colBc.cust + 1 + colBc.kasbank + 1 + colBc.metode) +
    padLeft(fmt(t), colBc.nilai)
  );
  if (!data.bayarCustomer.length) rows.push("(tidak ada pembayaran customer)");
  else rows.push("");
  return rows;
};

// ── Tanda tangan ──────────────────────────────────────────────────────
const buildTtd = (): string[] => {
  const colW = Math.floor(totalW / 2);
  const center = (s: string, w: number) => {
    const l = Math.max(0, Math.floor((w - s.length) / 2));
    return " ".repeat(l) + s;
  };
  return [
    "",
    padRight(center("Dibuat oleh,", colW), colW) + center("Diterima oleh,", colW),
    "",
    "",
    padRight(center("(......................)", colW), colW) +
      center("(......................)", colW),
  ];
};

// ── Susunan isi (di bawah header) ─────────────────────────────────────
const buildBody = (data: any): string[] => [
  ...buildSummary(data),
  ...buildPenjualan(data),
  ...buildLain("2. PENERIMAAN LAIN-LAIN (MASUK)", data.penerimaanLain, "(tidak ada penerimaan lain)"),
  ...buildBayarCustomer(data),
  ...buildLain("4. PEMBAYARAN LAIN-LAIN (KELUAR)", data.pembayaranLain, "(tidak ada pembayaran lain)"),
  ...buildTtd(),
];

// ── Preview (layar, tanpa pagination) ────────────────────────────────
export const generatePreviewHarian = (data: any): string[] => [
  ...headerLines(data),
  "",
  ...buildBody(data),
];

// ── ESC-POS: array per halaman (job print terpisah per halaman) ───────
export const generateEscPosHarian = (data: any): string[][] => {
  const NL = "\r\n";
  const ESC = "\x1B";
  const body = buildBody(data);

  const pages: string[][] = [];
  const pageCount = Math.max(1, Math.ceil(body.length / BODY_PER_PAGE));
  for (let p = 0; p < pageCount; p++) {
    const chunk = body.slice(p * BODY_PER_PAGE, (p + 1) * BODY_PER_PAGE);
    const cmds: string[] = [];
    cmds.push(ESC + "@");
    cmds.push(ESC + "3" + "\x24"); // line spacing 36/180"
    cmds.push(ESC + "\x0F");       // condensed 110 kolom
    cmds.push(ESC + "a" + "\x00");
    for (const l of [...headerLines(data), "", ...chunk]) cmds.push(l + NL);
    cmds.push(NL + NL + NL);
    pages.push(cmds);
  }
  return pages;
};
