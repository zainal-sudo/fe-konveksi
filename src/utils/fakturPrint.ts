// Generator cetak Faktur Penjualan (Dot Matrix via QZ Tray).
// Dipakai bersama oleh penjualanBrowseView (cetak dari browse) dan
// penjualanFormView (Simpan & Cetak dari form) — supaya keluaran kertas
// selalu sama meski sumber datanya berbeda.

// ── Cetak Faktur Penjualan (Dot Matrix / QZ Tray) ───────────────────────
export const LINES_PER_PAGE = 33;
export const DATA_PER_PAGE = 14;
// header 10 baris + data + separator = paket 25 baris, sisanya diisi blank
// agar baris berikutnya tepat mulai halaman baru.
export const PAGE_FILL = LINES_PER_PAGE - (10 + DATA_PER_PAGE + 1);
// Lebar kertas dipersempit (130 → 110 karakter) supaya tidak jmpol.
export const totalW = 110;
export const colNo = 3, colKode = 11, colNama = 30, colSat = 8, colQty = 9, colDisc = 8, colHrg = 12, colTotal = 13;

export const padRight = (str: string, len: number): string => {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
};
export const padLeft = (str: string, len: number): string => {
  return str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
};
export const fmtFloat = (v: number) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(v || 0);

export const formatHeaderLinesFaktur = (data: any): string[] => {
  return [
    padRight(data.perusahaan.nama, 69) + " " + padRight("FAKTUR PENJUALAN", 40),
    padRight(data.perusahaan.alamat + ", " + data.perusahaan.kota, totalW),
    padRight(data.perusahaan.notelp, totalW),
    "",
    padRight("Nomor      : " + data.nomor, 50) + " " + padRight("Customer : " + data.cus_nama, 50),
    padRight("Tanggal    : " + data.tanggal, 50) + " " + padRight(data.cus_alamat, 50),
    padRight("Memo       : " + data.memo, 50) + " " + padRight(data.cus_telp || "", 50),
    "-".repeat(totalW),
    padRight("No", colNo) + " " + padRight("Kode", colKode) + " " + padRight("Nama", colNama) + " " + padRight("Satuan", colSat) + " " + padLeft("Jumlah", colQty) + " " + padLeft("Disc(%)", colDisc) + " " + padLeft("Harga", colHrg) + " " + padLeft("Total", colTotal),
    "-".repeat(totalW),
  ];
};

// ── Blok pembayaran & total (dua kolom: pembayaran | total) ───────────
export interface PrintMoneyLine {
  label: string;
  value: number;
  note?: string;
}

export const MONEY_LABEL_W = 14;
export const MONEY_VALUE_W = 15;
export const MONEY_COL_W = MONEY_LABEL_W + 1 + MONEY_VALUE_W; // 30 karakter
// 4 kolom: pembayaran (kiri) | tanda tangan (tengah) | total (kanan)
// Kolom dilibrary totalW=110 supaya blok summary ikut menyempit.
export const PAY_COL_W = 30;
export const TOT_COL_W = 30;
export const SIG_COL_W = Math.floor((totalW - PAY_COL_W - TOT_COL_W) / 2); // 25 karakter

export const centerText = (text: string, width: number): string => {
  const gap = Math.max(0, Math.floor((width - text.length) / 2));
  return padRight(" ".repeat(gap) + text, width);
};

// Kolom kiri: pembayaran (sampai kembalian)
export const buildPaymentColumn = (data: any): PrintMoneyLine[] => {
  const bayar = Number(data.bayar || 0);
  const voucher = Number(data.voucher || 0);
  const card = Number(data.card || 0);
  const piutang = Number(data.piutang || 0);
  const kembali = Number(data.kembali || 0);
  const dp = Number(data.dp || 0);

  const lines: PrintMoneyLine[] = [
    { label: "Tunai         :", value: bayar },
  ];
  if (voucher !== 0)
    lines.push({ label: "Voucher       :", value: voucher, note: data.noVoucher });
  if (card !== 0)
    lines.push({
      label: "Card          :",
      value: card,
      note: [data.noCard, data.bankCard].filter(Boolean).join(" - "),
    });
  if (piutang !== 0) lines.push({ label: "Piutang       :", value: piutang });
  lines.push({ label: "Kembalian     :", value: kembali });
  if (dp !== 0) lines.push({ label: "Kas di Laci   :", value: dp });
  return lines;
};

// Kolom kanan: diskon, total, ppn, ongkir, grand total
export const buildTotalColumn = (data: any): PrintMoneyLine[] => {
  const total = Number(data.total || 0); // sudah termasuk pajak
  const nilai = Number(data.nilai || total); // net sebelum pajak
  const taxamount = Number(data.taxamount || 0);
  const ongkir = Number(data.ongkir || 0);
  const discFaktur = Number(data.discFaktur || 0);
  const grandTotal = Number(data.grandTotal || total + ongkir);

  const lines: PrintMoneyLine[] = [
    { label: "Disc Faktur   :", value: discFaktur },
    { label: "Total         :", value: nilai },
    { label: "Ppn           :", value: taxamount },
  ];
  if (ongkir !== 0) lines.push({ label: "Ongkir        :", value: ongkir });
  lines.push({ label: "Grand Total   :", value: grandTotal });
  return lines;
};

// Baris ringkasan 4 kolom: pembayaran (kiri) | tanda tangan (tengah) | total (kanan)
export const buildSummaryRows = (data: any): string[] => {
  const payCol = buildPaymentColumn(data);
  const totCol = buildTotalColumn(data);
  const rows: string[] = [];

  // Judul kolom
  rows.push(
    padRight("PEMBAYARAN", PAY_COL_W) +
      padRight("", SIG_COL_W * 2) +
      padRight("TOTAL", TOT_COL_W)
  );

  const moneyPart = (m: PrintMoneyLine | undefined): string => {
    if (!m) return padRight("", MONEY_COL_W);
    return (
      padRight(m.label, MONEY_LABEL_W) +
      " " +
      padLeft(fmtFloat(m.value), MONEY_VALUE_W)
    );
  };

  const maxRows = Math.max(payCol.length, totCol.length);
  for (let i = 0; i < maxRows; i++) {
    // Label tanda tangan sejajar dengan baris "Tunai" (baris uang pertama)
    let mid1 = "";
    let mid2 = "";
    if (i === 0) {
      mid1 = centerText("Penerima", SIG_COL_W);
      mid2 = centerText("Hormat Kami", SIG_COL_W);
    }
    rows.push(
      padRight(moneyPart(payCol[i]), PAY_COL_W) +
        padRight(mid1, SIG_COL_W) +
        padRight(mid2, SIG_COL_W) +
        padRight(moneyPart(totCol[i]), TOT_COL_W)
    );
  }

  // Nomor voucher / kartu (bila ada)
  const notes: string[] = [];
  if (data.noVoucher) notes.push("No. Voucher: " + data.noVoucher);
  if (data.noCard)
    notes.push(
      "No. Card: " +
        data.noCard +
        (data.bankCard ? " (" + data.bankCard + ")" : "")
    );
  if (notes.length) rows.push(notes.join("  |  "));

  // Ruang tanda tangan: (kosong) di bawah "Penerima", ( Kasir ) di bawah "Hormat Kami"
  rows.push(
    padRight("", PAY_COL_W) +
      padRight(centerText("(             )", SIG_COL_W), SIG_COL_W) +
      padRight(centerText("( Kasir )", SIG_COL_W), SIG_COL_W) +
      padRight("", TOT_COL_W)
  );

  // 2 baris kosong di bawah tanda tangan agar page-break pas saat cetak
  // beberapa lembar (total blok summary jadi pas dengan LINES_PER_PAGE).
  rows.push("");
  rows.push("");

  return rows;
};

export const formatDetailLineFaktur = (i: number, d: any): string => {
  const qty = Number(d.qty || d.Qty || 0);
  const harga = Number(d.harga || d.Harga || 0);
  const discpr = Number(d.discPr || d.DiscPr || 0);
  const sub = (100 - discpr) / 100 * harga * qty;
  const kode = d.barcode || d.brgKode || d.kode || "";
  const nama = d.brgNama || d.NamaBarang || d.nama || "";
  const satuan = d.satuan || d.Satuan || "";

  return (
    padRight(String(i), colNo) + " " +
    padRight(kode, colKode) + " " +
    padRight(nama.substring(0, colNama), colNama) + " " +
    padRight(satuan, colSat) + " " +
    padLeft(fmtFloat(qty), colQty) + " " +
    padLeft(fmtFloat(discpr), colDisc) + " " +
    padLeft(fmtFloat(harga), colHrg) + " " +
    padLeft(fmtFloat(sub), colTotal)
  );
};

export const generatePreviewFaktur = (data: any): string[] => {
  const lines: string[] = [];
  lines.push(...formatHeaderLinesFaktur(data));

  let i = 0;
  for (const d of data.detail) {
    i++;
    lines.push(formatDetailLineFaktur(i, d));
    if (i % DATA_PER_PAGE === 0 && i < data.detail.length) {
      lines.push("-".repeat(totalW));
      for (let a = 0; a < PAGE_FILL; a++) lines.push("");
      lines.push(...formatHeaderLinesFaktur(data));
    }
  }

  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) lines.push("");
  }
  lines.push("-".repeat(totalW));
  lines.push(...buildSummaryRows(data));

  return lines;
};

export const generateEscPosFaktur = (data: any): string[] => {
  const NL = "\r\n";
  const ESC = "\x1B";
  const SI = "\x0F";
  const commands: string[] = [];

  commands.push(ESC + "@");
  commands.push(SI);
  commands.push(ESC + "2");
  commands.push(ESC + "C" + String.fromCharCode(LINES_PER_PAGE));
  commands.push(ESC + "d" + "\x00");

  for (const line of formatHeaderLinesFaktur(data)) {
    commands.push(line + NL);
  }

  let i = 0;
  for (const d of data.detail) {
    i++;
    commands.push(formatDetailLineFaktur(i, d) + NL);
    if (i % DATA_PER_PAGE === 0 && i < data.detail.length) {
      commands.push("-".repeat(totalW) + NL);
      for (let a = 0; a < PAGE_FILL; a++) {
        commands.push(NL);
      }
      for (const line of formatHeaderLinesFaktur(data)) {
        commands.push(line + NL);
      }
    }
  }

  if (i % DATA_PER_PAGE !== 0) {
    for (let a = 0; a < DATA_PER_PAGE - (i % DATA_PER_PAGE); a++) commands.push(NL);
  }
  commands.push("-".repeat(totalW) + NL);

  for (const row of buildSummaryRows(data)) {
    commands.push(row + NL);
  }

  return commands;
};
