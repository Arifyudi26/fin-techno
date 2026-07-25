/**
 * Dashboard → Excel (.xlsx)
 * Uses ExcelJS — supports embedded chart images.
 *
 * Sheets:
 *  1. Ringkasan      — 5 metric cards + rekening & dompet
 *  2. Cash Flow      — tabel per periode + bar chart embed
 *  3. Net Flow Trend — tabel tren + bar chart embed
 *  4. Kategori       — tabel pengeluaran & pemasukan + 2 donut chart embed
 *  5. Transaksi      — semua transaksi
 */

import ExcelJS from "exceljs";
import {
  ExportPayload,
  buildCanonicalData,
  renderBarChartPng,
  renderDonutChartPng,
} from "./exportHelpers";

// Color palette (ARGB) 
const P = {
  brand:   "FF465FFF",
  success: "FF12B76A",
  danger:  "FFF04438",
  warn:    "FFF79009",
  purple:  "FF7C3AED",
  white:   "FFFFFFFF",
  dark:    "FF1A1A2E",
  gray:    "FF667085",
  rowEven: "FFF8F9FF",
  hdrBg:   "FFE8EAFF",
};

const colorOf = (key: string) =>
  ({ success: P.success, danger: P.danger, brand: P.brand, warn: P.warn, purple: P.purple }[key] ?? P.brand);

// Style factories 

type Fill = ExcelJS.Fill;
type Font = Partial<ExcelJS.Font>;

const solidFill = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

const hdrStyle = (bgArgb = P.brand): Partial<ExcelJS.Style> => ({
  font:      { bold: true, color: { argb: P.white }, size: 10 },
  fill:      solidFill(bgArgb),
  alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  border:    { bottom: { style: "thin", color: { argb: "FFD0D5FF" } } },
});

const titleStyle = (): Partial<ExcelJS.Style> => ({
  font:      { bold: true, size: 13, color: { argb: P.dark } },
  fill:      solidFill(P.hdrBg),
  alignment: { vertical: "middle" },
});

const metaFont: Font = { size: 9, color: { argb: P.gray } };

const dataStyle = (even: boolean): Partial<ExcelJS.Style> => ({
  fill:      solidFill(even ? P.rowEven : P.white),
  alignment: { vertical: "middle" },
  font:      { size: 9 },
});

const numStyle = (even: boolean, colorArgb?: string): Partial<ExcelJS.Style> => ({
  ...dataStyle(even),
  numFmt:    '#,##0',
  font:      { size: 9, bold: true, color: colorArgb ? { argb: colorArgb } : undefined },
  alignment: { vertical: "middle", horizontal: "right" },
});

// pct: nilai sudah dalam bentuk 45.2 (bukan 0.452), tampilkan sebagai "45.2%"
const pctStyle = (even: boolean): Partial<ExcelJS.Style> => ({
  ...dataStyle(even),
  numFmt:    '0.0"%"',   // literal % — tidak kalikan ×100, cocok untuk nilai 45.2
  alignment: { vertical: "middle", horizontal: "right" },
});

// Worksheet helpers 

function addTitle(ws: ExcelJS.Worksheet, text: string, span: number, row = 1) {
  ws.mergeCells(row, 1, row, span);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.style = titleStyle();
  ws.getRow(row).height = 28;
}

function addMeta(ws: ExcelJS.Worksheet, label: string, val: string, rowNum: number, span: number) {
  const row = ws.getRow(rowNum);
  row.height = 16;
  row.getCell(1).value = label;
  row.getCell(1).style = { font: metaFont };
  ws.mergeCells(rowNum, 2, rowNum, span);
  row.getCell(2).value = val;
  row.getCell(2).style = { font: metaFont };
}

function addSectionHeader(ws: ExcelJS.Worksheet, text: string, span: number): ExcelJS.Row {
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, span);
  r.getCell(1).style = { font: { bold: true, size: 11, color: { argb: P.brand } } };
  r.height = 20;
  return r;
}

function applyHdr(row: ExcelJS.Row, bgArgb = P.brand) {
  row.eachCell({ includeEmpty: true }, (c) => { c.style = hdrStyle(bgArgb); });
  row.height = 20;
}

/**
 * Embed PNG image ke worksheet.
 * ExcelJS addImage tl/br pakai 0-based row index.
 * row.number dari ExcelJS adalah 1-based → kurangi 1 untuk tl.
 * imgHeightRows = jumlah baris yang ingin diisi gambar.
 */
function embedImage(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  png: string,
  anchorRow: ExcelJS.Row,   // baris tempat gambar dimulai (1-based)
  colStart: number,          // 0-based col start
  colEnd: number,            // 0-based col end (exclusive)
  imgHeightRows: number,     // tinggi gambar dalam satuan baris
) {
  const imgId = wb.addImage({
    base64: png.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });
  // tl.row = 0-based → anchorRow.number - 1
  const tlRow = anchorRow.number - 1;
  // ExcelJS accepts simple {col, row} format at runtime despite stricter type definition
  ws.addImage(imgId, {
    tl: { col: colStart, row: tlRow } as ExcelJS.Anchor,
    br: { col: colEnd,   row: tlRow + imgHeightRows } as ExcelJS.Anchor,
  });
  // Reserve baris agar konten di bawah tidak overlap
  for (let i = 0; i < imgHeightRows; i++) ws.addRow([]).height = 18;
}

// Main export 

export async function exportDashboardExcel(payload: ExportPayload) {
  const d  = buildCanonicalData(payload);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fin-Techno";
  wb.created = new Date();

  // SHEET 1 — Ringkasan
  {
    const ws = wb.addWorksheet("Ringkasan");
    ws.columns = [
      { width: 28 }, { width: 24 }, { width: 16 }, { width: 24 }, { width: 14 },
    ];

    addTitle(ws, "LAPORAN KEUANGAN DASHBOARD", 5);
    addMeta(ws, "Filter",     d.filterLabel, 2, 5);
    addMeta(ws, "Digenerate", d.generatedAt, 3, 5);
    ws.addRow([]);

    addSectionHeader(ws, "RINGKASAN METRIK", 5);
    const mHdr = ws.addRow(["Metrik", "Nilai", "Perubahan", "", ""]);
    applyHdr(mHdr);

    d.metrics.forEach((m, i) => {
      const r = ws.addRow([m.label, m.value, m.change]);
      r.height = 18;
      r.getCell(1).style = { ...dataStyle(i % 2 === 0), font: { size: 9, bold: true } };
      // Jumlah Transaksi (purple) bukan currency
      r.getCell(2).style = m.colorKey === "purple"
        ? { ...dataStyle(i % 2 === 0), numFmt: "#,##0", font: { size: 9, bold: true, color: { argb: colorOf(m.colorKey) } }, alignment: { horizontal: "right" } }
        : numStyle(i % 2 === 0, colorOf(m.colorKey));
      r.getCell(3).style = {
        ...dataStyle(i % 2 === 0),
        font: { size: 9, bold: true, color: { argb: m.up ? P.success : P.danger } },
      };
    });

    ws.addRow([]);
    addSectionHeader(ws, "REKENING & DOMPET", 5);
    const aHdr = ws.addRow(["Bank / Provider", "No. Rekening", "Nama", "Saldo", "Tipe"]);
    applyHdr(aHdr);

    d.accounts.forEach((a, i) => {
      const r = ws.addRow([a.provider, a.number, a.name, a.balance, a.type]);
      r.height = 18;
      [1, 2, 3, 5].forEach((c) => (r.getCell(c).style = dataStyle(i % 2 === 0)));
      r.getCell(4).style = numStyle(i % 2 === 0, P.brand);
    });

    const totRow = ws.addRow(["TOTAL SALDO", d.accountTotalBalance, "", "", ""]);
    totRow.height = 20;
    totRow.getCell(1).style = { font: { bold: true, size: 10 }, fill: solidFill(P.hdrBg) };
    totRow.getCell(2).style = numStyle(false, P.brand);
  }

  // SHEET 2 — Cash Flow
  {
    const ws = wb.addWorksheet("Cash Flow");
    ws.columns = [
      { width: 18 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 16 },
    ];

    addTitle(ws, "CASH FLOW PER PERIODE", 5);
    addMeta(ws, "Filter",     d.filterLabel, 2, 5);
    addMeta(ws, "Digenerate", d.generatedAt, 3, 5);
    ws.addRow([]);

    const hdr = ws.addRow(["Periode", "Pemasukan", "Pengeluaran", "Net Flow", "Jml Transaksi"]);
    applyHdr(hdr);

    d.cashFlow.forEach((r, i) => {
      const row = ws.addRow([r.period, r.income, r.expense, r.netFlow, r.txCount]);
      row.height = 18;
      row.getCell(1).style = dataStyle(i % 2 === 0);
      row.getCell(2).style = numStyle(i % 2 === 0, P.success);
      row.getCell(3).style = numStyle(i % 2 === 0, P.danger);
      row.getCell(4).style = numStyle(i % 2 === 0, r.netFlow >= 0 ? P.success : P.danger);
      row.getCell(5).style = { ...dataStyle(i % 2 === 0), numFmt: "#,##0", alignment: { horizontal: "center" } };
    });

    const tot = ws.addRow(["TOTAL", d.cashFlowTotals.income, d.cashFlowTotals.expense, d.cashFlowTotals.netFlow, ""]);
    tot.height = 20;
    tot.getCell(1).style = { font: { bold: true, size: 10 }, fill: solidFill(P.hdrBg) };
    tot.getCell(2).style = numStyle(false, P.success);
    tot.getCell(3).style = numStyle(false, P.danger);
    tot.getCell(4).style = numStyle(false, d.cashFlowTotals.netFlow >= 0 ? P.success : P.danger);

    if (d.cashFlow.length > 0) {
      ws.addRow([]);
      const chartRow = ws.addRow(["Chart: Cash Flow per Periode"]);
      chartRow.getCell(1).style = { font: { bold: true, size: 10, color: { argb: P.brand } } };
      chartRow.height = 18;

      const png = await renderBarChartPng(
        d.cashFlow.map((r) => r.period),
        [
          { label: "Pemasukan",   data: d.cashFlow.map((r) => r.income),   color: "#12B76A" },
          { label: "Pengeluaran", data: d.cashFlow.map((r) => r.expense),  color: "#F04438" },
          { label: "Net Flow",    data: d.cashFlow.map((r) => r.netFlow),  color: "#465FFF" },
        ],
        1100, 420,
      );
      embedImage(wb, ws, png, chartRow, 0, 5, 18);
    }
  }

  // SHEET 3 — Net Flow Trend
  {
    const ws = wb.addWorksheet("Net Flow Trend");
    ws.columns = [
      { width: 18 }, { width: 22 }, { width: 22 }, { width: 16 },
    ];

    addTitle(ws, "TREN NET FLOW & SALDO", 4);
    addMeta(ws, "Filter",     d.filterLabel, 2, 4);
    addMeta(ws, "Digenerate", d.generatedAt, 3, 4);
    ws.addRow([]);

    const hdr = ws.addRow(["Periode", "Net Flow", "Saldo", "Jml Transaksi"]);
    applyHdr(hdr);

    d.netFlowTrend.forEach((r, i) => {
      const row = ws.addRow([r.period, r.netFlow, r.balance, r.txCount]);
      row.height = 18;
      row.getCell(1).style = dataStyle(i % 2 === 0);
      row.getCell(2).style = numStyle(i % 2 === 0, r.netFlow >= 0 ? P.success : P.danger);
      row.getCell(3).style = numStyle(i % 2 === 0, P.warn);
      row.getCell(4).style = { ...dataStyle(i % 2 === 0), numFmt: "#,##0", alignment: { horizontal: "center" } };
    });

    if (d.netFlowTrend.length > 0) {
      ws.addRow([]);
      const chartRow = ws.addRow(["Chart: Tren Net Flow & Saldo"]);
      chartRow.getCell(1).style = { font: { bold: true, size: 10, color: { argb: P.brand } } };
      chartRow.height = 18;

      const png = await renderBarChartPng(
        d.netFlowTrend.map((r) => r.period),
        [
          { label: "Net Flow", data: d.netFlowTrend.map((r) => r.netFlow),  color: "#465FFF" },
          { label: "Saldo",    data: d.netFlowTrend.map((r) => r.balance),  color: "#F79009" },
        ],
        1100, 400,
      );
      embedImage(wb, ws, png, chartRow, 0, 5, 17);
    }
  }

  // SHEET 4 — Kategori
  {
    const ws = wb.addWorksheet("Kategori");
    ws.columns = [
      { width: 30 }, { width: 22 }, { width: 10 }, { width: 14 },
      { width: 30 }, { width: 22 }, { width: 10 }, { width: 14 },
    ];

    addTitle(ws, "DISTRIBUSI PER KATEGORI", 8);
    addMeta(ws, "Filter",     d.filterLabel, 2, 8);
    addMeta(ws, "Digenerate", d.generatedAt, 3, 8);
    ws.addRow([]);

    const catHdr = ws.addRow([
      "Kategori Pengeluaran", "Jumlah", "%", "Transaksi",
      "Kategori Pemasukan",   "Jumlah", "%", "Transaksi",
    ]);
    catHdr.height = 20;
    [1, 2, 3, 4].forEach((c) => (catHdr.getCell(c).style = hdrStyle(P.danger)));
    [5, 6, 7, 8].forEach((c) => (catHdr.getCell(c).style = hdrStyle(P.success)));

    const maxLen = Math.max(d.spendingCategories.length, d.incomeCategories.length);
    for (let i = 0; i < maxLen; i++) {
      const sp = d.spendingCategories[i];
      const ic = d.incomeCategories[i];
      const row = ws.addRow([
        sp?.category ?? "", sp?.amount ?? "", sp?.pct ?? "", sp?.count ?? "",
        ic?.category ?? "", ic?.amount ?? "", ic?.pct ?? "", ic?.count ?? "",
      ]);
      row.height = 18;
      [1, 4].forEach((c) => (row.getCell(c).style = dataStyle(i % 2 === 0)));
      row.getCell(2).style = numStyle(i % 2 === 0, P.danger);
      row.getCell(3).style = pctStyle(i % 2 === 0);   // nilai sudah 45.2, bukan 0.452
      [5, 8].forEach((c) => (row.getCell(c).style = dataStyle(i % 2 === 0)));
      row.getCell(6).style = numStyle(i % 2 === 0, P.success);
      row.getCell(7).style = pctStyle(i % 2 === 0);
      // count sebagai angka biasa
      row.getCell(4).style = { ...dataStyle(i % 2 === 0), numFmt: "#,##0", alignment: { horizontal: "center" } };
      row.getCell(8).style = { ...dataStyle(i % 2 === 0), numFmt: "#,##0", alignment: { horizontal: "center" } };
    }

    const totRow = ws.addRow([
      "TOTAL", d.spendingTotal, "100%", "",
      "TOTAL", d.incomeTotal,   "100%", "",
    ]);
    totRow.height = 20;
    [1, 2, 3, 4].forEach((c) => (totRow.getCell(c).style = hdrStyle(P.hdrBg)));
    [5, 6, 7, 8].forEach((c) => (totRow.getCell(c).style = hdrStyle(P.hdrBg)));
    totRow.getCell(1).style = { font: { bold: true, size: 10 }, fill: solidFill(P.hdrBg) };
    totRow.getCell(5).style = totRow.getCell(1).style;
    totRow.getCell(2).style = numStyle(false, P.danger);
    totRow.getCell(6).style = numStyle(false, P.success);

    ws.addRow([]);

    const donutLabelRow = ws.addRow([
      "Chart: Pengeluaran per Kategori", "", "", "",
      "Chart: Pemasukan per Kategori",
    ]);
    donutLabelRow.getCell(1).style = { font: { bold: true, size: 10, color: { argb: P.danger } } };
    donutLabelRow.getCell(5).style = { font: { bold: true, size: 10, color: { argb: P.success } } };
    donutLabelRow.height = 18;

    if (d.spendingCategories.length > 0) {
      const png = await renderDonutChartPng(
        d.spendingCategories.slice(0, 8).map((c) => c.category),
        d.spendingCategories.slice(0, 8).map((c) => c.amount),
        "Pengeluaran per Kategori", 700, 460,
      );
      embedImage(wb, ws, png, donutLabelRow, 0, 4, 16);
    }

    if (d.incomeCategories.length > 0) {
      const png = await renderDonutChartPng(
        d.incomeCategories.slice(0, 8).map((c) => c.category),
        d.incomeCategories.slice(0, 8).map((c) => c.amount),
        "Pemasukan per Kategori", 700, 460,
      );
      // Donut kedua di kolom 4-8, baris sama dengan donut pertama
      // Tidak perlu reserve rows lagi (sudah di-reserve oleh embedImage pertama)
      const imgId = wb.addImage({
        base64: png.replace(/^data:image\/png;base64,/, ""),
        extension: "png",
      });
      const tlRow = donutLabelRow.number - 1;
      // ExcelJS accepts simple {col, row} format at runtime despite stricter type definition
      ws.addImage(imgId, {
        tl: { col: 4, row: tlRow } as ExcelJS.Anchor,
        br: { col: 8, row: tlRow + 16 } as ExcelJS.Anchor,
      });
    }
  }

  // SHEET 5 — Transaksi
  {
    const ws = wb.addWorksheet("Transaksi");
    ws.columns = [
      { width: 14 }, { width: 42 }, { width: 24 }, { width: 24 },
      { width: 14 }, { width: 22 }, { width: 12 }, { width: 24 },
    ];

    addTitle(ws, "TRANSAKSI", 8);
    addMeta(ws, "Filter",     d.filterLabel, 2, 8);
    addMeta(ws, "Digenerate", d.generatedAt, 3, 8);
    ws.addRow([]);

    const hdr = ws.addRow([
      "Tanggal", "Keterangan", "Rekening", "Kategori",
      "Tipe", "Jumlah", "Status", "Referensi",
    ]);
    applyHdr(hdr);

    const idrFmt = new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0,
    });

    d.transactions.forEach((tx, i) => {
      const isIn = tx.type === "Pemasukan";
      const jumlahStr = (tx.signed >= 0 ? "+" : "") + idrFmt.format(tx.signed);
      const row = ws.addRow([
        tx.date, tx.description, tx.account, tx.category,
        tx.type, jumlahStr, tx.status, tx.reference,
      ]);
      row.height = 18;
      [1, 2, 3, 4, 7, 8].forEach((c) => (row.getCell(c).style = dataStyle(i % 2 === 0)));
      row.getCell(5).style = {
        ...dataStyle(i % 2 === 0),
        font: { size: 9, bold: true, color: { argb: isIn ? P.success : P.danger } },
      };
      row.getCell(6).style = {
        ...dataStyle(i % 2 === 0),
        font: { size: 9, bold: true, color: { argb: isIn ? P.success : P.danger } },
        alignment: { vertical: "middle", horizontal: "right" },
      };
    });

    // Summary: total pemasukan dan pengeluaran dari SEMUA transaksi di payload
    const sumRow = ws.addRow([
      `${d.transactions.length} transaksi`, "", "", "",
      "", "+" + idrFmt.format(d.txTotalIn), "-" + idrFmt.format(d.txTotalOut), "",
    ]);
    sumRow.height = 20;
    sumRow.getCell(1).style = { font: { bold: true, size: 10 }, fill: solidFill(P.hdrBg) };
    sumRow.getCell(6).style = {
      font: { bold: true, size: 10, color: { argb: P.success } },
      fill: solidFill(P.hdrBg),
      alignment: { horizontal: "right" },
    };
    sumRow.getCell(7).style = {
      font: { bold: true, size: 10, color: { argb: P.danger } },
      fill: solidFill(P.hdrBg),
      alignment: { horizontal: "right" },
    };
  }

  // Download 
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = `Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
