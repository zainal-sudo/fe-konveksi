import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
  MutasiOutRow,
  MutasiOutDetail,
} from "@/api/transaksi/mutasiOutApi";
import type {
  DaftarHutangRow,
  DaftarHutangDetail,
} from "@/api/laporan/daftarHutangApi";
import { userCellText } from "@/utils/kolomUser";


export const exportCostCenter = async (items: any[], mode: string = "browse") => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "Master Cost Center";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:B2");
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Kode", "Nama Cost Center"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([item.kode, item.nama]);
    setC(row.getCell(1), item.kode, "center");
    setC(row.getCell(2), item.nama, "left");
    row.height = 16;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 40;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Master_CostCenter_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportAccount = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "Master Account / Rekening";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Kode",
    "Nama",
    "No. Rekening Bank",
    "Store",
    "Kelompok",
    "Cabang",
    "Keterangan",
    "Status",
    "Saldo Akhir",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([
      item.kode,
      item.nama,
      item.no_rekening,
      item.store ?? "",
      item.kelompok,
      item.cabang,
      item.keterangan,
      item.status,
      Number(item.saldo_akhir) || 0,
    ]);
    setC(row.getCell(1), item.kode, "left");
    setC(row.getCell(2), item.nama, "left");
    setC(row.getCell(3), item.no_rekening, "left");
    setC(row.getCell(4), item.store ?? "", "left"); // ← store
    setC(row.getCell(5), item.kelompok, "left"); // ← kelompok
    setC(row.getCell(6), item.cabang, "center"); // ← cabang
    setC(row.getCell(7), item.keterangan, "left"); // ← keterangan
    setC(row.getCell(8), item.status, "center"); // ← status
    row.getCell(9).value = Number(item.saldo_akhir) || 0;
    row.getCell(9).border = borderAll;
    row.getCell(9).font = { size: 10 };
    row.getCell(9).numFmt = "#,##0";
    row.getCell(9).alignment = { horizontal: "right" };
    row.height = 16;
  }

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 20; // Store — geser semua yang setelahnya +1
  ws.getColumn(5).width = 20; // Kelompok
  ws.getColumn(6).width = 10; // Cabang
  ws.getColumn(7).width = 25; // Keterangan
  ws.getColumn(8).width = 10; // Status
  ws.getColumn(9).width = 18; // Saldo Akhir

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Master_Account_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportKelompok = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = "Master Kelompok Account";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Keterangan (D/K)"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([item.kode, item.nama, item.keterangan]);
    setC(row.getCell(1), item.kode, "center");
    setC(row.getCell(2), item.nama, "left");
    setC(row.getCell(3), item.keterangan, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Master_Kelompok_${tglStr.replace(/\//g, "-")}.xlsx`);
};

export const exportJenisPembayaran = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  ws.mergeCells("A1:A1");
  ws.getCell("A1").value = "Master Jenis Pembayaran";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.getCell("A2").value = `Tanggal  :${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const hRow = ws.addRow(["Jenis Pembayaran"]);
  const hCell = hRow.getCell(1);
  hCell.value = "Jenis Pembayaran";
  hCell.font = headerFont;
  hCell.fill = headerFill;
  hCell.border = borderAll;
  hCell.alignment = { vertical: "middle", horizontal: "center" };
  hRow.height = 18;

  for (const item of items) {
    const row = ws.addRow([item.nama]);
    row.getCell(1).value = item.nama;
    row.getCell(1).border = borderAll;
    row.getCell(1).font = { size: 10 };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.height = 16;
  }

  ws.getColumn(1).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `Master_Jenis_Pembayaran_${tglStr.replace(/\//g, "-")}.xlsx`,
  );
};

// --- Transaksi Export ---
export const exportUangMuka = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const numFmt = "#,##0";

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = numFmt;
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const colCount = 14;
  const lastCol = String.fromCharCode(64 + colCount); // N

  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell("A1").value = "Daftar Uang Muka / Kasbon";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell("A2").value = `Periode  :${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jenis",
    "Nama Account",
    "PJH",
    "Nota",
    "Penerima",
    "Nominal",
    "Terpakai",
    "Sisa",
    "Keterangan",
    "No Bukti",
    "Selesai",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const item of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), item.Nomor, "left");
    setC(row.getCell(2), item.Tanggal, "center");
    setC(row.getCell(3), item.Jenis, "center");
    setC(row.getCell(4), item.NamaAccount, "left");
    setC(row.getCell(5), item.Pjh, "left");
    setC(row.getCell(6), item.Nota, "left");
    setC(row.getCell(7), item.Penerima, "left");
    setN(row.getCell(8), item.Nominal);
    setN(row.getCell(9), item.Terpakai);
    setN(row.getCell(10), item.Sisa);
    setC(row.getCell(11), item.Keterangan, "left");
    setC(row.getCell(12), item.NoBukti, "left");
    setC(row.getCell(13), item.Selesai, "center");
    setC(row.getCell(14), item.Closed, "center");

    // Highlight baris Selesai=Belum seperti di Delphi
    if (item.Selesai === "Belum") {
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCE4EC" },
        };
      }
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 25;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 16;
  ws.getColumn(10).width = 16;
  ws.getColumn(11).width = 25;
  ws.getColumn(12).width = 14;
  ws.getColumn(13).width = 10;
  ws.getColumn(14).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Uang_Muka_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkk = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKK");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Kas Keluar (BKK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Penerima",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Kasbon);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKK_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkkDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKK Detail");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Kas Keluar (BKK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";

  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKK_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbk = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBK");
  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Bank Keluar (BBK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Penerima",
    "Nota",
    "Keterangan",
    "Nominal",
    "Link",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Link);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Link) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBK_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbkDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBK Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Bank Keluar (BBK)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = ""; // ← track nomor sebelumnya

  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor; // ← cek duplikat

    // Kolom Nomor: kosongkan jika sama dengan baris sebelumnya
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;

    lastNomor = r.Nomor; // ← update tracker
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBK_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkm = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKM");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Bukti Kas Masuk (BKM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.DiterimaDari);
    setC(row.getCell(6), r.Nota);
    setC(row.getCell(7), r.Keterangan);
    setN(row.getCell(8), r.Nominal);
    setC(row.getCell(9), r.Kasbon);
    setC(row.getCell(10), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKM_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBkmDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BKM Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Kas Masuk (BKM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BKM_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbm = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBM");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "Bukti Bank Masuk (BBM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Tipe",
    "Account",
    "Rekening",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Kasbon",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Tipe, "center");
    setC(row.getCell(4), r.Account);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.DiterimaDari);
    setC(row.getCell(7), r.Nota);
    setC(row.getCell(8), r.Keterangan);
    setN(row.getCell(9), r.Nominal);
    setC(row.getCell(10), r.Kasbon);
    setC(row.getCell(11), r.Closed, "center");
    if (r.Kasbon) {
      for (let c = 1; c <= 11; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FF1565C0" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 26;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 25;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBM_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBbmDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BBM Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Bukti Bank Masuk (BBM)";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `BBM_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportJurnalUmum = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jurnal Umum");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Jurnal Umum";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Tanggal",
    "Debet",
    "Kredit",
    "Keterangan",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Tanggal, "center");
    setN(row.getCell(4), r.Debet);
    setN(row.getCell(5), r.Kredit);
    setC(row.getCell(6), r.Keterangan);
    setC(row.getCell(7), r.Closed, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `JurnalUmum_${startDate}_sd_${endDate}.xlsx`);
};

export const exportJurnalUmumDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jurnal Umum Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Jurnal Umum";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Account",
    "Nama Account",
    "Detail CC",
    "Debet",
    "Kredit",
    "Uraian",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.NamaAccount);
    setC(row.getCell(4), r.DetailCC);
    setN(row.getCell(5), r.Debet);
    setN(row.getCell(6), r.Kredit);
    setC(row.getCell(7), r.Uraian);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `JurnalUmum_Detail_${startDate}_sd_${endDate}.xlsx`);
};

export const exportRekonsiliasiBank = async (items: any[], tanggal: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekonsiliasi Bank");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = "Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Per Tanggal : ${tanggal}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Saldo Buku", "Saldo Bank", "Status Rekon"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Kode);
    setC(row.getCell(2), r.Nama);
    setN(row.getCell(3), r.SaldoAkhir);
    setN(row.getCell(4), r.SaldoBank);
    setC(row.getCell(5), r.Rekon, "center");
    // Delphi: baris Rekon=Sudah warna biru
    if (r.Rekon === "Sudah") {
      for (let c = 1; c <= 5; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FF1565C0" } };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `RekonsiliasiBank_${tanggal}.xlsx`);
};

export const exportPengajuanTransfer = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pengajuan Transfer");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "Pengajuan Transfer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Account",
    "No. Rek Asal",
    "Nama Rekening",
    "Status",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NoRekAsal);
    setC(row.getCell(5), r.NamaRekening);
    setC(row.getCell(6), r.Status_, "center");
    // Delphi: BELUM=merah, PROSES=biru, CLOSE=hitam
    const color =
      r.Status_ === "BELUM"
        ? "FFCC0000"
        : r.Status_ === "PROSES"
          ? "FF1565C0"
          : "FF212121";
    for (let c = 1; c <= 6; c++)
      row.getCell(c).font = { size: 10, color: { argb: color } };
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 30;
  ws.getColumn(6).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PengajuanTransfer_${startDate}_sd_${endDate}.xlsx`);
};

export const exportPengajuanTransferDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PJT Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Detail Pengajuan Transfer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Nama Supplier",
    "Bank",
    "Atas Nama",
    "Rekening",
    "Nominal",
    "Keterangan",
    "Tgl Realisasi",
    "Jurnal",
    "Ket Batal",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.NamaSupplier);
    setC(row.getCell(3), r.Bank);
    setC(row.getCell(4), r.AtasNama);
    setC(row.getCell(5), r.Rekening);
    setN(row.getCell(6), r.Nominal);
    setC(row.getCell(7), r.Keterangan);
    setC(row.getCell(8), r.TglRealisasi || "", "center");
    setC(row.getCell(9), r.Jurnal || "");
    setC(row.getCell(10), r.KetBatal || "");
    // Delphi detail: KetBatal != "" → merah, TglRealisasi != "" → biru
    if (r.KetBatal) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FFCC0000" } };
    } else if (r.TglRealisasi) {
      for (let c = 1; c <= 10; c++)
        row.getCell(c).font = { size: 10, color: { argb: "FF1565C0" } };
    }
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 25;
  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PengajuanTransfer_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

// Export Excel per nomor — Delphi btnExcel (format khusus per transaksi)
export const exportPengajuanTransferExcel = async (
  nomor: string,
  tanggal: string,
  account: string,
  noRekAsal: string,
  namaRekening: string,
  detail: any[],
  userKode: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pengajuan Transfer");

  ws.getCell("A2").value = "Pengajuan Transfer";
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.getCell("A3").value = `Tanggal: ${tanggal}`;
  ws.getCell("A3").font = { bold: true };
  ws.getCell("A4").value = `Nomor: ${nomor}`;
  ws.getCell("A4").font = { bold: true };
  ws.getCell("A5").value =
    `Rekening Asal: (${account}) ${namaRekening} - ${noRekAsal}`;
  ws.getCell("A5").font = { bold: true };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" },
  };
  const colHeaders = [
    "NO",
    "Nama Supplier",
    "Nama Bank",
    "Atas Nama",
    "NO. Rekening",
    "Nominal",
    "Keterangan",
    "Tgl Realisasi",
  ];
  const hRow = ws.getRow(6);
  colHeaders.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  hRow.height = 18;

  detail.forEach((d, idx) => {
    const row = ws.getRow(7 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = d.NamaSupplier || "";
    row.getCell(3).value = d.Bank || "";
    row.getCell(4).value = d.AtasNama || "";
    row.getCell(5).value = d.Rekening || "";
    row.getCell(6).value = Number(d.Nominal) || 0;
    row.getCell(6).numFmt = "#,##0";
    row.getCell(7).value = d.Keterangan || "";
    row.getCell(8).value = d.TglRealisasi || "";
    for (let c = 1; c <= 8; c++)
      row.getCell(c).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    row.height = 16;
  });

  const totalRow = 7 + detail.length;
  ws.getRow(totalRow).getCell(1).value = "Total";
  ws.getRow(totalRow).getCell(1).font = { bold: true };
  const totalNominal = detail.reduce((s, d) => s + (Number(d.Nominal) || 0), 0);
  ws.getRow(totalRow).getCell(6).value = totalNominal;
  ws.getRow(totalRow).getCell(6).numFmt = "#,##0";
  ws.getRow(totalRow).getCell(6).font = { bold: true };

  const signRow = totalRow + 3;
  ws.getRow(signRow).getCell(2).value = "Dibuat Oleh,";
  ws.getRow(signRow + 4).getCell(2).value = `(${userKode})`;

  [2, 3, 4, 5, 6, 7, 8].forEach((c) => (ws.getColumn(c).width = 20));
  ws.getColumn(1).width = 4;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PJT_${nomor}.xlsx`);
};

export const exportTerimaSetoran = async (
  items: any[],
  startDate: string,
  endDate: string,
  cabang: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Terima Setoran");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = `Terima Setoran Kasir — ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Nomor", "Tgl Setor", "Tgl Verifikasi", "Created", "Verified"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.TglSetor, "center");
    setC(row.getCell(3), r.TglVerifikasi || "", "center");
    setC(row.getCell(4), r.Created, "center");
    setC(row.getCell(5), r.Verified, "center");
    // Delphi: Verified kosong → highlight merah
    if (!r.Verified) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEBEE" },
        };
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FFCC0000" },
          bold: true,
        };
      }
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 13;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `TerimaSetoran_${startDate}_sd_${endDate}.xlsx`);
};

export const exportTerimaSetoranDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
  cabang: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Terima Setoran Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = `Detail Terima Setoran Kasir — ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = ["Nomor", "Jenis", "Nominal Setor", "Nominal Verifikasi"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.Jenis);
    setN(row.getCell(3), r.NominalSetor);
    setN(row.getCell(4), r.NominalVerifikasi);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `TerimaSetoran_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustomer = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pembayaran Customer");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Posting Pembayaran Customer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Account",
    "Nama Account",
    "Rekening",
    "Tanggal",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Cabang",
    "Closed",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NamaAccount);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.Tanggal, "center");
    setC(row.getCell(7), r.DiterimaDari);
    setC(row.getCell(8), r.Nota);
    setC(row.getCell(9), r.Keterangan);
    setN(row.getCell(10), r.Nominal);
    setC(row.getCell(11), r.Cabang, "center");
    setC(row.getCell(12), r.Closed, "center");
    if (r.Closed === "Belum") {
      for (let c = 1; c <= 12; c++)
        row.getCell(c).font = {
          size: 10,
          color: { argb: "FFCC0000" },
          bold: true,
        };
    }
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 30;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 10;
  ws.getColumn(12).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `PembayaranCustomer_${startDate}_sd_${endDate}.xlsx`);
};

export const exportPembayaranCustomerDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PBC Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Posting Pembayaran Customer";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustomer_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustKaosan = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pembayaran Cust Kaosan");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "Posting Pembayaran Customer Kaosan";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tipe",
    "Account",
    "Nama Account",
    "Rekening",
    "Tanggal",
    "Tgl Transfer",
    "Diterima Dari",
    "Nota",
    "Keterangan",
    "Nominal",
    "Cabang",
    "Customer",
    "Trs",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tipe, "center");
    setC(row.getCell(3), r.Account);
    setC(row.getCell(4), r.NamaAccount);
    setC(row.getCell(5), r.Rekening);
    setC(row.getCell(6), r.Tanggal, "center");
    setC(row.getCell(7), r.TglTransfer || "", "center");
    setC(row.getCell(8), r.DiterimaDari);
    setC(row.getCell(9), r.Nota);
    setC(row.getCell(10), r.Keterangan);
    setN(row.getCell(11), r.Nominal);
    setC(row.getCell(12), r.Cabang, "center");
    setC(row.getCell(13), r.Customer);
    setC(row.getCell(14), r.Trs, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 13;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 30;
  ws.getColumn(11).width = 18;
  ws.getColumn(12).width = 8;
  ws.getColumn(13).width = 22;
  ws.getColumn(14).width = 10;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustKaosan_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportPembayaranCustKaosanDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PBK Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Posting Pembayaran Customer Kaosan";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "No",
    "Uraian",
    "Nominal",
    "Account",
    "Nama Account",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let lastNomor = "";
  for (const r of items) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;
    setC(row.getCell(1), isRepeat ? "" : r.Nomor);
    setC(row.getCell(2), r.No, "center");
    setC(row.getCell(3), r.Uraian);
    setN(row.getCell(4), r.Nominal);
    setC(row.getCell(5), r.Account);
    setC(row.getCell(6), r.NamaAccount);
    setC(row.getCell(7), r.DetailCC);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `PembayaranCustKaosan_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportListJurnal = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("List Jurnal");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "List Jurnal";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Bulan",
    "Tahun",
    "Tanggal",
    "Nomor",
    "Referensi",
    "Account",
    "Nama Account",
    "Keterangan",
    "Debet",
    "Kredit",
    "Detail CC",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalDebet = 0;
  let totalKredit = 0;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Bulan, "center");
    setC(row.getCell(2), r.Tahun, "center");
    setC(row.getCell(3), r.Tanggal, "center");
    setC(row.getCell(4), r.Nomor);
    setC(row.getCell(5), r.Referensi);
    setC(row.getCell(6), r.Account);
    setC(row.getCell(7), r.AccountName);
    setC(row.getCell(8), r.Keterangan);
    setN(row.getCell(9), r.Debet);
    setN(row.getCell(10), r.Kredit);
    setC(row.getCell(11), r.DetailCC);
    totalDebet += Number(r.Debet) || 0;
    totalKredit += Number(r.Kredit) || 0;
    row.height = 16;
  }

  // Footer total
  const footRow = ws.addRow([]);
  const footCells = Array.from({ length: 11 }, (_, i) =>
    footRow.getCell(i + 1),
  );
  footCells.forEach((c) => {
    c.border = borderAll;
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
  });
  footRow.getCell(8).value = "TOTAL";
  footRow.getCell(8).font = { bold: true, size: 10 };
  footRow.getCell(8).alignment = { horizontal: "right" };
  footRow.getCell(9).value = totalDebet;
  footRow.getCell(9).numFmt = "#,##0";
  footRow.getCell(9).font = { bold: true, size: 10 };
  footRow.getCell(9).alignment = { horizontal: "right" };
  footRow.getCell(10).value = totalKredit;
  footRow.getCell(10).numFmt = "#,##0";
  footRow.getCell(10).font = { bold: true, size: 10 };
  footRow.getCell(10).alignment = { horizontal: "right" };

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 28;
  ws.getColumn(8).width = 32;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 18;
  ws.getColumn(11).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `ListJurnal_${startDate}_sd_${endDate}.xlsx`);
};

export const exportListJurnalFromConfig = async (
  data: Record<string, any>[],
  rowFields: string[],
  colFields: string[],
  valField: string,
  aggregator: string,
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pivot");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  // ── Kumpulkan nilai unik per colField (hierarkis) ──────────────────
  // Buat composite key kolom: join nilai semua colFields
  const colKeySet = new Set<string>();
  const colKeyMap = new Map<string, Record<string, string>>(); // key → {field: value}
  for (const row of data) {
    const key = colFields.map((f) => String(row[f] ?? "")).join("|||");
    if (!colKeySet.has(key)) {
      colKeySet.add(key);
      const obj: Record<string, string> = {};
      colFields.forEach((f) => {
        obj[f] = String(row[f] ?? "");
      });
      colKeyMap.set(key, obj);
    }
  }
  const colKeys = [...colKeySet].sort();

  // ── Kumpulkan nilai unik per rowField (hierarkis) ─────────────────
  const rowKeySet = new Set<string>();
  const rowKeyMap = new Map<string, Record<string, string>>();
  for (const row of data) {
    const key = rowFields.map((f) => String(row[f] ?? "")).join("|||");
    if (!rowKeySet.has(key)) {
      rowKeySet.add(key);
      const obj: Record<string, string> = {};
      rowFields.forEach((f) => {
        obj[f] = String(row[f] ?? "");
      });
      rowKeyMap.set(key, obj);
    }
  }
  const rowKeys = [...rowKeySet].sort();

  // ── Agregasi ──────────────────────────────────────────────────────
  // map: rowKey → colKey → {sum, count}
  type AggVal = { sum: number; count: number };
  const aggMap = new Map<string, Map<string, AggVal>>();
  for (const d of data) {
    const rk = rowFields.map((f) => String(d[f] ?? "")).join("|||");
    const ck = colFields.map((f) => String(d[f] ?? "")).join("|||");
    if (!aggMap.has(rk)) aggMap.set(rk, new Map());
    const inner = aggMap.get(rk)!;
    const cur = inner.get(ck) || { sum: 0, count: 0 };
    cur.sum += Number(d[valField]) || 0;
    cur.count += 1;
    inner.set(ck, cur);
  }

  const getVal = (agg: AggVal | undefined): number => {
    if (!agg) return 0;
    if (aggregator === "Count") return agg.count;
    if (aggregator === "Average") return agg.count ? agg.sum / agg.count : 0;
    return agg.sum; // Sum (default)
  };

  // ── Tulis header info ──────────────────────────────────────────────
  const totalCols = rowFields.length + colKeys.length + 1;
  const endColLetter = String.fromCharCode(64 + Math.min(totalCols, 26));
  ws.mergeCells(`A1:${endColLetter}1`);
  ws.getCell("A1").value = `List Jurnal — Pivot (${aggregator} of ${valField})`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells(`A2:${endColLetter}2`);
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  // ── Tulis header kolom (satu baris per colField level) ────────────
  const headerStartRow = 4;

  // Untuk setiap level colField, tulis header dengan merge jika nilai berurutan sama
  colFields.forEach((field, levelIdx) => {
    const row = ws.getRow(headerStartRow + levelIdx);

    // Cells untuk rowFields (kiri atas, merge vertikal nanti)
    rowFields.forEach((rf, ri) => {
      if (levelIdx === 0) {
        // Tulis label rowField hanya di level pertama
        const cell = row.getCell(ri + 1);
        cell.value = rf;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderAll;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        const cell = row.getCell(ri + 1);
        cell.fill = headerFill;
        cell.border = borderAll;
      }
    });

    // Tulis nilai colField per kolom data
    let mergeStart = rowFields.length + 1;
    let prevVal = "";
    colKeys.forEach((ck, ci) => {
      const val = colKeyMap.get(ck)?.[field] ?? "";
      const colIdx = rowFields.length + ci + 1;
      const cell = row.getCell(colIdx);
      cell.value = val;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.border = borderAll;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      prevVal = val;
    });

    // Total header
    const totalCell = row.getCell(rowFields.length + colKeys.length + 1);
    if (levelIdx === 0) {
      totalCell.value = "Totals";
      totalCell.font = headerFont;
      totalCell.fill = headerFill;
      totalCell.border = borderAll;
      totalCell.alignment = { vertical: "middle", horizontal: "center" };
    } else {
      totalCell.fill = headerFill;
      totalCell.border = borderAll;
    }

    row.height = 18;
  });

  // ── Tulis data ──────────────────────────────────────────────────────
  let dataRowNum = headerStartRow + colFields.length;
  const colTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const rk of rowKeys) {
    const row = ws.getRow(dataRowNum);
    const rowVals = rowKeyMap.get(rk)!;

    // Tulis nilai rowFields
    rowFields.forEach((rf, ri) => {
      const cell = row.getCell(ri + 1);
      cell.value = rowVals[rf] ?? "";
      cell.border = borderAll;
      cell.font = { size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Tulis nilai data per kolom
    let rowTotal = 0;
    colKeys.forEach((ck, ci) => {
      const agg = aggMap.get(rk)?.get(ck);
      const val = getVal(agg);
      const cell = row.getCell(rowFields.length + ci + 1);
      cell.value = val || 0;
      cell.border = borderAll;
      cell.font = { size: 10 };
      cell.numFmt = "#,##0";
      cell.alignment = { vertical: "middle", horizontal: "right" };
      rowTotal += val;
      colTotals.set(ck, (colTotals.get(ck) ?? 0) + val);
    });

    // Row total
    const totalCell = row.getCell(rowFields.length + colKeys.length + 1);
    totalCell.value = rowTotal;
    totalCell.border = borderAll;
    totalCell.font = { size: 10, bold: true };
    totalCell.numFmt = "#,##0";
    totalCell.alignment = { vertical: "middle", horizontal: "right" };
    grandTotal += rowTotal;

    row.height = 16;
    dataRowNum++;
  }

  // ── Totals row ──────────────────────────────────────────────────────
  const footRow = ws.getRow(dataRowNum);
  rowFields.forEach((_, ri) => {
    const cell = footRow.getCell(ri + 1);
    cell.value = ri === 0 ? "Totals" : "";
    cell.border = borderAll;
    cell.font = { bold: true, size: 10 };
    cell.fill = totalFill;
    cell.alignment = { horizontal: ri === 0 ? "left" : "center" };
  });

  colKeys.forEach((ck, ci) => {
    const cell = footRow.getCell(rowFields.length + ci + 1);
    cell.value = colTotals.get(ck) ?? 0;
    cell.border = borderAll;
    cell.font = { bold: true, size: 10 };
    cell.fill = totalFill;
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  });

  const gtCell = footRow.getCell(rowFields.length + colKeys.length + 1);
  gtCell.value = grandTotal;
  gtCell.border = borderAll;
  gtCell.font = { bold: true, size: 10 };
  gtCell.fill = totalFill;
  gtCell.numFmt = "#,##0";
  gtCell.alignment = { vertical: "middle", horizontal: "right" };
  footRow.height = 18;

  // ── Column widths ──────────────────────────────────────────────────
  rowFields.forEach((_, i) => {
    ws.getColumn(i + 1).width = 28;
  });
  colKeys.forEach((_, i) => {
    ws.getColumn(rowFields.length + i + 1).width = 14;
  });
  ws.getColumn(rowFields.length + colKeys.length + 1).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `ListJurnal_Pivot_${startDate}_sd_${endDate}.xlsx`);
};

export const exportBukuBesar = async (
  items: any[],
  rekkode: string,
  reknama: string,
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Buku Besar");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const saldoAwalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF9C4" },
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  // ── Header info ──
  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Buku Besar";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.mergeCells("A3:L3");
  ws.getCell("A3").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A3").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Tanggal",
    "Nomor",
    "Trs",
    "Nota",
    "Penerima",
    "Keterangan",
    "Debet",
    "Kredit",
    "Saldo",
    "Account",
    "Nama Account",
    "Tgl Transfer",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalDebet = 0;
  let totalKredit = 0;

  for (const r of items) {
    const row = ws.addRow([]);
    const isSaldoAwal = r.Keterangan === "Saldo Awal";

    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Nomor);
    setC(row.getCell(3), r.Trs, "center");
    setC(row.getCell(4), r.Nota);
    setC(row.getCell(5), r.Penerima);
    setC(row.getCell(6), r.Keterangan, "left", isSaldoAwal);
    setN(row.getCell(7), r.Debet);
    setN(row.getCell(8), r.Kredit);
    setN(row.getCell(9), r.Saldo, true);
    setC(row.getCell(10), r.Account);
    setC(row.getCell(11), r.NamaAccount);
    setC(row.getCell(12), r.TglTransfer || "", "center");

    if (isSaldoAwal) {
      for (let c = 1; c <= 12; c++) {
        row.getCell(c).fill = saldoAwalFill;
      }
    }

    if (!isSaldoAwal) {
      totalDebet += Number(r.Debet) || 0;
      totalKredit += Number(r.Kredit) || 0;
    }
    row.height = 16;
  }

  // Footer total
  const footRow = ws.addRow([]);
  for (let c = 1; c <= 12; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), totalDebet, true);
  setN(footRow.getCell(8), totalKredit, true);
  const lastSaldo = items.length > 0 ? items[items.length - 1].Saldo : 0;
  setN(footRow.getCell(9), lastSaldo, true);
  footRow.height = 18;

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 35;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 30;
  ws.getColumn(12).width = 13;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `BukuBesar_${rekkode}_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportKasbonBelumSelesai = async (
  items: any[],
  rekkode: string,
  reknama: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kasbon Belum Selesai");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Kasbon Belum Selesai";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jenis",
    "Pjh",
    "Nota",
    "Penerima",
    "Nominal",
    "Keterangan",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalNominal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.Jenis, "center");
    setC(row.getCell(4), r.Pjh);
    setC(row.getCell(5), r.Nota);
    setC(row.getCell(6), r.Penerima);
    setN(row.getCell(7), r.Nominal);
    setC(row.getCell(8), r.Keterangan);
    totalNominal += Number(r.Nominal) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), totalNominal, true);
  footRow.height = 18;

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 35;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `KasbonBelumSelesai_${rekkode}.xlsx`);
};

export const exportKasbonBelumSelesaiDetail = async (
  items: any[],
  rekkode: string,
  reknama: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Kasbon");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Detail Kasbon Belum Selesai";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Account : (${rekkode}) ${reknama}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Uraian",
    "Satuan",
    "Qty",
    "Nominal",
    "Total",
    "Kegunaan",
    "Keterangan",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totalNominal = 0;
  let totalTotal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Uraian);
    setC(row.getCell(3), r.Satuan, "center");
    setN(row.getCell(4), r.Qty);
    setN(row.getCell(5), r.Nominal);
    setN(row.getCell(6), r.Total);
    setC(row.getCell(7), r.Kegunaan);
    setC(row.getCell(8), r.Keterangan);
    totalNominal += Number(r.Nominal) || 0;
    totalTotal += Number(r.Total) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(4), "TOTAL", "right", true);
  setN(footRow.getCell(5), totalNominal, true);
  setN(footRow.getCell(6), totalTotal, true);
  footRow.height = 18;

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `KasbonBelumSelesai_Detail_${rekkode}.xlsx`);
};

export const exportRekonsiliasiBankMaster = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekonsiliasi Bank");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const selisihNolFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0FDF4" },
  };
  const selisihAdaFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3E0" },
  };

  const setH = (cell: ExcelJS.Cell, val: string, fill = headerFill) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = fill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (
    cell: ExcelJS.Cell,
    val: number,
    bold = false,
    color?: string,
  ) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold, color: color ? { argb: color } : undefined };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  // ── Info header ──
  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Laporan Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  // ── Header row 1 (group) ──
  const row4 = ws.getRow(4);
  setH(row4.getCell(1), "Tanggal");
  setH(row4.getCell(2), "Account");
  setH(row4.getCell(3), "Nama");
  ws.mergeCells(4, 4, 4, 7);
  setH(row4.getCell(4), "BUKU");
  ws.mergeCells(4, 8, 4, 11);
  setH(row4.getCell(8), "BANK", subHeaderFill);
  setH(row4.getCell(12), "Selisih");
  row4.height = 20;

  // ── Header row 2 (sub) ──
  const row5 = ws.getRow(5);
  setH(row5.getCell(1), "");
  setH(row5.getCell(2), "");
  setH(row5.getCell(3), "");
  setH(row5.getCell(4), "Saldo Buku");
  setH(row5.getCell(5), "Tambah");
  setH(row5.getCell(6), "Kurang");
  setH(row5.getCell(7), "Saldo Akhir");
  setH(row5.getCell(8), "Saldo Bank", subHeaderFill);
  setH(row5.getCell(9), "Tambah_", subHeaderFill);
  setH(row5.getCell(10), "Kurang_", subHeaderFill);
  setH(row5.getCell(11), "Saldo Akhir", subHeaderFill);
  setH(row5.getCell(12), "");
  row5.height = 18;

  // ── Data rows ──
  let totSaldoBuku = 0,
    totTambah = 0,
    totKurang = 0,
    totBuku = 0;
  let totSaldoBank = 0,
    totTambah_ = 0,
    totKurang_ = 0,
    totBank = 0;
  let totSelisih = 0;

  let dataRowNum = 6;
  for (const r of items) {
    const row = ws.getRow(dataRowNum);
    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.Nama);
    setN(row.getCell(4), r.SaldoBuku);
    setN(row.getCell(5), r.Tambah);
    setN(row.getCell(6), r.Kurang);
    setN(row.getCell(7), r.Buku, true);
    setN(row.getCell(8), r.SaldoBank);
    setN(row.getCell(9), r.Tambah_);
    setN(row.getCell(10), r.Kurang_);
    setN(row.getCell(11), r.Bank, true);
    setN(
      row.getCell(12),
      r.Selisih,
      true,
      Number(r.Selisih) !== 0 ? "FFCC3300" : undefined,
    );

    // Warna baris berdasarkan selisih
    const rowFill = Number(r.Selisih) === 0 ? selisihNolFill : selisihAdaFill;
    for (let c = 1; c <= 12; c++) {
      if (
        !row.getCell(c).fill ||
        (row.getCell(c).fill as any).fgColor?.argb === "FFFFFFFF"
      ) {
        row.getCell(c).fill = rowFill;
      }
    }

    totSaldoBuku += Number(r.SaldoBuku);
    totTambah += Number(r.Tambah);
    totKurang += Number(r.Kurang);
    totBuku += Number(r.Buku);
    totSaldoBank += Number(r.SaldoBank);
    totTambah_ += Number(r.Tambah_);
    totKurang_ += Number(r.Kurang_);
    totBank += Number(r.Bank);
    totSelisih += Number(r.Selisih);
    row.height = 16;
    dataRowNum++;
  }

  // ── Footer total ──
  const footRow = ws.getRow(dataRowNum);
  for (let c = 1; c <= 12; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(3), "TOTAL", "right", true);
  setN(footRow.getCell(4), totSaldoBuku, true);
  setN(footRow.getCell(5), totTambah, true);
  setN(footRow.getCell(6), totKurang, true);
  setN(footRow.getCell(7), totBuku, true);
  setN(footRow.getCell(8), totSaldoBank, true);
  setN(footRow.getCell(9), totTambah_, true);
  setN(footRow.getCell(10), totKurang_, true);
  setN(footRow.getCell(11), totBank, true);
  setN(
    footRow.getCell(12),
    totSelisih,
    true,
    totSelisih !== 0 ? "FFCC3300" : undefined,
  );
  footRow.height = 18;

  // ── Column widths ──
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 14;
  ws.getColumn(10).width = 14;
  ws.getColumn(11).width = 16;
  ws.getColumn(12).width = 14;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `RekonsiliasiBankMaster_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportRekonsiliasiBankDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Rekonsiliasi");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Detail Rekonsiliasi Bank";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Tanggal",
    "Account",
    "Nama",
    "Jenis",
    "Nomor",
    "Keterangan",
    "Nominal",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let total = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Tanggal, "center");
    setC(row.getCell(2), r.Account);
    setC(row.getCell(3), r.Nama);
    setC(row.getCell(4), r.Jenis, "center");
    setC(row.getCell(5), r.Nomor);
    setC(row.getCell(6), r.Keterangan);
    setN(row.getCell(7), r.Nominal);
    total += Number(r.Nominal) || 0;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(6), "TOTAL", "right", true);
  setN(footRow.getCell(7), total, true);
  footRow.height = 18;

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `RekonsiliasiBankDetail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportStokFinance = async (items: any[], cabang: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stok Finance");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const realNegFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3E0" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (
    cell: ExcelJS.Cell,
    val: number,
    bold = false,
    color?: string,
  ) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold, color: color ? { argb: color } : undefined };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `Stok Finance — Cabang ${cabang}`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.addRow([]);

  const cols = ["Jenis", "Kode", "Nama", "Satuan", "Stok", "Mutasi", "REAL"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totStok = 0,
    totMutasi = 0,
    totReal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Jenis, "center");
    setC(row.getCell(2), r.Kode);
    setC(row.getCell(3), r.Nama);
    setC(row.getCell(4), r.Satuan, "center");
    setN(row.getCell(5), r.Stok);
    setN(row.getCell(6), r.Mutasi);
    setN(
      row.getCell(7),
      r.REAL_,
      true,
      Number(r.REAL_) < 0 ? "FFCC3300" : undefined,
    );
    if (Number(r.REAL_) < 0) {
      for (let c = 1; c <= 7; c++) row.getCell(c).fill = realNegFill;
    }
    totStok += Number(r.Stok);
    totMutasi += Number(r.Mutasi);
    totReal += Number(r.REAL_);
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(3), "TOTAL", "right", true);
  setN(footRow.getCell(5), totStok, true);
  setN(footRow.getCell(6), totMutasi, true);
  setN(footRow.getCell(7), totReal, true, totReal < 0 ? "FFCC3300" : undefined);
  footRow.height = 18;

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `StokFinance_${cabang}.xlsx`);
};

export const exportMasterUser = async (items: any[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Master User");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = "Master User";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Jumlah Hak Menu"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Kode);
    setC(row.getCell(2), r.Nama);
    setC(row.getCell(3), r.Akses, "center");
    row.height = 16;
  }

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "Master_User.xlsx");
};

export const exportVoucherPembayaran = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Voucher Pembayaran");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  // Total kolom sekarang 18 (A–R)
  ws.mergeCells("A1:R1");
  ws.getCell("A1").value = "Voucher Pembayaran";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:R2");
  ws.getCell("A2").value = `Periode: ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor", // 1
    "Tanggal", // 2
    "Kode Supplier", // 3
    "Supplier", // 4
    "No Pajak", // 5
    "Total", // 6
    "Bahan Tambahan", // 7
    "Net", // 8
    "Disc", // 9
    "Status", // 10
    "No Realisasi", // 11
    "Tgl Realisasi", // 12
    "Account", // 13
    "Nama Account", // 14
    "Cost Center", // 15
    "DC", // 16
    "User", // 17
    "Created", // 18
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totTotal = 0,
    totBahan = 0,
    totNet = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.KodeSupplier);
    setC(row.getCell(4), r.Supplier);
    setC(row.getCell(5), r.NomorPajak);
    setN(row.getCell(6), r.Total);
    setN(row.getCell(7), r.BahanTambahan);
    setN(row.getCell(8), r.Net);
    setN(row.getCell(9), r.Disc);
    setC(row.getCell(10), r.Status, "center");
    setC(row.getCell(11), r.NomorRealisasi);
    setC(row.getCell(12), r.TanggalRealisasi ?? "", "center");
    setC(row.getCell(13), r.AccountBayar);
    setC(row.getCell(14), r.NamaAccount);
    setC(row.getCell(15), r.CcNama);
    setC(row.getCell(16), r.DcNama);
    setC(row.getCell(17), r.Usr, "center");
    setC(row.getCell(18), r.Created);
    totTotal += Number(r.Total);
    totBahan += Number(r.BahanTambahan);
    totNet += Number(r.Net);
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 18; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(4), "TOTAL", "right", true);
  setN(footRow.getCell(6), totTotal, true);
  setN(footRow.getCell(7), totBahan, true);
  setN(footRow.getCell(8), totNet, true);
  footRow.height = 18;

  ws.getColumn(1).width = 18; // Nomor
  ws.getColumn(2).width = 12; // Tanggal
  ws.getColumn(3).width = 10; // Kode Supplier
  ws.getColumn(4).width = 32; // Supplier
  ws.getColumn(5).width = 14; // No Pajak
  ws.getColumn(6).width = 16; // Total
  ws.getColumn(7).width = 16; // Bahan Tambahan
  ws.getColumn(8).width = 16; // Net
  ws.getColumn(9).width = 10; // Disc
  ws.getColumn(10).width = 10; // Status
  ws.getColumn(11).width = 18; // No Realisasi
  ws.getColumn(12).width = 12; // Tgl Realisasi
  ws.getColumn(13).width = 14; // Account
  ws.getColumn(14).width = 22; // Nama Account
  ws.getColumn(15).width = 18; // Cost Center
  ws.getColumn(16).width = 18; // DC
  ws.getColumn(17).width = 10; // User
  ws.getColumn(18).width = 20; // Created

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `VoucherPembayaran_${startDate}_sd_${endDate}.xlsx`);
};

export const exportVoucherPembayaranDetail = async (
  items: any[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Voucher");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "Detail Voucher Pembayaran";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:K2");
  ws.getCell("A2").value = `Periode: ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Nota",
    "Nomor PO",
    "Tanggal",
    "Type",
    "Total",
    "SPK Nomor",
    "SPK Nama",
    "Jumlah",
    "BS",
    "Tarif BS",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totTotal = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Nota);
    setC(row.getCell(3), r.NomorPO);
    setC(row.getCell(4), r.Tanggal, "center");
    setC(row.getCell(5), r.Type, "center");
    setN(row.getCell(6), r.Total);
    setC(row.getCell(7), r.SpkNomor);
    setC(row.getCell(8), r.SpkNama);
    setN(row.getCell(9), r.Jumlah);
    setN(row.getCell(10), r.Bs);
    setN(row.getCell(11), r.TarifBS);
    totTotal += Number(r.Total);
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 11; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(5), "TOTAL", "right", true);
  setN(footRow.getCell(6), totTotal, true);
  footRow.height = 18;

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 30;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 12;
  ws.getColumn(11).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `DetailVoucher_${startDate}_sd_${endDate}.xlsx`);
};

export const exportMutasiOut = async (
  items: MutasiOutRow[],
  detailCache: Record<string, MutasiOutDetail[]>,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mutasi Out Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10 };
    cell.numFmt = "#,##0.00";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  const today = new Date();
  const tglStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "Laporan Detail Mutasi Out Garmen";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = `Tanggal Cetak: ${tglStr}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Jenis",
    "Tanggal",
    "Cabang",
    "Tujuan",
    "Keterangan",
    "No. Permintaan",
    "Kode Barang",
    "Nama Barang",
    "Spesifikasi",
    "Satuan",
    "Jumlah",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  for (const m of items) {
    const details = detailCache[m.Nomor] || [];

    if (details.length === 0) {
      const row = ws.addRow([]);
      setC(row.getCell(1), m.Nomor, "left", true);
      setC(row.getCell(2), m.Jenis, "center");
      setC(row.getCell(3), m.Tanggal, "center");
      setC(row.getCell(4), m.Cab, "center");
      setC(row.getCell(5), m.Tujuan, "center");
      setC(row.getCell(6), m.Keterangan);
      for (let c = 7; c <= 12; c++) setC(row.getCell(c), "");
      row.height = 16;
      continue;
    }

    details.forEach((d, i) => {
      const row = ws.addRow([]);
      if (i === 0) {
        setC(row.getCell(1), m.Nomor, "left", true);
        setC(row.getCell(2), m.Jenis, "center");
        setC(row.getCell(3), m.Tanggal, "center");
        setC(row.getCell(4), m.Cab, "center");
        setC(row.getCell(5), m.Tujuan, "center");
        setC(row.getCell(6), m.Keterangan);
      } else {
        for (let c = 1; c <= 6; c++) setC(row.getCell(c), "");
      }
      setC(row.getCell(7), d.NoPermintaan);
      setC(row.getCell(8), d.Kode);
      setC(row.getCell(9), d.Nama);
      setC(row.getCell(10), d.Spesifikasi);
      setC(row.getCell(11), d.Satuan, "center");
      setN(row.getCell(12), d.Jumlah);
      row.height = 16;
    });
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 8;
  ws.getColumn(6).width = 22;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 30;
  ws.getColumn(10).width = 25;
  ws.getColumn(11).width = 8;
  ws.getColumn(12).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `Laporan_Detail_Mutasi_Out_${tglStr.replace(/\//g, "-")}.xlsx`,
  );
};

export const exportDaftarHutang = async (
  items: DaftarHutangRow[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Daftar Hutang");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Daftar Hutang";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jatuh Tempo",
    "Kode Sup",
    "Nama Supplier",
    "Total",
    "Voucher",
    "Bayar",
  ];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  let totTotal = 0,
    totVoucher = 0,
    totBayar = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.Nomor);
    setC(row.getCell(2), r.Tanggal, "center");
    setC(row.getCell(3), r.JatuhTempo, "center");
    setC(row.getCell(4), r.SupKode, "center");
    setC(row.getCell(5), r.Nama);
    setN(row.getCell(6), r.Total);
    setN(row.getCell(7), r.Voucher);
    setN(row.getCell(8), r.Bayar);
    totTotal += Number(r.Total || 0);
    totVoucher += Number(r.Voucher || 0);
    totBayar += Number(r.Bayar || 0);
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(5), "TOTAL", "right", true);
  setN(footRow.getCell(6), totTotal, true);
  setN(footRow.getCell(7), totVoucher, true);
  setN(footRow.getCell(8), totBayar, true);
  footRow.height = 18;

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 35;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `DaftarHutang_${startDate}_sd_${endDate}.xlsx`);
};

export const exportDaftarHutangDetail = async (
  items: DaftarHutangRow[],
  detailItems: DaftarHutangDetail[],
  startDate: string,
  endDate: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Daftar Hutang Detail");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" },
  };

  const setH = (cell: ExcelJS.Cell, val: string, fill = headerFill) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = fill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "Detail Daftar Hutang";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = `Periode : ${startDate} s/d ${endDate}`;
  ws.getCell("A2").font = { size: 10 };
  ws.addRow([]);

  // Header 2 baris: master + detail
  const row4 = ws.getRow(4);
  setH(row4.getCell(1), "Nomor BPB");
  setH(row4.getCell(2), "Tanggal");
  setH(row4.getCell(3), "Jatuh Tempo");
  setH(row4.getCell(4), "Supplier");
  setH(row4.getCell(5), "Total BPB");
  setH(row4.getCell(6), "No. Voucher", subHeaderFill);
  setH(row4.getCell(7), "Tgl Voucher", subHeaderFill);
  setH(row4.getCell(8), "Total Voucher", subHeaderFill);
  setH(row4.getCell(9), "Status Realisasi", subHeaderFill);
  row4.height = 18;

  let dataRowNum = 5;
  for (const m of items) {
    const details = detailItems.filter((d) => d.Nomor === m.Nomor);
    const rowCount = Math.max(details.length, 1);

    for (let i = 0; i < rowCount; i++) {
      const row = ws.getRow(dataRowNum + i);
      if (i === 0) {
        setC(row.getCell(1), m.Nomor);
        setC(row.getCell(2), m.Tanggal, "center");
        setC(row.getCell(3), m.JatuhTempo, "center");
        setC(row.getCell(4), m.Nama);
        setN(row.getCell(5), m.Total);
      } else {
        for (let c = 1; c <= 5; c++) {
          row.getCell(c).border = borderAll;
          row.getCell(c).font = { size: 10 };
        }
      }

      if (details[i]) {
        setC(row.getCell(6), details[i].NomorVoucher);
        setC(row.getCell(7), details[i].TanggalVoucher, "center");
        setN(row.getCell(8), details[i].Total);
        setC(
          row.getCell(9),
          details[i].StatusRealisasi == 1 ? "Sudah" : "Belum",
          "center",
        );
        if (details[i].StatusRealisasi == 1) {
          for (let c = 6; c <= 9; c++) {
            row.getCell(c).font = { size: 10, color: { argb: "FF1565C0" } };
          }
        }
      } else {
        for (let c = 6; c <= 9; c++) {
          row.getCell(c).border = borderAll;
          row.getCell(c).font = { size: 10 };
        }
      }
      row.height = 16;
    }
    dataRowNum += rowCount;
  }

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 32;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf]),
    `DaftarHutang_Detail_${startDate}_sd_${endDate}.xlsx`,
  );
};

export const exportRiwayatPenjualan = async (
  items: any[],
  startDate: string,
  endDate: string
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Riwayat Penjualan");

  // ── PENGATURAN STYLE & WARNA (Tema Hijau Minimarket) ────────────────
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B5E20" }, // Hijau Tua
  };

  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };

  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" }, // Hijau Sangat Muda untuk baris total
  };

  // Helper untuk mengisi sel standar
  const setCell = (
    cell: ExcelJS.Cell, 
    val: any, 
    align: "left" | "center" | "right" = "left", 
    isBold = false, 
    numFormat?: string
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { bold: isBold, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: align };
    if (numFormat) cell.numFmt = numFormat;
  };

  // ── 1. TITLE / JUDUL LAPORAN ───────────────────────────────────────
  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "LAPORAN RIWAYAT PENJUALAN KASIR";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };
  ws.getRow(1).height = 24;

  // Periode Tanggal
  ws.mergeCells("A2:G2");
  const subTitleCell = ws.getCell("A2");
  subTitleCell.value = `Periode: ${startDate} s/d ${endDate}`;
  subTitleCell.font = { italic: true, size: 11 };
  subTitleCell.alignment = { horizontal: "center" };
  ws.addRow([]); // Baris kosong pembatas

  // ── 2. HEADER TABEL ────────────────────────────────────────────────
  const headers = [
    "No. Nota", 
    "Tanggal", 
    "Customer", 
    "Kasir", 
    "Total Bruto", 
    "Total Diskon", 
    "Total Netto"
  ];
  
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // ── 3. DATA LOOPS (Membaca data dari items) ────────────────────────
  let totalBruto = 0;
  let totalDiskon = 0;
  let totalNetto = 0;

  // Format IDR Excel (Memunculkan Rp dan separator titik tanpa merusak data angka asli)
  const currencyFormat = '"Rp"#,##0;("-Rp"#,##0);"-"';

  for (const r of items) {
    const row = ws.addRow([]);
    
    // Fallback pencocokan properti jika database/backend menggunakan huruf besar (SO_NOMOR / Netto)
    const nota = r.so_nomor || r.SO_NOMOR || r.nota || r.NOTA;
    const tanggal = r.so_tanggal || r.SO_TANGGAL || r.tanggal || r.TANGGAL;
    const customer = r.so_customer || r.customer || r.CUSTOMER || "UMUM";
    const kasir = r.so_kasir || r.kasir || r.KASIR || "-";
    
    const bruto = Number(r.so_total || r.TOTAL || 0);
    const diskon = Number(r.so_discrp || r.DISCRP || 0);
    const netto = Number(r.so_netto || r.NETTO || (bruto - diskon));

    setCell(row.getCell(1), nota, "center");
    setCell(row.getCell(2), tanggal ? tanggal.substring(0, 10) : "-", "center");
    setCell(row.getCell(3), customer, "left");
    setCell(row.getCell(4), kasir, "center");
    setCell(row.getCell(5), bruto, "right", false, currencyFormat);
    setCell(row.getCell(6), diskon, "right", false, currencyFormat);
    setCell(row.getCell(7), netto, "right", false, currencyFormat);
    
    row.height = 18;

    // Akumulasi Total Bawah
    totalBruto += bruto;
    totalDiskon += diskon;
    totalNetto += netto;
  }

  // ── 4. FOOTER ROW (TOTAL JUMALAH AKHIR) ───────────────────────────
  const footRow = ws.addRow([]);
  footRow.height = 20;
  
  // Berikan border dan warna fill di seluruh kolom footer
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }

  // Gabungkan Kolom A s/d D untuk teks "TOTAL"
  ws.mergeCells(`A${footRow.number}:D${footRow.number}`);
  footRow.getCell(1).value = "TOTAL SUMMARY";
  footRow.getCell(1).font = { bold: true, size: 10 };
  footRow.getCell(1).alignment = { vertical: "middle", horizontal: "right" };

  // Taruh Nilai Akumulasi Angka
  setCell(footRow.getCell(5), totalBruto, "right", true, currencyFormat);
  setCell(footRow.getCell(6), totalDiskon, "right", true, currencyFormat);
  setCell(footRow.getCell(7), totalNetto, "right", true, currencyFormat);

  // ── 5. SET WIDTH KOLOM AGAR RAPI ──────────────────────────────────
  ws.getColumn(1).width = 22; // No. Nota
  ws.getColumn(2).width = 14; // Tanggal
  ws.getColumn(3).width = 28; // Customer
  ws.getColumn(4).width = 15; // Kasir
  ws.getColumn(5).width = 18; // Total Bruto
  ws.getColumn(6).width = 16; // Total Diskon
  ws.getColumn(7).width = 18; // Total Netto

  // ── 6. TRIGGER DOWNLOAD FILE EXCEL KE BROWSER ──────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `Laporan_Riwayat_Penjualan_${startDate}_to_${endDate}.xlsx`);
};


export const exportReturPembelian = async (
  items: any[],
  startDate: string,
  endDate: string
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Retur Pembelian");

  // Styling Hijau Tua & Hijau Muda Soft (Persis gaya voucher pembayaran Anda)
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" }, // Hijau Tua
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" }, // Hijau Muda Soft
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };

  const setC = (cell: ExcelJS.Cell, val: any, align: "left" | "center" | "right" = "left", bold = false) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold: bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };

  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold: bold, name: "Courier New" };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.numFmt = "#,##0"; // Format Rupiah Akuntansi
  };

  // Judul Dokumen Atas Excel
  ws.addRow([]);
  const titleRow = ws.addRow([]);
  setC(titleRow.getCell(2), "LAPORAN RETUR PEMBELIAN (SUPPLIER)", "left", true);
  titleRow.getCell(2).font = { size: 14, bold: true };

  const periodRow = ws.addRow([]);
  setC(periodRow.getCell(2), `Periode : ${startDate} s/d ${endDate}`, "left");
  periodRow.getCell(2).font = { size: 10, italic: true };
  ws.addRow([]);

  // Membuat 9 Kolom Utama Laporan Retur Pembelian
  const headerRow = ws.addRow([]);
  headerRow.height = 24;
  setH(headerRow.getCell(1), "No");
  setH(headerRow.getCell(2), "No. Retur");
  setH(headerRow.getCell(3), "Tanggal");
  setH(headerRow.getCell(4), "Kode Spl");
  setH(headerRow.getCell(5), "Nama Supplier");
  setH(headerRow.getCell(6), "Total");
  setH(headerRow.getCell(7), "Keterangan");

  // Penampung Nilai Akumulasi Total Bawah
  let totBruto = 0;
  let totPotongan = 0;
  let totNetto = 0;
  let no = 1;

  // Looping Mengisi Baris Data Retur Pembelian
  for (const r of items) {
    const row = ws.addRow([]);
    
    // Mengambil nilai angka dari data API backend Anda
    const bruto = Number(r.rtr_bruto || r.TotalBruto || r.Total || 0);
    

    setC(row.getCell(1), no++, "center");
    setC(row.getCell(2), r.rtr_nomor || r.Nomor || "-");
    
    // Format tanggal ambil 10 karakter awal saja (YYYY-MM-DD)
    setC(row.getCell(3), r.rtr_tanggal ? r.rtr_tanggal.substring(0, 10) : (r.Tanggal || "-"), "center");
    
    // rtr_cust di sistem Anda menampung kode supplier, sedangkan nama supplier ada di spl_nama / cust_nama
    setC(row.getCell(4), r.rtr_cust || r.KodeCust || "-");
    setC(row.getCell(5), r.Supplier || r.cust_nama || r.NamaCustomer || "-");
    
    setN(row.getCell(6), bruto);

    
    setC(row.getCell(7), r.Memo || r.memo || "");

    // Tambahkan baris ke kalkulasi total akhir
    totBruto += bruto;
 
    
    row.height = 18;
  }

  // Membuat Baris Total Bawah (Footer)
  const footRow = ws.addRow([]);
  footRow.height = 20;
  for (let c = 1; c <= 7; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  
  setC(footRow.getCell(5), "TOTAL", "right", true);
  setN(footRow.getCell(6), totBruto, true);
  setC(footRow.getCell(7), "", "left"); 

  // Mengatur Lebar Kolom agar Excel Terlihat Rapi & Tidak Sempit
  ws.getColumn(1).width = 6;   // No
  ws.getColumn(2).width = 20;  // No. Retur
  ws.getColumn(3).width = 14;  // Tanggal
  ws.getColumn(4).width = 12;  // Kode Supplier
  ws.getColumn(5).width = 32;  // Nama Supplier
  ws.getColumn(6).width = 16;  // Total Bruto
  ws.getColumn(7).width = 25;  // Keterangan

  // Proses download file .xlsx dari browser kasir (bisa pilih folder simpan)
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return await promptSaveAs(blob, `Laporan_Retur_Pembelian_${startDate}_to_${endDate}.xlsx`);
};

// ─────────────────────────────────────────────────────────────────────
// GENERIC EXPORT — dipakai untuk modul baru (Barang Jadi, Bahan, dll)
// supaya tidak perlu tulis ulang boilerplate ExcelJS tiap modul.
// Fungsi-fungsi lama di atas TIDAK diubah, tetap jalan seperti biasa.
// ─────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  currency?: boolean; // format "Rp #,##0"
  align?: "left" | "center" | "right";
  // ⬅️ BARU: untuk kolom yang isinya TIDAK ada di row apa adanya (mis.
  // status close yang disimpan sebagai 0/1 tapi mau ditulis sebagai
  // "CLOSED"/"BELUM DITUTUP"). Kalau diisi, `map` yang menang dan `key`
  // hanya dipakai untuk menentukan nama kolom di sheet Excel.
  // PENTING: baris `ws.columns` (yang arreglar header + lebar) tetap pakai
  // `key`, karena ExcelJS butuh nama kolom yang valid — makanya `key`
  // tidak boleh kosong walau isinya dikirim lewat `map`.
  map?: (row: any) => any;
}

export interface ExportOptions {
  title: string;          // judul di baris 1 (merged)
  filenamePrefix: string; // nama file sebelum tanggal
  sheetName?: string;
  columns: ExportColumn[];
  rows: any[];
}

export const exportToExcel = async ({
  title,
  filenamePrefix,
  sheetName = "Sheet1",
  columns,
  rows,
}: ExportOptions) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  // ── Judul ──
  ws.mergeCells(1, 1, 1, columns.length);
  ws.getCell("A1").value = `${title} (${rows.length} data)`;
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.getCell("A1").alignment = { vertical: "middle" };
  ws.getRow(1).height = 22;

  // ── Header tabel ──
  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 20;

  // ── Data ──
  rows.forEach((item) => {
    const rowData: Record<string, any> = {};
    columns.forEach((c) => {
      // map didahulukan supaya kolom turunan bisa dipakai di sheet yang
      // sama dengan kolom biasa.
      if (c.map) {
        rowData[c.key] = c.map(item);
        return;
      }
      rowData[c.key] = item[c.key] ?? (c.currency ? 0 : "-");
    });
    const row = ws.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      cell.border = borderAll;
      cell.font = { size: 10 };
      const col = columns[colNumber - 1];
      if (col?.currency) {
        cell.numFmt = '"Rp" #,##0';
        cell.alignment = { horizontal: "right" };
      } else if (col?.align) {
        cell.alignment = { horizontal: col.align };
      }
    });
    row.height = 16;
  });

  ws.views = [{ state: "frozen", ySplit: 2 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportLaporanPersediaan = async (
  items: any[],
  gudangLabel?: string,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan Persediaan");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };

  const setH = (cell: ExcelJS.Cell, val: string) => {
    cell.value = val;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.border = borderAll;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  };
  const setC = (
    cell: ExcelJS.Cell,
    val: any,
    align: "left" | "center" | "right" = "left",
    bold = false,
  ) => {
    cell.value = val;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.alignment = { vertical: "middle", horizontal: align };
  };
  const setN = (cell: ExcelJS.Cell, val: number, bold = false) => {
    cell.value = Number(val) || 0;
    cell.border = borderAll;
    cell.font = { size: 10, bold };
    cell.numFmt = "#,##0";
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = gudangLabel
    ? `Laporan Persediaan — ${gudangLabel}`
    : "Laporan Persediaan";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.addRow([]);

  const cols = ["Kode", "Nama", "Satuan", "Gudang", "Stok"];
  const hRow = ws.addRow(cols);
  hRow.eachCell((cell, i) => setH(cell, cols[i - 1]));
  hRow.height = 20;

  const posFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F5E9" },
  };
  const negFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEBEE" },
  };

  let totalStok = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    setC(row.getCell(1), r.kode, "center");
    setC(row.getCell(2), r.nama);
    setC(row.getCell(3), r.satuan, "center");
    setC(row.getCell(4), r.gudangNama || r.gudang, "center");
    setN(row.getCell(5), r.stok);
    const stokVal = Number(r.stok || 0);
    if (stokVal > 0) {
      row.getCell(5).font = { size: 10, bold: true, color: { argb: "FF2E7D32" } };
      row.getCell(5).fill = posFill;
    } else if (stokVal < 0) {
      row.getCell(5).font = { size: 10, bold: true, color: { argb: "FFCC0000" } };
      row.getCell(5).fill = negFill;
    }
    totalStok += stokVal;
    row.height = 16;
  }

  const footRow = ws.addRow([]);
  for (let c = 1; c <= 5; c++) {
    footRow.getCell(c).border = borderAll;
    footRow.getCell(c).fill = totalFill;
  }
  setC(footRow.getCell(2), "TOTAL", "right", true);
  setN(footRow.getCell(5), totalStok, true);
  footRow.height = 18;

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 12;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Laporan_Persediaan.xlsx`);
};

// ── Helper unduhan: Save As dialog (File System Access API) + fallback ──
// return: true = berhasil disimpan, false = dibatalkan user (AbortError)
const promptSaveAs = async (blob: Blob, defaultName: string): Promise<boolean> => {
  const w = window as any;
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: "Excel Workbook",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e: any) {
      // AbortError = user membatalkan dialog pilih lokasi → bukan error
      if (e?.name === "AbortError") return false;
      // Kegagalan lain pada API → lanjut ke fallback download biasa
      console.warn("showSaveFilePicker gagal, fallback ke download:", e);
    }
  }
  saveAs(blob, defaultName);
  return true;
};

// Label & nama file selalu mengikuti periode filter yang aktif, bukan tanggal
// hari ini — supaya isi export identik dengan yang tampil di frontend.
const dmyLabel = (val?: string) => {
  if (!val) return "";
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`; // dd/mm/yyyy
  return String(val);
};
const periodeLabel = (awal?: string, akhir?: string) => {
  if (awal && akhir) return `${dmyLabel(awal)}  s/d  ${dmyLabel(akhir)}`;
  if (awal) return `mulai ${dmyLabel(awal)}`;
  if (akhir) return `sampai ${dmyLabel(akhir)}`;
  return "Semua Periode";
};
const periodeName = (awal?: string, akhir?: string) => {
  if (awal && akhir) return `${awal}_sd_${akhir}`;
  if (awal) return `mulai_${awal}`;
  if (akhir) return `sampai_${akhir}`;
  return "semua_periode";
};

const kartuStokBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};
const kartuStokHeaderFill: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF283D72" },
};
const kartuStokHeaderFont: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 10,
  name: "Arial",
};
const kartuStokTotalFill: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8F0FE" },
};

type KartuStokAlign = "left" | "center" | "right";

function ksHeader(ws: ExcelJS.Worksheet, row: ExcelJS.Row, cols: string[]) {
  row.height = 20;
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.value = c;
    cell.font = kartuStokHeaderFont;
    cell.fill = kartuStokHeaderFill;
    cell.border = kartuStokBorder;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}

function ksCell(
  ws: ExcelJS.Worksheet,
  row: ExcelJS.Row,
  col: number,
  val: any,
  align: KartuStokAlign = "left",
  bold = false,
) {
  const cell = row.getCell(col);
  cell.value = val;
  cell.border = kartuStokBorder;
  cell.font = { size: 10, bold, name: "Arial" };
  cell.alignment = { vertical: "middle", horizontal: align };
}

function ksNum(
  ws: ExcelJS.Worksheet,
  row: ExcelJS.Row,
  col: number,
  val: number,
  bold = false,
) {
  const cell = row.getCell(col);
  cell.value = Number(val) || 0;
  cell.border = kartuStokBorder;
  cell.font = { size: 10, bold, name: "Arial" };
  // Angka polos (tanpa pemisah ribuan) supaya tidak gagal parse, ikut pola SO
  cell.numFmt = "0.00";
  cell.alignment = { vertical: "middle", horizontal: "right" };
}

function ksDate(val: any): string {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split(/[-T ]/);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    return `${d}-${m}-${y}`; // dd-mm-yyyy
  }
  return s;
}

// ── Browse PO — Export Detail ──────────────────────────────────────────
// Format: header PO ditulis sekali per nomor (grouped), lalu tiap item
// barang di bawahnya — pola sama seperti exportSoDetail.
interface PoDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  Memo: string;
  Supplier: string;
  Pajak: string;
  Total: number;
  Ppn: number;
  Status: string;
  Receipt: string;
  NoUrut: number;
  Kode: string;
  Nama: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
  QtyTerima: number;
}

export const exportPoDetail = async (
  rows: PoDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("PO Detail");

  ws.mergeCells("A1:R1");
  ws.getCell("A1").value = `Browse PO — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor", "Tanggal", "Memo", "Supplier", "Pajak", "Total", "PPN",
    "Status", "Receipt", "No. Urut", "Kode Barang", "Nama Barang", "Satuan",
    "Qty", "Harga", "Disc (%)", "Qty Terima", "Nilai",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalNilai = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.Memo || "-", "left");
      ksCell(ws, row, 4, r.Supplier, "left");
      ksCell(ws, row, 5, r.Pajak, "center");
      ksNum(ws, row, 6, r.Total, true);
      ksNum(ws, row, 7, r.Ppn);
      ksCell(ws, row, 8, r.Status, "center");
      ksCell(ws, row, 9, r.Receipt, "center");
    }

    ksNum(ws, row, 10, r.NoUrut || 0);
    ksCell(ws, row, 11, r.Kode, "center");
    ksCell(ws, row, 12, r.Nama, "left");
    ksCell(ws, row, 13, r.Satuan, "center");
    ksNum(ws, row, 14, r.Qty);
    ksNum(ws, row, 15, r.Harga);
    ksNum(ws, row, 16, r.DiscPr || 0);
    ksNum(ws, row, 17, r.QtyTerima || 0);
    const nilai =
      Number(r.Qty || 0) * Number(r.Harga || 0) -
      (Number(r.Qty || 0) * Number(r.Harga || 0) * Number(r.DiscPr || 0)) / 100;
    ksNum(ws, row, 18, nilai, true);
    totalNilai += nilai;
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 18; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 11, "TOTAL NILAI", "right", true);
  ksNum(ws, foot, 18, totalNilai, true);
  foot.height = 18;

  const widths = [18, 12, 26, 26, 9, 16, 14, 10, 10, 9, 12, 26, 10, 10, 14, 9, 10, 16];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `PO_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse BPB — Export Detail ─────────────────────────────────────────
interface BpbDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  NomorPO: string;
  Supplier: string;
  Gudang: string;
  Memo: string;
  IsInvoice: string;
  NoUrut: number;
  Barcode: string;
  NamaBarang: string;
  Satuan: string;
  Qty: number;
  TglExpired: string;
}

export const exportBpbDetail = async (
  rows: BpbDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("BPB Detail");

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = `Browse BPB — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor BPB", "Tanggal", "Nomor PO", "Supplier", "Gudang", "Memo",
    "Sudah Invoice", "No. Urut", "Barcode", "Nama Barang", "Satuan",
    "Qty", "Tgl Expired",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.NomorPO || "-", "center");
      ksCell(ws, row, 4, r.Supplier, "left");
      ksCell(ws, row, 5, r.Gudang, "left");
      ksCell(ws, row, 6, r.Memo || "-", "left");
      ksCell(ws, row, 7, r.IsInvoice, "center");
    }

    ksNum(ws, row, 8, r.NoUrut || 0);
    ksCell(ws, row, 9, r.Barcode, "center");
    ksCell(ws, row, 10, r.NamaBarang, "left");
    ksCell(ws, row, 11, r.Satuan, "center");
    ksNum(ws, row, 12, r.Qty);
    ksCell(ws, row, 13, r.TglExpired || "-", "center");
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const widths = [18, 12, 16, 26, 16, 26, 13, 9, 12, 26, 10, 10, 14];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `BPB_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse Invoice — Export Detail ─────────────────────────────────────
interface InvDetailFlatRow {
  Nomor: string;
  Nobukti: string;
  Tanggal: string;
  JatuhTempo: string;
  Memo: string;
  Supplier: string;
  NoPajak: string;
  Total: number;
  Retur: number;
  Ppn: number;
  Bayar: number;
  Freight: number;
  StatusBayar: string;
  Pajak: string;
  NomorBPB: string;
  NoUrut: number;
  Barcode: string;
  NamaBarang: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
}

export const exportInvDetail = async (
  rows: InvDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Invoice Detail");

  ws.mergeCells("A1:V1");
  ws.getCell("A1").value = `Browse Invoice — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor Invoice", "No. Bukti", "Tanggal", "Jatuh Tempo", "Memo", "Supplier",
    "No. Pajak", "Total", "Retur", "PPN", "Bayar", "Freight", "Status Bayar",
    "Pajak", "Nomor BPB", "No. Urut", "Barcode", "Nama Barang", "Satuan",
    "Qty", "Harga", "Disc (%)",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalNilai = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, r.Nobukti, "center");
      ksCell(ws, row, 3, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 4, ksDate(r.JatuhTempo), "center");
      ksCell(ws, row, 5, r.Memo || "-", "left");
      ksCell(ws, row, 6, r.Supplier, "left");
      ksCell(ws, row, 7, r.NoPajak || "-", "center");
      ksNum(ws, row, 8, r.Total, true);
      ksNum(ws, row, 9, r.Retur);
      ksNum(ws, row, 10, r.Ppn);
      ksNum(ws, row, 11, r.Bayar);
      ksNum(ws, row, 12, r.Freight);
      ksCell(ws, row, 13, r.StatusBayar, "center");
      ksCell(ws, row, 14, r.Pajak, "center");
      ksCell(ws, row, 15, r.NomorBPB || "-", "center");
    }

    ksNum(ws, row, 16, r.NoUrut || 0);
    ksCell(ws, row, 17, r.Barcode, "center");
    ksCell(ws, row, 18, r.NamaBarang, "left");
    ksCell(ws, row, 19, r.Satuan, "center");
    ksNum(ws, row, 20, r.Qty);
    ksNum(ws, row, 21, r.Harga);
    ksNum(ws, row, 22, r.DiscPr || 0);
    totalNilai +=
      Number(r.Qty || 0) * Number(r.Harga || 0) -
      (Number(r.Qty || 0) * Number(r.Harga || 0) * Number(r.DiscPr || 0)) / 100;
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 22; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 17, "TOTAL NILAI", "right", true);
  ksNum(ws, foot, 20, totalNilai, true);
  foot.height = 18;

  const widths = [16, 14, 12, 12, 22, 24, 14, 14, 14, 12, 14, 12, 10, 8, 14, 9, 12, 26, 10, 9, 14, 9];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `Invoice_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse Pembayaran Supplier — Export & Export Detail ────────────────
// Export        : 1 baris = 1 bukti bayar (header saja).
// Export Detail : 1 baris = 1 invoice yang dibayar (flat, tidak grouped).
interface BayarSupHeaderRow {
  NOMOR: string;
  TANGGAL: string;
  MEMO: string;
  SUP_KODE: string;
  SUP_NAMA: string;
  REK_KODE: string;
  REK_NAMA: string;
  CARA_BAYAR: string;
  NO_GIRO: string | null;
  TGL_CAIR: string | null;
  TOTAL_BAYAR: number;
  TAX: string;
}

export const exportBayarSupplier = async (
  rows: BayarSupHeaderRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Pembayaran Supplier");

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = `Pembayaran Supplier (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor", "Tanggal", "Memo", "Kode Supplier", "Nama Supplier",
    "Cara Bayar", "No. Giro", "Tgl Cair", "Rekening", "Total Bayar", "Pajak",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalBayar = 0;
  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.NOMOR, "left", true);
    ksCell(ws, row, 2, ksDate(r.TANGGAL), "center");
    ksCell(ws, row, 3, r.MEMO || "-", "left");
    ksCell(ws, row, 4, r.SUP_KODE, "center");
    ksCell(ws, row, 5, r.SUP_NAMA, "left");
    ksCell(ws, row, 6, r.CARA_BAYAR, "center");
    ksCell(ws, row, 7, r.NO_GIRO || "-", "center");
    ksCell(ws, row, 8, ksDate(r.TGL_CAIR), "center");
    ksCell(ws, row, 9, r.REK_NAMA, "left");
    ksNum(ws, row, 10, r.TOTAL_BAYAR, true);
    ksCell(ws, row, 11, r.TAX, "center");
    totalBayar += Number(r.TOTAL_BAYAR || 0);
    row.height = 16;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 11; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 5, "TOTAL BAYAR", "right", true);
  ksNum(ws, foot, 10, totalBayar, true);
  foot.height = 18;

  const widths = [18, 12, 24, 13, 26, 11, 13, 12, 22, 16, 9];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `PembayaranSupplier_${periodeName(startDate, endDate)}.xlsx`);
};

interface BayarSupDetailFlatRow {
  NOMOR: string;
  TANGGAL: string;
  MEMO: string;
  SUP_KODE: string;
  SUP_NAMA: string;
  REK_NAMA: string;
  CARA_BAYAR: string;
  NO_GIRO: string | null;
  TGL_CAIR: string | null;
  TOTAL_BAYAR: number;
  TAX: string;
  NoInvoice: string;
  TglInvoice: string;
  TotalInvoice: number;
  NilaiBayar: number;
  StatusBayar: string;
}

export const exportBayarSupplierDetail = async (
  rows: BayarSupDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Pembayaran Supplier Detail");

  ws.mergeCells("A1:P1");
  ws.getCell("A1").value = `Pembayaran Supplier — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor", "Tanggal", "Memo", "Kode Supplier", "Nama Supplier", "Cara Bayar",
    "No. Giro", "Tgl Cair", "Rekening", "Total Bayar", "Pajak",
    "No. Invoice", "Tgl Invoice", "Total Invoice", "Nilai Bayar", "Status Bayar",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalBayar = 0;
  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.NOMOR, "left", true);
    ksCell(ws, row, 2, ksDate(r.TANGGAL), "center");
    ksCell(ws, row, 3, r.MEMO || "-", "left");
    ksCell(ws, row, 4, r.SUP_KODE, "center");
    ksCell(ws, row, 5, r.SUP_NAMA, "left");
    ksCell(ws, row, 6, r.CARA_BAYAR, "center");
    ksCell(ws, row, 7, r.NO_GIRO || "-", "center");
    ksCell(ws, row, 8, ksDate(r.TGL_CAIR), "center");
    ksCell(ws, row, 9, r.REK_NAMA, "left");
    ksNum(ws, row, 10, r.TOTAL_BAYAR, true);
    ksCell(ws, row, 11, r.TAX, "center");
    ksCell(ws, row, 12, r.NoInvoice, "center");
    ksCell(ws, row, 13, ksDate(r.TglInvoice), "center");
    ksNum(ws, row, 14, r.TotalInvoice);
    ksNum(ws, row, 15, r.NilaiBayar, true);
    ksCell(ws, row, 16, r.StatusBayar, "center");
    totalBayar += Number(r.NilaiBayar || 0);
    row.height = 16;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 16; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 5, "TOTAL BAYAR", "right", true);
  ksNum(ws, foot, 15, totalBayar, true);
  foot.height = 18;

  const widths = [18, 12, 22, 13, 26, 11, 13, 12, 22, 16, 9, 16, 12, 14, 14, 11];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `PembayaranSupplier_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse Retur Pembelian — Export Detail ─────────────────────────────
// Format sama seperti exportSoDetail (header ditulis sekali per nomor),
// dengan susunan kolom menyesuaikan data retur.
interface ReturDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  NomorInvoice: string;
  Supplier: string;
  Memo: string;
  Pajak: string;
  Total: number;
  NoUrut: number;
  Kode: string;
  NamaBarang: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
}

export const exportReturPembelianDetail = async (
  rows: ReturDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Retur Detail");

  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = `Browse Retur Pembelian — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor Retur", "Tanggal", "Nomor Invoice", "Supplier", "Memo", "Pajak",
    "Total", "No. Urut", "Kode Barang", "Nama Barang", "Satuan",
    "Qty", "Harga", "Disc (%)",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalNilai = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.NomorInvoice || "-", "center");
      ksCell(ws, row, 4, r.Supplier, "left");
      ksCell(ws, row, 5, r.Memo || "-", "left");
      ksCell(ws, row, 6, r.Pajak, "center");
      ksNum(ws, row, 7, r.Total, true);
    }

    ksNum(ws, row, 8, r.NoUrut || 0);
    ksCell(ws, row, 9, r.Kode, "center");
    ksCell(ws, row, 10, r.NamaBarang, "left");
    ksCell(ws, row, 11, r.Satuan, "center");
    ksNum(ws, row, 12, r.Qty);
    ksNum(ws, row, 13, r.Harga);
    ksNum(ws, row, 14, r.DiscPr || 0);
    totalNilai +=
      Number(r.Qty || 0) * Number(r.Harga || 0) -
      (Number(r.Qty || 0) * Number(r.Harga || 0) * Number(r.DiscPr || 0)) / 100;
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 14; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 9, "TOTAL NILAI", "right", true);
  ksNum(ws, foot, 14, totalNilai, true);
  foot.height = 18;

  const widths = [16, 12, 16, 26, 24, 9, 14, 9, 12, 26, 10, 9, 14, 9];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `ReturPembelian_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

interface KartuStokSummaryRow {
  kode: string | number;
  nama: string;
  jenisBarang: string;
  hrgBeli: number;
  awal: number;
  stokIn: number;
  stokOut: number;
  akhir: number;
}
interface KartuStokMutasiRow {
  kode: string | number;
  noreferensi: string;
  tanggal: string;
  keterangan: string;
  gudang: string;
  gudangNama: string;
  expired: string;
  hargabeli: number;
  stokIn: number;
  stokOut: number;
}

// ── EXPORT (ringkasan, tanpa mutasi) ──────────────────────────────────
export const exportKartuStok = async (
  items: KartuStokSummaryRow[],
  tglAwal?: string,
  tglAkhir?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Kartu Stok");

  // Baris info
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(tglAwal, tglAkhir)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Kode",
    "Nama",
    "Jenis Barang",
    "Harga Beli",
    "Awal",
    "In",
    "Out",
    "Akhir",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalAwal = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalAkhir = 0;
  for (const r of items) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.kode, "center");
    ksCell(ws, row, 2, r.nama, "left");
    ksCell(ws, row, 3, r.jenisBarang, "left");
    ksNum(ws, row, 4, r.hrgBeli);
    ksNum(ws, row, 5, r.awal);
    ksNum(ws, row, 6, r.stokIn);
    ksNum(ws, row, 7, r.stokOut);
    ksNum(ws, row, 8, r.akhir);
    totalAwal += Number(r.awal || 0);
    totalIn += Number(r.stokIn || 0);
    totalOut += Number(r.stokOut || 0);
    totalAkhir += Number(r.akhir || 0);
    row.height = 16;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 8; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 2, "TOTAL", "right", true);
  ksNum(ws, foot, 5, totalAwal, true);
  ksNum(ws, foot, 6, totalIn, true);
  ksNum(ws, foot, 7, totalOut, true);
  ksNum(ws, foot, 8, totalAkhir, true);
  foot.height = 18;

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 35;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 14;

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `KartuStok_${periodeName(tglAwal, tglAkhir)}.xlsx`);
};

// ── EXPORT DETAIL (ringkasan + mutasi, forward-fill ringkasan kosong) ──
export const exportKartuStokDetail = async (
  items: KartuStokSummaryRow[],
  mutasi: KartuStokMutasiRow[],
  tglAwal?: string,
  tglAkhir?: string,
): Promise<boolean> => {
  // Kelompokkan mutasi per kode barang
  const byKode = new Map<string | number, KartuStokMutasiRow[]>();
  for (const m of mutasi) {
    const key = m.kode;
    if (!byKode.has(key)) byKode.set(key, []);
    byKode.get(key)!.push(m);
  }

  const ws = new ExcelJS.Workbook().addWorksheet("Kartu Stok Detail");

  ws.mergeCells("A1:P1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(tglAwal, tglAkhir)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    // Ringkasan barang (kolom 1-8)
    "Kode",
    "Nama",
    "Jenis Barang",
    "Harga Beli",
    "Awal",
    "In",
    "Out",
    "Akhir",
    // Detail mutasi (kolom 9-16)
    "Nomor",
    "Tanggal",
    "Keterangan",
    "Gudang",
    "In",
    "Out",
    "Expired",
    "Harga Beli",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  for (const r of items) {
    const muts = byKode.get(r.kode) ?? [];
    const rowCount = Math.max(muts.length, 1);

    for (let i = 0; i < rowCount; i++) {
      const m = muts[i];
      const row = ws.addRow([]);

      // Ringkasan hanya di baris pertama tiap barang; baris mutasi 2+ kosong
      if (i === 0) {
        ksCell(ws, row, 1, r.kode, "center");
        ksCell(ws, row, 2, r.nama, "left");
        ksCell(ws, row, 3, r.jenisBarang, "left");
        ksNum(ws, row, 4, r.hrgBeli);
        ksNum(ws, row, 5, r.awal);
        ksNum(ws, row, 6, r.stokIn);
        ksNum(ws, row, 7, r.stokOut);
        ksNum(ws, row, 8, r.akhir);
      }

      // Detail mutasi (kalau ada mutasi utk baris ini)
      if (m) {
        ksCell(ws, row, 9, m.noreferensi, "left");
        ksCell(ws, row, 10, ksDate(m.tanggal), "center");
        ksCell(ws, row, 11, m.keterangan || "", "left");
        ksCell(ws, row, 12, m.gudangNama || m.gudang || "", "left");
        ksNum(ws, row, 13, m.stokIn);
        ksNum(ws, row, 14, m.stokOut);
        ksCell(ws, row, 15, ksDate(m.expired), "center");
        ksNum(ws, row, 16, m.hargabeli);
      }

      row.height = 16;
    }
  }

  const widths = [12, 32, 22, 14, 14, 14, 14, 14, 18, 13, 26, 18, 14, 14, 13, 14];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `KartuStok_Detail_${periodeName(tglAwal, tglAkhir)}.xlsx`);
};

// ── Browse SO — Export & Export Detail ────────────────────────────────
// Format mengikuti Kartu Stok (helper ksHeader/ksCell/ksNum/ksDate):
// - Export        : hanya baris header SO, dengan baris TOTAL di bawahnya.
// - Export Detail : header SO ditulis sekali per nomor (grouped), lalu tiap
//   item barang di bawahnya — pola rapi seperti exportKartuStokDetail.
interface SoHeaderRow {
  Nomor: string;
  Tanggal: string;
  Memo: string;
  Customer: string;
  Salesman: string;
  Closed: string;
  Kirim: string;
  Total: number;
  UangMuka: number;
  Ppn: number;
  UserCreate: string;
  DateCreate: string;
}

export const exportSo = async (
  rows: SoHeaderRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("SO");

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(startDate, endDate)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Memo",
    "Customer",
    "Salesman",
    "Closed",
    "Kirim",
    "Total",
    "Uang Muka",
    "PPN",
    "User Create",
    "Date Create",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalTotal = 0;
  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.Nomor, "center", true);
    ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
    ksCell(ws, row, 3, r.Memo || "-", "left");
    ksCell(ws, row, 4, r.Customer, "left");
    ksCell(ws, row, 5, r.Salesman, "left");
    ksCell(ws, row, 6, r.Closed, "center");
    ksCell(ws, row, 7, r.Kirim, "center");
    ksNum(ws, row, 8, r.Total, true);
    ksNum(ws, row, 9, r.UangMuka);
    ksNum(ws, row, 10, r.Ppn);
    ksCell(ws, row, 11, r.UserCreate, "center");
    ksCell(ws, row, 12, r.DateCreate, "center");
    totalTotal += Number(r.Total || 0);
    row.height = 16;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 12; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 4, "TOTAL", "right", true);
  ksNum(ws, foot, 8, totalTotal, true);
  foot.height = 18;

  const widths = [18, 12, 26, 26, 14, 10, 10, 16, 14, 14, 14, 18];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `SO_${periodeName(startDate, endDate)}.xlsx`);
};

interface SoDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  Memo: string;
  Customer: string;
  Salesman: string;
  Closed: string;
  Kirim: string;
  Total: number;
  Ppn: number;
  UserCreate: string;
  DateCreate: string;
  Kode: string | number;
  Nama: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
  Terkirim: number;
}

export const exportSoDetail = async (
  rows: SoDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("SO Detail");

  ws.mergeCells("A1:S1");
  ws.getCell("A1").value = `Browse SO — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Memo",
    "Customer",
    "Salesman",
    "Closed",
    "Kirim",
    "Total",
    "PPN",
    "User Create",
    "Date Create",
    "Kode Barang",
    "Nama Barang",
    "Satuan",
    "Jumlah",
    "Harga",
    "Disc (%)",
    "Nilai",
    "Terkirim",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalNilai = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    // Kolom header hanya di baris pertama tiap nomor; baris item ke-2+ kosong
    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.Memo || "-", "left");
      ksCell(ws, row, 4, r.Customer, "left");
      ksCell(ws, row, 5, r.Salesman, "left");
      ksCell(ws, row, 6, r.Closed, "center");
      ksCell(ws, row, 7, r.Kirim, "center");
      ksNum(ws, row, 8, r.Total, true);
      ksNum(ws, row, 9, r.Ppn);
      ksCell(ws, row, 10, r.UserCreate, "center");
      ksCell(ws, row, 11, r.DateCreate, "center");
    }

    ksCell(ws, row, 12, r.Kode, "center");
    ksCell(ws, row, 13, r.Nama, "left");
    ksCell(ws, row, 14, r.Satuan, "center");
    ksNum(ws, row, 15, r.Qty);
    ksNum(ws, row, 16, r.Harga);
    ksNum(ws, row, 17, r.DiscPr || 0);
    const nilai =
      Number(r.Qty || 0) * Number(r.Harga || 0) -
      (Number(r.Qty || 0) * Number(r.Harga || 0) * Number(r.DiscPr || 0)) / 100;
    ksNum(ws, row, 18, nilai, true);
    ksNum(ws, row, 19, r.Terkirim || 0);
    totalNilai += nilai;
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 19; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 12, "TOTAL NILAI", "right", true);
  ksNum(ws, foot, 18, totalNilai, true);
  foot.height = 18;

  const widths = [18, 12, 26, 22, 14, 9, 9, 16, 14, 12, 16, 12, 26, 10, 10, 14, 9, 16, 10];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `SO_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse DO — Export & Export Detail ────────────────────────────────
// Format sama seperti SO/Kartu Stok: Export = header saja (dengan baris
// TOTAL), Export Detail = header ditulis sekali per nomor + tiap item
// barang di bawahnya (grouped).
interface DoHeaderRow {
  Nomor: string;
  Tanggal: string;
  NoSO: string;
  Customer: string;
  Gudang: string;
  ShipAddress: string;
  Memo: string;
  Closed: string;
  Invoice: string;
  UserCreate: string;
  DateCreate: string;
}

export const exportDo = async (
  rows: DoHeaderRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("DO");

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(startDate, endDate)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "No. SO",
    "Customer",
    "Gudang",
    "Ship Address",
    "Memo",
    "Closed",
    "Invoice",
    "User Create",
    "Date Create",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.Nomor, "center", true);
    ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
    ksCell(ws, row, 3, r.NoSO || "-", "center");
    ksCell(ws, row, 4, r.Customer, "left");
    ksCell(ws, row, 5, r.Gudang, "left");
    ksCell(ws, row, 6, r.ShipAddress || "-", "left");
    ksCell(ws, row, 7, r.Memo || "-", "left");
    ksCell(ws, row, 8, r.Closed, "center");
    ksCell(ws, row, 9, r.Invoice, "center");
    ksCell(ws, row, 10, r.UserCreate, "center");
    ksCell(ws, row, 11, r.DateCreate, "center");
    row.height = 16;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 11; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 4, "TOTAL DO", "right", true);
  ksNum(ws, foot, 1, rows.length, true);
  foot.height = 18;

  const widths = [18, 12, 14, 26, 16, 26, 26, 10, 10, 14, 18];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `DO_${periodeName(startDate, endDate)}.xlsx`);
};

interface DoDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  NoSO: string;
  Customer: string;
  Gudang: string;
  ShipAddress: string;
  Memo: string;
  Closed: string;
  Invoice: string;
  UserCreate: string;
  DateCreate: string;
  NoUrut: number;
  Kode: string | number;
  Nama: string;
  Satuan: string;
  Qty: number;
  TglExpired: string;
  QtyInvoice: number;
  Status: number;
}

export const exportDoDetail = async (
  rows: DoDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("DO Detail");

  ws.mergeCells("A1:S1");
  ws.getCell("A1").value = `Browse DO — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "No. SO",
    "Customer",
    "Gudang",
    "Ship Address",
    "Memo",
    "Closed",
    "Invoice",
    "User Create",
    "Date Create",
    "No Urut",
    "Kode Barang",
    "Nama Barang",
    "Satuan",
    "Jumlah",
    "Expired",
    "Qty Invoice",
    "Status",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalQty = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    // Kolom header hanya di baris pertama tiap nomor; baris item ke-2+ kosong
    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.NoSO || "-", "center");
      ksCell(ws, row, 4, r.Customer, "left");
      ksCell(ws, row, 5, r.Gudang, "left");
      ksCell(ws, row, 6, r.ShipAddress || "-", "left");
      ksCell(ws, row, 7, r.Memo || "-", "left");
      ksCell(ws, row, 8, r.Closed, "center");
      ksCell(ws, row, 9, r.Invoice, "center");
      ksCell(ws, row, 10, r.UserCreate, "center");
      ksCell(ws, row, 11, r.DateCreate, "center");
    }

    ksCell(ws, row, 12, r.NoUrut, "center");
    ksCell(ws, row, 13, r.Kode, "center");
    ksCell(ws, row, 14, r.Nama, "left");
    ksCell(ws, row, 15, r.Satuan, "center");
    ksNum(ws, row, 16, r.Qty);
    ksCell(ws, row, 17, ksDate(r.TglExpired), "center");
    ksNum(ws, row, 18, r.QtyInvoice || 0);
    ksNum(ws, row, 19, r.Status || 0);
    totalQty += Number(r.Qty || 0);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 19; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 13, "TOTAL QTY", "right", true);
  ksNum(ws, foot, 16, totalQty, true);
  foot.height = 18;

  const widths = [18, 12, 14, 22, 14, 22, 26, 9, 9, 12, 16, 8, 12, 26, 10, 10, 12, 12, 8];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `DO_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Faktur Penjualan (FP) — Export & Export Detail ──────────────────────
// Pola sama persis dengan exportDo/exportDoDetail di atas: EXPORT untuk
// master saja, EXPORT DETAIL untuk master + item flatten (1 baris = 1 item).
interface FpHeaderRow {
  Nomor: string;
  Tanggal: string;
  JthTempo: string;
  Memo: string;
  Tax: string;
  Salesman: string;
  Kode_Cust: string;
  Customer: string;
  Total: number;
  Ppn: number;
  Disc_Faktur: number;
  Biaya_Promosi: number;
  Kontrak: number;
  Freight: number;
  Bayar: number;
  Status_Bayar: string;
  Kembali: number;
  Retur: number;
  Keterangan: string;
  status_faktur: string;
}

export const exportFp = async (
  rows: FpHeaderRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Faktur Penjualan");

  ws.mergeCells("A1:T1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(startDate, endDate)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jth Tempo",
    "Memo",
    "Tax",
    "Salesman",
    "Kode Cust",
    "Customer",
    "Total",
    "Ppn",
    "Disc Faktur",
    "Biaya Promosi",
    "Kontrak",
    "Freight",
    "Bayar",
    "Status Bayar",
    "Kembali",
    "Retur",
    "Keterangan",
    "Status Faktur",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalAmount = 0;
  let totalPpn = 0;
  let totalBayar = 0;
  let totalRetur = 0;
  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.Nomor, "center", true);
    ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
    ksCell(ws, row, 3, ksDate(r.JthTempo), "center");
    ksCell(ws, row, 4, r.Memo || "-", "left");
    ksCell(ws, row, 5, r.Tax, "center");
    ksCell(ws, row, 6, r.Salesman, "center");
    ksCell(ws, row, 7, r.Kode_Cust, "center");
    ksCell(ws, row, 8, r.Customer, "left");
    ksNum(ws, row, 9, r.Total);
    ksNum(ws, row, 10, r.Ppn);
    ksNum(ws, row, 11, r.Disc_Faktur || 0);
    ksNum(ws, row, 12, r.Biaya_Promosi || 0);
    ksNum(ws, row, 13, r.Kontrak || 0);
    ksNum(ws, row, 14, r.Freight || 0);
    ksNum(ws, row, 15, r.Bayar || 0);
    ksCell(ws, row, 16, r.Status_Bayar, "center");
    ksNum(ws, row, 17, r.Kembali || 0);
    ksNum(ws, row, 18, r.Retur || 0);
    ksCell(ws, row, 19, r.Keterangan || "-", "left");
    ksCell(ws, row, 20, r.status_faktur, "center");
    row.height = 16;

    totalAmount += Number(r.Total || 0);
    totalPpn += Number(r.Ppn || 0);
    totalBayar += Number(r.Bayar || 0);
    totalRetur += Number(r.Retur || 0);
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 20; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 8, "TOTAL", "right", true);
  ksNum(ws, foot, 9, totalAmount, true);
  ksNum(ws, foot, 10, totalPpn, true);
  ksNum(ws, foot, 15, totalBayar, true);
  ksNum(ws, foot, 18, totalRetur, true);
  foot.height = 18;

  const widths = [18, 12, 12, 24, 8, 12, 12, 26, 16, 14, 14, 14, 12, 12, 16, 12, 10, 14, 20, 12];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `FakturPenjualan_${periodeName(startDate, endDate)}.xlsx`);
};

interface FpDetailFlatRow extends FpHeaderRow {
  NoUrut: number;
  Kode: string | number;
  Nama: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
  KontrakItem: number;
}

export const exportFpDetail = async (
  rows: FpDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("FP Detail");

  ws.mergeCells("A1:AC1");
  ws.getCell("A1").value = `Browse Faktur Penjualan — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Jth Tempo",
    "Memo",
    "Tax",
    "Salesman",
    "Kode Cust",
    "Customer",
    "Total",
    "Ppn",
    "Disc Faktur",
    "Biaya Promosi",
    "Kontrak",
    "Freight",
    "Bayar",
    "Status Bayar",
    "Kembali",
    "Retur",
    "Keterangan",
    "Status Faktur",
    "No Urut",
    "Kode Barang",
    "Nama Barang",
    "Satuan",
    "Jumlah",
    "Harga",
    "Disc %",
    "Nilai",
    "Kontrak Item",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalQty = 0;
  let totalNilai = 0;
  let totalKontrakItem = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    // Kolom header hanya di baris pertama tiap nomor; baris item ke-2+ kosong
    // (pola sama dengan exportDoDetail).
    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, ksDate(r.JthTempo), "center");
      ksCell(ws, row, 4, r.Memo || "-", "left");
      ksCell(ws, row, 5, r.Tax, "center");
      ksCell(ws, row, 6, r.Salesman, "center");
      ksCell(ws, row, 7, r.Kode_Cust, "center");
      ksCell(ws, row, 8, r.Customer, "left");
      ksNum(ws, row, 9, r.Total);
      ksNum(ws, row, 10, r.Ppn);
      ksNum(ws, row, 11, r.Disc_Faktur || 0);
      ksNum(ws, row, 12, r.Biaya_Promosi || 0);
      ksNum(ws, row, 13, r.Kontrak || 0);
      ksNum(ws, row, 14, r.Freight || 0);
      ksNum(ws, row, 15, r.Bayar || 0);
      ksCell(ws, row, 16, r.Status_Bayar, "center");
      ksNum(ws, row, 17, r.Kembali || 0);
      ksNum(ws, row, 18, r.Retur || 0);
      ksCell(ws, row, 19, r.Keterangan || "-", "left");
      ksCell(ws, row, 20, r.status_faktur, "center");
    }

    const nilai = Number(r.Qty || 0) * Number(r.Harga || 0) * (1 - Number(r.DiscPr || 0) / 100);
    ksCell(ws, row, 21, r.NoUrut, "center");
    ksCell(ws, row, 22, r.Kode, "center");
    ksCell(ws, row, 23, r.Nama, "left");
    ksCell(ws, row, 24, r.Satuan, "center");
    ksNum(ws, row, 25, r.Qty);
    ksNum(ws, row, 26, r.Harga);
    ksNum(ws, row, 27, r.DiscPr || 0);
    ksNum(ws, row, 28, nilai);
    ksNum(ws, row, 29, r.KontrakItem || 0);
    row.height = 16;

    totalQty += Number(r.Qty || 0);
    totalNilai += nilai;
    totalKontrakItem += Number(r.KontrakItem || 0);
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 29; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 23, "TOTAL", "right", true);
  ksNum(ws, foot, 25, totalQty, true);
  ksNum(ws, foot, 28, totalNilai, true);
  ksNum(ws, foot, 29, totalKontrakItem, true);
  foot.height = 18;

  const widths = [
    18, 12, 12, 20, 8, 12, 12, 22, 16, 14, 12, 12, 10, 10, 14, 12, 10, 12, 18, 12,
    8, 12, 24, 10, 10, 12, 8, 14, 12,
  ];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `FakturPenjualan_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Faktur Pajak (tfakturpajak_hdr) — browse master & detail ─────────────
interface FakturPajakHeaderRow {
  Nomor: string;
  Tanggal: string;
  Memo: string;
  Salesman: string;
  Kode_Cust: string;
  Customer: string;
  Total: number;
  Ppn: number;
  Disc_Faktur: number;
  FakturPajak: string;
  TglPajak: string;
  IsManual: number;
  DateCreate: string;
}

export const exportFakturPajak = async (
  rows: FakturPajakHeaderRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("Faktur Pajak");

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = `Tanggal  : ${periodeLabel(startDate, endDate)}`;
  ws.getCell("A1").font = { size: 10, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Memo",
    "Salesman",
    "Kode Cust",
    "Customer",
    "Total",
    "Ppn",
    "Disc Faktur",
    "Nomor Seri",
    "Tgl Pajak",
    "Manual",
    "Date Create",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalAmount = 0;
  let totalPpn = 0;
  for (const r of rows) {
    const row = ws.addRow([]);
    ksCell(ws, row, 1, r.Nomor, "center", true);
    ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
    ksCell(ws, row, 3, r.Memo || "-", "left");
    ksCell(ws, row, 4, r.Salesman, "center");
    ksCell(ws, row, 5, r.Kode_Cust, "center");
    ksCell(ws, row, 6, r.Customer, "left");
    ksNum(ws, row, 7, r.Total);
    ksNum(ws, row, 8, r.Ppn);
    ksNum(ws, row, 9, r.Disc_Faktur || 0);
    ksCell(ws, row, 10, r.FakturPajak || "-", "center");
    ksCell(ws, row, 11, ksDate(r.TglPajak), "center");
    ksCell(ws, row, 12, Number(r.IsManual) > 0 ? "Ya" : "-", "center");
    ksCell(ws, row, 13, r.DateCreate || "-", "center");
    row.height = 16;

    totalAmount += Number(r.Total || 0);
    totalPpn += Number(r.Ppn || 0);
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 13; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 6, "TOTAL", "right", true);
  ksNum(ws, foot, 7, totalAmount, true);
  ksNum(ws, foot, 8, totalPpn, true);
  foot.height = 18;

  const widths = [18, 12, 24, 12, 12, 26, 16, 14, 14, 16, 12, 8, 18];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `FakturPajak_${periodeName(startDate, endDate)}.xlsx`);
};

interface FakturPajakDetailFlatRow extends FakturPajakHeaderRow {
  NoUrut: number;
  Kode: string | number;
  Nama: string;
  Satuan: string;
  Qty: number;
  Harga: number;
  DiscPr: number;
  Expired: string;
  Cnp: number;
}

export const exportFakturPajakDetail = async (
  rows: FakturPajakDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("FPajak Detail");

  ws.mergeCells("A1:W1");
  ws.getCell("A1").value = `Browse Faktur Pajak — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Memo",
    "Salesman",
    "Kode Cust",
    "Customer",
    "Total",
    "Ppn",
    "Disc Faktur",
    "Nomor Seri",
    "Tgl Pajak",
    "Manual",
    "Date Create",
    "No Urut",
    "Kode Barang",
    "Nama Barang",
    "Satuan",
    "Jumlah",
    "Harga",
    "Disc %",
    "Nilai",
    "Expired",
    "Nilai CN",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalQty = 0;
  let totalNilai = 0;
  let totalCnp = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    // Kolom header hanya di baris pertama tiap nomor; baris item ke-2+ kosong
    // (pola sama dengan exportDoDetail / exportFpDetail).
    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.Memo || "-", "left");
      ksCell(ws, row, 4, r.Salesman, "center");
      ksCell(ws, row, 5, r.Kode_Cust, "center");
      ksCell(ws, row, 6, r.Customer, "left");
      ksNum(ws, row, 7, r.Total);
      ksNum(ws, row, 8, r.Ppn);
      ksNum(ws, row, 9, r.Disc_Faktur || 0);
      ksCell(ws, row, 10, r.FakturPajak || "-", "center");
      ksCell(ws, row, 11, ksDate(r.TglPajak), "center");
      ksCell(ws, row, 12, Number(r.IsManual) > 0 ? "Ya" : "-", "center");
      ksCell(ws, row, 13, r.DateCreate || "-", "center");
    }

    const nilai = Number(r.Qty || 0) * Number(r.Harga || 0) * (1 - Number(r.DiscPr || 0) / 100);
    ksCell(ws, row, 14, r.NoUrut, "center");
    ksCell(ws, row, 15, r.Kode, "center");
    ksCell(ws, row, 16, r.Nama, "left");
    ksCell(ws, row, 17, r.Satuan, "center");
    ksNum(ws, row, 18, r.Qty);
    ksNum(ws, row, 19, r.Harga);
    ksNum(ws, row, 20, r.DiscPr || 0);
    ksNum(ws, row, 21, nilai);
    ksCell(ws, row, 22, ksDate(r.Expired), "center");
    ksNum(ws, row, 23, r.Cnp || 0);
    row.height = 16;

    totalQty += Number(r.Qty || 0);
    totalNilai += nilai;
    totalCnp += Number(r.Cnp || 0);
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 23; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 16, "TOTAL", "right", true);
  ksNum(ws, foot, 18, totalQty, true);
  ksNum(ws, foot, 21, totalNilai, true);
  ksNum(ws, foot, 23, totalCnp, true);
  foot.height = 18;

  const widths = [
    18, 12, 20, 12, 12, 22, 16, 14, 12, 16, 12, 8, 18,
    8, 10, 30, 10, 10, 12, 8, 14, 12, 12,
  ];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `FakturPajak_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Rekap Permintaan Bahan (dipakai RekapPermintaanBahanView.vue) ──
export const exportRekapPermintaanBahan = async (items: any[]): Promise<boolean> => {
  // Estimasi Cukup = stok ÷ laju pemakaian produksi (dijelaskan di kolom
  // keterangan pada layar). Dibuat sebagai teks "x bln (~y hari)".
  const rows = items.map((r) => {
    const bulan = r.estimasiBulan;
    const estimasi =
      bulan === null || bulan === undefined
        ? "—"
        : `${Number(bulan).toLocaleString("id-ID", { maximumFractionDigits: 1 })} bln (~${r.estimasiHari} hari)`;
    return { ...r, estimasi };
  });

  await exportToExcel({
    title: "Rekap Permintaan Bahan",
    filenamePrefix: "RekapPermintaanBahan",
    sheetName: "Rekap Permintaan Bahan",
    columns: [
      { header: "Kategori", key: "kategori", width: 18 },
      { header: "Kode", key: "kode", width: 10, align: "center" },
      { header: "Nama Bahan", key: "nama", width: 32 },
      { header: "Satuan", key: "satuan", width: 9, align: "center" },
      { header: "Supplier", key: "supplier", width: 24 },
      { header: "Permintaan (SO)", key: "kebutuhan", width: 14, align: "right" },
      { header: "Stok", key: "stok", width: 12, align: "right" },
      { header: "Pakai Produksi /Bln", key: "pakaiBln", width: 16, align: "right" },
      { header: "Estimasi Cukup", key: "estimasi", width: 18, align: "center" },
      { header: "Status", key: "status", width: 14, align: "center" },
      { header: "Sisa", key: "sisa", width: 12, align: "right" },
      { header: "PO Pending", key: "poPending", width: 12, align: "right" },
      { header: "Usulan Order", key: "order", width: 12, align: "right" },
      { header: "Avg Out /Bln", key: "avgOut", width: 12, align: "right" },
    ],
    rows,
  });
  return true;
};

// ── Dashboard Estimasi Stok Bahan Produksi (dipakai DashboardEstimasiBahan.vue) ──
export const exportEstimasiBahan = async (items: any[]): Promise<boolean> => {
  const rows = items.map((r) => {
    const bulan = r.estimasiBulan;
    const estimasi =
      bulan === null || bulan === undefined
        ? "—"
        : `${Number(bulan).toLocaleString("id-ID", { maximumFractionDigits: 1 })} bln (~${r.estimasiHari} hari)`;
    const saldo = Number(r.saldo);
    return { ...r, estimasi, saldoTeks: saldo < 0 ? saldo.toLocaleString("id-ID") : r.saldo };
  });

  await exportToExcel({
    title: "Estimasi Stok Bahan Produksi",
    filenamePrefix: "EstimasiStokProduksi",
    sheetName: "Estimasi Stok Produksi",
    columns: [
      { header: "Kode", key: "kode", width: 10, align: "center" },
      { header: "Nama Bahan", key: "nama", width: 36 },
      { header: "Kategori", key: "kategori", width: 16 },
      { header: "Hbeli", key: "hrgBeli", width: 12, align: "right" },
      { header: "Awal", key: "awal", width: 10, align: "right" },
      { header: "Masuk", key: "masuk", width: 10, align: "right" },
      { header: "Keluar", key: "keluar", width: 10, align: "right" },
      { header: "Saldo", key: "saldo", width: 12, align: "right" },
      { header: "Saldo GD-01", key: "saldoProduksi", width: 12, align: "right" },
      { header: "Pakai /Bln", key: "pakaiBln", width: 14, align: "right" },
      { header: "Estimasi Cukup", key: "estimasi", width: 18, align: "center" },
      { header: "Status", key: "status", width: 14, align: "center" },
    ],
    rows,
  });
  return true;
};

// ── Laporan Produksi Operator (dipakai LaporanProduksiView.vue) ──
export const exportLaporanProduksi = async (
  rows: Array<{
    tanggal: string;
    lhkNomor: string;
    spkNomor: string;
    brgKode: string;
    produk: string;
    satuan: string;
    nik: string;
    nama: string;
    memo: string;
    dept: string;
    unit: string;
    mesin: string;
    qty: number;
  }>,
  periodeLabel: string,
): Promise<boolean> => {
  await exportToExcel({
    title: `Laporan Produksi Operator - ${periodeLabel}`,
    filenamePrefix: "LaporanProduksiOperator",
    sheetName: "Produksi Operator",
    columns: [
      { header: "Tanggal", key: "tanggal", width: 12, align: "center" },
      { header: "No. LHK", key: "lhkNomor", width: 18 },
      { header: "No. SPK", key: "spkNomor", width: 18 },
      { header: "Kode", key: "brgKode", width: 12 },
      { header: "Produk", key: "produk", width: 32 },
      { header: "Satuan", key: "satuan", width: 10, align: "center" },
      { header: "Operator", key: "nama", width: 22 },
      { header: "NIK", key: "nik", width: 14, align: "center" },
      { header: "Memo", key: "memo", width: 24 },
      { header: "Departemen", key: "dept", width: 16 },
      { header: "Unit", key: "unit", width: 24 },
      { header: "Mesin", key: "mesin", width: 14 },
      { header: "Qty", key: "qty", width: 12, align: "right" },
    ],
    rows,
  });
  return true;
};

// ── Browse SPK — Export Detail (1 baris = 1 tahap tspk_dtl) ────────────
interface SpkDetailFlatRow {
  Nomor: string;
  Nama: string;
  Tanggal: string;
  DateLine: string;
  KodeBarang: string;
  Barang: string;
  Customer: string;
  IdBatch: string;
  Target: number;
  Jadi: number;
  Status: string;
  Urutan: number;
  Tahap: string;
  TargetTahap: number;
  Selesai: number;
  Finalisasi: string;
}

export const exportSpkDetail = async (
  rows: SpkDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("SPK Detail");

  ws.mergeCells("A1:P1");
  ws.getCell("A1").value = `Browse SPK — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Nama SPK",
    "Tanggal",
    "Dateline",
    "Kode",
    "Barang",
    "Customer",
    "Id Batch",
    "Target",
    "Jadi",
    "Status",
    "Urutan",
    "Tahap",
    "Target Tahap",
    "Selesai",
    "Finalisasi",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalTarget = 0;
  let totalJadi = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, r.Nama, "left");
      ksCell(ws, row, 3, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 4, ksDate(r.DateLine), "center");
      ksCell(ws, row, 5, r.KodeBarang, "center");
      ksCell(ws, row, 6, r.Barang, "left");
      ksCell(ws, row, 7, r.Customer || "-", "left");
      ksCell(ws, row, 8, r.IdBatch, "center");
      ksNum(ws, row, 9, r.Target);
      ksNum(ws, row, 10, r.Jadi);
      ksCell(ws, row, 11, r.Status, "center");
      totalTarget += Number(r.Target || 0);
      totalJadi += Number(r.Jadi || 0);
    }

    ksNum(ws, row, 12, r.Urutan);
    ksCell(ws, row, 13, r.Tahap, "left");
    ksNum(ws, row, 14, r.TargetTahap);
    ksNum(ws, row, 15, r.Selesai);
    ksCell(ws, row, 16, r.Finalisasi, "center");
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 16; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 8, "TOTAL", "right", true);
  ksNum(ws, foot, 9, totalTarget, true);
  ksNum(ws, foot, 10, totalJadi, true);
  foot.height = 18;

  const widths = [18, 26, 12, 12, 10, 26, 20, 14, 10, 10, 10, 8, 18, 11, 11, 10];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `SPK_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse LHK — Export (master saja) ──────────────────────────────────
export const exportLhk = async (
  rows: Array<{
    Nomor: string;
    Tanggal: string;
    Periode: string;
    SpkNomor: string;
    SpkNama: string;
    KodeBarang: string;
    Barang: string;
    Satuan?: string;
    Tahap: string;
    Urutan?: number;
    TahapView?: string;
    MasterProses?: string;
    Jumlah: number;
    BS?: number;
    TotalJumlah?: number;
    StokDiproses: string;
    IsFinalisasi?: number;
    UserCreate?: string;
    UserModified?: string;
    DateCreate?: string;
    DateModified?: string;
  }>,
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  await exportToExcel({
    title: `Laporan Harian Kerja (LHK) — Detail (Periode : ${periodeLabel(startDate, endDate)})`,
    filenamePrefix: "LHK",
    sheetName: "LHK",
    columns: [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Periode", key: "Periode", width: 12, align: "center" },
      { header: "No. SPK", key: "SpkNomor", width: 16 },
      { header: "Nama SPK", key: "SpkNama", width: 26 },
      { header: "Kode", key: "KodeBarang", width: 10, align: "center" },
      { header: "Barang", key: "Barang", width: 28 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      // ⬅️ BARU (2026-10-13): Master Proses + Tahap bernomor urut, mengikuti
      // grid browse. Kolom "Tahap" (nama saja) + "Urutan" digabung jadi satu
      // kolom "Tahap" berisi "2. Coding + Packing Sekunder" supaya urutan
      // tahap langsung terbaca.
      { header: "Master Proses", key: "MasterProses", width: 18 },
      { header: "Tahap", key: "TahapView", width: 26 },
      { header: "Jumlah", key: "Jumlah", width: 12, align: "right" },
      { header: "BS", key: "BS", width: 8, align: "right" },
      {
        header: "Finalisasi",
        key: "__final",
        width: 12,
        align: "center",
        map: (r: any) => (Number(r.IsFinalisasi) === 1 ? "Sudah" : "-"),
      },
      {
        header: "User",
        key: "__user",
        width: 22,
        map: (r: any) => userCellText(r),
      },
    ],
    rows,
  });
  return true;
};

// ── Browse LHK — Export Detail (1 baris = 1 operator/mesin tlhk_dtl) ───
interface LhkDetailFlatRow {
  Nomor: string;
  Tanggal: string;
  Periode: string;
  SpkNomor: string;
  SpkNama: string;
  KodeBarang: string;
  Barang: string;
  Tahap: string;
  Urutan?: number;
  Jumlah: number;
  Keterangan: string;
  StokDiproses: string;
  Mesin: string;
  Operator: string;
  OperatorNik?: string;
  OperatorDept?: string;
  OperatorUnit?: string;
  JumlahLaporkan: number;
}

export const exportLhkDetail = async (
  rows: LhkDetailFlatRow[],
  startDate?: string,
  endDate?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("LHK Detail");

  // 18 kolom (kolom Jabatan dihapus 2026-10-10 -> merge jadi A1:S1)
  ws.mergeCells("A1:S1");
  ws.getCell("A1").value = `Browse LHK — Detail (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Periode",
    "No. SPK",
    "Nama SPK",
    "Kode",
    "Barang",
    "Tahap",
    "Urutan",
    "Jumlah",
    "Keterangan",
    "Finalisasi",
    "Mesin",
    "Operator",
    "NIK",
    "Departemen",
    "Unit",
    "Jumlah Laporkan",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalLaporkan = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.Periode, "center");
      ksCell(ws, row, 4, r.SpkNomor, "left");
      ksCell(ws, row, 5, r.SpkNama || "-", "left");
      ksCell(ws, row, 6, r.KodeBarang, "center");
      ksCell(ws, row, 7, r.Barang, "left");
      ksCell(ws, row, 8, r.Tahap, "left");
      ksNum(ws, row, 9, Number(r.Urutan || 0));
      ksNum(ws, row, 10, r.Jumlah);
      ksCell(ws, row, 11, r.Keterangan || "", "left");
      ksCell(ws, row, 12, r.StokDiproses, "center");
    }

    ksCell(ws, row, 13, r.Mesin || "-", "center");
    ksCell(ws, row, 14, r.Operator, "left");
    ksCell(ws, row, 15, r.OperatorNik || "-", "center");
    ksCell(ws, row, 16, r.OperatorDept || "-", "left");
    ksCell(ws, row, 17, r.OperatorUnit || "-", "left");
    ksNum(ws, row, 18, r.JumlahLaporkan);
    totalLaporkan += Number(r.JumlahLaporkan || 0);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 18; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 13, "TOTAL LAPORAN", "right", true);
  ksNum(ws, foot, 18, totalLaporkan, true);
  foot.height = 18;

  // 18 kolom (Jabatan dihapus). Lebar ikut digeser: kolom 16 sekarang
  // Departemen, 17 Unit, 18 Jumlah Laporkan.
  const widths = [18, 12, 12, 14, 26, 10, 26, 16, 8, 11, 20, 11, 12, 20, 12, 14, 20, 13];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `LHK_Detail_${periodeName(startDate, endDate)}.xlsx`);
};

// ── Browse LHK — Export Selection (1 baris = 1 operator/mesin, DIFILTER memo) ──
// Sama seperti Export Detail, tapi hanya baris rincian yang memo-nya dipilih
// user (mis. "Operator Produksi" / "Borongan Masker & Gloves"). Kolom MEMO
// ikut ditampilkan supaya hasil rekapan per memo langsung terbaca.
interface LhkSelectionFlatRow {
  Nomor: string;
  Tanggal: string;
  Periode: string;
  SpkNomor: string;
  SpkNama: string;
  KodeBarang: string;
  Barang: string;
  Tahap: string;
  Urutan?: number;
  Jumlah: number;
  Memo: string;
  Keterangan: string;
  StokDiproses: string;
  Mesin: string;
  Operator: string;
  OperatorNik?: string;
  OperatorDept?: string;
  OperatorUnit?: string;
  JumlahLaporkan: number;
}

export const exportLhkSelection = async (
  rows: LhkSelectionFlatRow[],
  startDate?: string,
  endDate?: string,
  memoLabel?: string,
): Promise<boolean> => {
  const ws = new ExcelJS.Workbook().addWorksheet("LHK Selection");

  // 19 kolom (A..S) — beda dari Export Detail: ada kolom MEMO yang dicetak
  // PER BARIS operator (karena satu LHK bisa punya >1 memo).
  ws.mergeCells("A1:S1");
  ws.getCell("A1").value = `Browse LHK — Selection Memo : ${
    memoLabel || "Semua"
  } (Periode : ${periodeLabel(startDate, endDate)})`;
  ws.getCell("A1").font = { size: 10, bold: true, name: "Arial" };
  ws.addRow([]);

  const cols = [
    "Nomor",
    "Tanggal",
    "Periode",
    "No. SPK",
    "Nama SPK",
    "Kode",
    "Barang",
    "Tahap",
    "Urutan",
    "Jumlah",
    "Keterangan",
    "Finalisasi",
    "Memo",
    "Mesin",
    "Operator",
    "NIK",
    "Departemen",
    "Unit",
    "Jumlah Laporkan",
  ];
  ksHeader(ws, ws.addRow(cols), cols);

  let totalLaporkan = 0;
  let lastNomor: string | null = null;
  for (const r of rows) {
    const row = ws.addRow([]);
    // Info LHK (header) ditulis sekali per nomor LHK — baris sudah diurutkan
    // per SPK lalu per nomor LHK di frontend. Memo TIDAK di sini karena satu
    // LHK bisa punya lebih dari satu memo.
    const isRepeat = r.Nomor === lastNomor;

    if (!isRepeat) {
      ksCell(ws, row, 1, r.Nomor, "left", true);
      ksCell(ws, row, 2, ksDate(r.Tanggal), "center");
      ksCell(ws, row, 3, r.Periode, "center");
      ksCell(ws, row, 4, r.SpkNomor, "left");
      ksCell(ws, row, 5, r.SpkNama || "-", "left");
      ksCell(ws, row, 6, r.KodeBarang, "center");
      ksCell(ws, row, 7, r.Barang, "left");
      ksCell(ws, row, 8, r.Tahap, "left");
      ksNum(ws, row, 9, Number(r.Urutan || 0));
      ksNum(ws, row, 10, r.Jumlah);
      ksCell(ws, row, 11, r.Keterangan || "", "left");
      ksCell(ws, row, 12, r.StokDiproses, "center");
    }

    // Bagian rincian operator — selalu ditulis (termasuk Memo per baris).
    ksCell(ws, row, 13, r.Memo || "-", "left");
    ksCell(ws, row, 14, r.Mesin || "-", "center");
    ksCell(ws, row, 15, r.Operator, "left");
    ksCell(ws, row, 16, r.OperatorNik || "-", "center");
    ksCell(ws, row, 17, r.OperatorDept || "-", "left");
    ksCell(ws, row, 18, r.OperatorUnit || "-", "left");
    ksNum(ws, row, 19, r.JumlahLaporkan);
    totalLaporkan += Number(r.JumlahLaporkan || 0);
    row.height = 16;
    lastNomor = r.Nomor;
  }

  const foot = ws.addRow([]);
  for (let c = 1; c <= 19; c++) {
    foot.getCell(c).border = kartuStokBorder;
    foot.getCell(c).fill = kartuStokTotalFill;
  }
  ksCell(ws, foot, 18, "TOTAL LAPORAN", "right", true);
  ksNum(ws, foot, 19, totalLaporkan, true);
  foot.height = 18;

  const widths = [18, 12, 12, 14, 26, 10, 26, 16, 8, 11, 20, 11, 24, 12, 20, 12, 14, 20, 13];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await ws.workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await promptSaveAs(blob, `LHK_Selection_${periodeName(startDate, endDate)}.xlsx`);
};
