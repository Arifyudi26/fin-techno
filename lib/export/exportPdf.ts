/**
 * Export dashboard ke PDF menggunakan jsPDF (tanpa screenshot HTML).
 * Chart dirender di canvas offscreen via Chart.js.
 *
 * Urutan section:
 *  1. Header + info filter
 *  2. Ringkasan Metrik
 *  3. Rekening & Dompet
 *  4. Cash Flow per Periode
 *  5. Tren Net Flow & Saldo
 *  6. Distribusi per Kategori
 *  7. Transaksi
 */

import {
  ExportPayload,
  buildCanonicalData,
  IDR,
  renderBarChartPng,
  renderDonutChartPng,
} from "./exportHelpers";

// Palet warna
const C = {
  brand:   [70,  95,  255] as RGB,
  success: [18,  183, 106] as RGB,
  danger:  [240, 68,  56]  as RGB,
  warn:    [247, 144, 9]   as RGB,
  purple:  [124, 58,  237] as RGB,
  white:   [255, 255, 255] as RGB,
  dark:    [26,  26,  46]  as RGB,
  gray:    [100, 112, 133] as RGB,
  rowEven: [248, 249, 255] as RGB,
  rowOdd:  [255, 255, 255] as RGB,
  hdrBg:   [232, 234, 255] as RGB,
};
type RGB = [number, number, number];

const colorOf = (key: string): RGB =>
  ({ success: C.success, danger: C.danger, brand: C.brand, warn: C.warn, purple: C.purple }[key] as RGB) ?? C.brand;

// Fungsi utama export

export async function exportDashboardPDF(payload: ExportPayload) {
  const { default: jsPDF } = await import("jspdf");
  const d = buildCanonicalData(payload);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW  = pdf.internal.pageSize.getWidth();
  const PH  = pdf.internal.pageSize.getHeight();
  const ML  = 12;
  const CW  = PW - ML * 2;
  let y     = 0;

  // Nomor halaman di footer
  const stampFooter = () => {
    const pg = pdf.getNumberOfPages();
    pdf.setPage(pg);
    pdf.setFontSize(7);
    pdf.setTextColor(...C.gray);
    pdf.text(
      `Fin-Techno  ·  ${d.filterLabel}  ·  Halaman ${pg}`,
      PW / 2, PH - 5, { align: "center" },
    );
    pdf.setTextColor(...C.dark);
  };

  const newPage = () => { stampFooter(); pdf.addPage(); y = 14; };
  const need    = (h: number) => { if (y + h > PH - 14) newPage(); };

  // Judul section dengan aksen warna di sisi kiri
  const sectionTitle = (text: string) => {
    need(12);
    pdf.setFillColor(...C.brand);
    pdf.rect(ML, y, 3, 7, "F");
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...C.dark);
    pdf.text(text, ML + 5, y + 5.5);
    y += 10;
  };

  // Helper tabel: header, baris biasa, baris total
  const ROW_H = 7;

  type ColDef = { label: string; w: number; align?: "left" | "right" | "center" };
  type CellDef = { text: string; w: number; align?: "left" | "right" | "center"; color?: RGB };

  const tableHeader = (cols: ColDef[], bgColor: RGB = C.brand) => {
    need(ROW_H + 2);
    pdf.setFillColor(...bgColor);
    pdf.rect(ML, y, CW, ROW_H, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...C.white);
    let cx = ML + 2;
    cols.forEach((col) => {
      const align = col.align ?? "left";
      pdf.text(col.label, align === "right" ? cx + col.w - 3 : cx, y + 5, { align });
      cx += col.w;
    });
    y += ROW_H;
  };

  const tableRow = (cells: CellDef[], even: boolean) => {
    need(ROW_H + 1);
    pdf.setFillColor(...(even ? C.rowEven : C.rowOdd));
    pdf.rect(ML, y, CW, ROW_H, "F");
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    let cx = ML + 2;
    cells.forEach((cell) => {
      pdf.setTextColor(...(cell.color ?? C.dark));
      const align = cell.align ?? "left";
      const truncated = pdf.splitTextToSize(cell.text, cell.w - 3)[0] ?? "";
      pdf.text(truncated, align === "right" ? cx + cell.w - 3 : cx, y + 5, { align });
      cx += cell.w;
    });
    y += ROW_H;
  };

  const tableTotalRow = (cells: CellDef[]) => {
    need(ROW_H + 2);
    pdf.setFillColor(...C.hdrBg);
    pdf.rect(ML, y, CW, ROW_H, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    let cx = ML + 2;
    cells.forEach((cell) => {
      pdf.setTextColor(...(cell.color ?? C.dark));
      const align = cell.align ?? "left";
      pdf.text(cell.text, align === "right" ? cx + cell.w - 3 : cx, y + 5, { align });
      cx += cell.w;
    });
    y += ROW_H;
  };

  // Header dokumen
  y = 16;

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...C.dark);
  pdf.text("Laporan Keuangan Dashboard", ML, y);
  y += 7;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...C.gray);
  pdf.text(`Filter  :  ${d.filterLabel}`, ML, y);  y += 5;
  pdf.text(`Dibuat  :  ${d.generatedAt}`, ML, y);  y += 8;

  pdf.setFillColor(...C.hdrBg);
  pdf.rect(ML, y, CW, 0.5, "F");
  y += 8;

  // Section 1 — Ringkasan Metrik
  if (d.metrics.length > 0) {
    sectionTitle("Ringkasan Metrik");
    const cardW = CW / 5 - 1.5;
    const cardH = 24;
    need(cardH + 6);

    d.metrics.forEach((m, i) => {
      const cx = ML + i * (cardW + 1.9);
      const col = colorOf(m.colorKey);
      pdf.setFillColor(248, 249, 255);
      pdf.roundedRect(cx, y, cardW, cardH, 2, 2, "F");
      pdf.setFillColor(...col);
      pdf.rect(cx, y, 2.5, cardH, "F");

      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...C.gray);
      pdf.text(m.label, cx + 4, y + 6);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...C.dark);
      // Jumlah Transaksi ditampilkan sebagai angka biasa, bukan format mata uang
      const valStr = m.colorKey === "purple"
        ? Number(m.value).toLocaleString("id-ID")
        : IDR(Number(m.value));
      pdf.text(pdf.splitTextToSize(valStr, cardW - 6)[0], cx + 4, y + 13);

      if (m.change) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...(m.up ? C.success : C.danger));
        pdf.text((m.up ? "▲ " : "▼ ") + m.change, cx + 4, y + 20);
      }
    });
    y += cardH + 8;
  }

  // Section 2 — Rekening & Dompet
  if (d.accounts.length > 0) {
    sectionTitle("Rekening & Dompet");

    tableHeader([
      { label: "Bank / Provider", w: 44 },
      { label: "No. Rekening",    w: 40 },
      { label: "Nama",            w: 44 },
      { label: "Saldo",           w: 36, align: "right" },
      { label: "Tipe",            w: 22 },
    ]);

    d.accounts.forEach((a, i) => {
      tableRow([
        { text: a.provider,       w: 44 },
        { text: a.number,         w: 40 },
        { text: a.name,           w: 44 },
        { text: IDR(a.balance),   w: 36, align: "right", color: C.brand },
        { text: a.type,           w: 22 },
      ], i % 2 === 0);
    });

    tableTotalRow([
      { text: "TOTAL SALDO",              w: 128 },
      { text: IDR(d.accountTotalBalance), w: 36, align: "right", color: C.brand },
      { text: "",                         w: 22 },
    ]);
    y += 6;
  }

  // Section 3 — Cash Flow per Periode
  if (d.cashFlow.length > 0) {
    sectionTitle("Cash Flow per Periode");

    need(72);
    const barPng = await renderBarChartPng(
      d.cashFlow.map((r) => r.period),
      [
        { label: "Pemasukan",   data: d.cashFlow.map((r) => r.income),   color: "#12B76A" },
        { label: "Pengeluaran", data: d.cashFlow.map((r) => r.expense),  color: "#F04438" },
        { label: "Net Flow",    data: d.cashFlow.map((r) => r.netFlow),  color: "#465FFF" },
      ],
      1100, 420,
    );
    pdf.addImage(barPng, "PNG", ML, y, CW, 68);
    y += 72;

    tableHeader([
      { label: "Periode",       w: 34 },
      { label: "Pemasukan",     w: 40, align: "right" },
      { label: "Pengeluaran",   w: 40, align: "right" },
      { label: "Net Flow",      w: 40, align: "right" },
      { label: "Jml Transaksi", w: 32, align: "right" },
    ]);

    d.cashFlow.forEach((r, i) => {
      tableRow([
        { text: r.period,       w: 34 },
        { text: IDR(r.income),  w: 40, align: "right", color: C.success },
        { text: IDR(r.expense), w: 40, align: "right", color: C.danger  },
        { text: IDR(r.netFlow), w: 40, align: "right", color: r.netFlow >= 0 ? C.success : C.danger },
        { text: String(r.txCount), w: 32, align: "right" },
      ], i % 2 === 0);
    });

    tableTotalRow([
      { text: "TOTAL",                        w: 34 },
      { text: IDR(d.cashFlowTotals.income),   w: 40, align: "right", color: C.success },
      { text: IDR(d.cashFlowTotals.expense),  w: 40, align: "right", color: C.danger  },
      { text: IDR(d.cashFlowTotals.netFlow),  w: 40, align: "right", color: d.cashFlowTotals.netFlow >= 0 ? C.success : C.danger },
      { text: "",                             w: 32 },
    ]);
    y += 6;
  }

  // Section 4 — Tren Net Flow & Saldo
  if (d.netFlowTrend.length > 0) {
    sectionTitle("Tren Net Flow & Saldo");

    need(65);
    const trendPng = await renderBarChartPng(
      d.netFlowTrend.map((r) => r.period),
      [
        { label: "Net Flow", data: d.netFlowTrend.map((r) => r.netFlow),  color: "#465FFF" },
        { label: "Saldo",    data: d.netFlowTrend.map((r) => r.balance),  color: "#F79009" },
      ],
      1100, 400,
    );
    pdf.addImage(trendPng, "PNG", ML, y, CW, 62);
    y += 66;

    tableHeader([
      { label: "Periode",       w: 34 },
      { label: "Net Flow",      w: 50, align: "right" },
      { label: "Saldo",         w: 50, align: "right" },
      { label: "Jml Transaksi", w: 32, align: "right" },
      { label: "",              w: 20 },
    ]);

    d.netFlowTrend.forEach((r, i) => {
      tableRow([
        { text: r.period,       w: 34 },
        { text: IDR(r.netFlow), w: 50, align: "right", color: r.netFlow >= 0 ? C.success : C.danger },
        { text: IDR(r.balance), w: 50, align: "right", color: C.warn },
        { text: String(r.txCount), w: 32, align: "right" },
        { text: "",             w: 20 },
      ], i % 2 === 0);
    });
    y += 6;
  }

  // Section 5 — Distribusi per Kategori
  if (d.spendingCategories.length > 0 || d.incomeCategories.length > 0) {
    sectionTitle("Distribusi per Kategori");

    // Donut chart pemasukan & pengeluaran berdampingan
    need(72);
    const halfW = (CW - 4) / 2;

    if (d.spendingCategories.length > 0) {
      const png = await renderDonutChartPng(
        d.spendingCategories.slice(0, 8).map((c) => c.category),
        d.spendingCategories.slice(0, 8).map((c) => c.amount),
        "Pengeluaran per Kategori", 700, 460,
      );
      pdf.addImage(png, "PNG", ML, y, halfW, 68);
    }

    if (d.incomeCategories.length > 0) {
      const png = await renderDonutChartPng(
        d.incomeCategories.slice(0, 8).map((c) => c.category),
        d.incomeCategories.slice(0, 8).map((c) => c.amount),
        "Pemasukan per Kategori", 700, 460,
      );
      pdf.addImage(png, "PNG", ML + halfW + 4, y, halfW, 68);
    }
    y += 72;

    // Tabel pengeluaran per kategori
    if (d.spendingCategories.length > 0) {
      need(ROW_H * (d.spendingCategories.length + 3));
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...C.danger);
      pdf.text("Pengeluaran per Kategori", ML, y); y += 4;

      tableHeader([
        { label: "Kategori",  w: 62 },
        { label: "Jumlah",    w: 52, align: "right" },
        { label: "%",         w: 20, align: "right" },
        { label: "Transaksi", w: 22, align: "right" },
        { label: "",          w: 30 },
      ], C.danger);

      d.spendingCategories.forEach((c, i) => {
        tableRow([
          { text: c.category,          w: 62 },
          { text: IDR(c.amount),       w: 52, align: "right", color: C.danger },
          { text: c.pct.toFixed(1) + "%", w: 20, align: "right" },
          { text: String(c.count),     w: 22, align: "right" },
          { text: "",                  w: 30 },
        ], i % 2 === 0);
      });

      tableTotalRow([
        { text: "TOTAL",              w: 62 },
        { text: IDR(d.spendingTotal), w: 52, align: "right", color: C.danger },
        { text: "100%",               w: 20, align: "right" },
        { text: "",                   w: 52 },
      ]);
      y += 6;
    }

    // Tabel pemasukan per kategori
    if (d.incomeCategories.length > 0) {
      need(ROW_H * (d.incomeCategories.length + 3));
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...C.success);
      pdf.text("Pemasukan per Kategori", ML, y); y += 4;

      tableHeader([
        { label: "Kategori",  w: 62 },
        { label: "Jumlah",    w: 52, align: "right" },
        { label: "%",         w: 20, align: "right" },
        { label: "Transaksi", w: 22, align: "right" },
        { label: "",          w: 30 },
      ], C.success);

      d.incomeCategories.forEach((c, i) => {
        tableRow([
          { text: c.category,          w: 62 },
          { text: IDR(c.amount),       w: 52, align: "right", color: C.success },
          { text: c.pct.toFixed(1) + "%", w: 20, align: "right" },
          { text: String(c.count),     w: 22, align: "right" },
          { text: "",                  w: 30 },
        ], i % 2 === 0);
      });

      tableTotalRow([
        { text: "TOTAL",             w: 62 },
        { text: IDR(d.incomeTotal),  w: 52, align: "right", color: C.success },
        { text: "100%",              w: 20, align: "right" },
        { text: "",                  w: 52 },
      ]);
      y += 6;
    }
  }

  // Section 6 — Transaksi
  if (d.transactions.length > 0) {
    sectionTitle("Transaksi");

    // 8 kolom: Tanggal, Keterangan, Rekening, Kategori, Tipe, Jumlah, Status, Referensi
    tableHeader([
      { label: "Tanggal",    w: 22 },
      { label: "Keterangan", w: 50 },
      { label: "Rekening",   w: 28 },
      { label: "Kategori",   w: 24 },
      { label: "Tipe",       w: 16 },
      { label: "Jumlah",     w: 28, align: "right" },
      { label: "Status",     w: 12 },
      { label: "Referensi",  w: 6  },
    ]);

    d.transactions.forEach((tx, i) => {
      const isIn = tx.type === "Pemasukan";
      // Format jumlah dengan tanda +/- sesuai tipe transaksi
      const jumlahStr = (tx.signed >= 0 ? "+" : "") + IDR(tx.signed);
      tableRow([
        { text: tx.date,        w: 22 },
        { text: tx.description, w: 50 },
        { text: tx.account,     w: 28 },
        { text: tx.category,    w: 24 },
        { text: tx.type,        w: 16, color: isIn ? C.success : C.danger },
        { text: jumlahStr,      w: 28, align: "right", color: isIn ? C.success : C.danger },
        { text: tx.status,      w: 12 },
        { text: tx.reference,   w: 6  },
      ], i % 2 === 0);
    });

    tableTotalRow([
      { text: `${d.transactions.length} transaksi`, w: 72 },
      { text: `+${IDR(d.txTotalIn)}`,               w: 44, color: C.success },
      { text: `-${IDR(d.txTotalOut)}`,              w: 44, color: C.danger  },
      { text: "",                                   w: 26 },
    ]);
  }

  // Footer halaman terakhir
  stampFooter();
  pdf.save(`Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
}
