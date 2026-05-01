/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Parser e-Statement BRI
 *
 * Format yang didukung:
 *  - CSV  : kolom fleksibel, dideteksi otomatis via COLUMN_CANDIDATES
 *  - PDF  : teks diekstrak dengan pdf-parse, baris transaksi dikenali
 *           dari pola tanggal "dd/mm/yy HH:MM:SS"
 *
 * BRI PDF tidak terenkripsi — tidak butuh password.
 */

import { ParsedRow, parseCSV, parseRows } from "./shared";

export function parseBriCSV(content: string): ParsedRow[] {
  return parseRows(parseCSV(content));
}

export async function parseBriPDF(buffer: Buffer): Promise<ParsedRow[]> {
  const pdfParse = require("pdf-parse");
  const data: { text: string } = await pdfParse(buffer);

  // Split per baris, buang yang kosong
  const allLines: string[] = data.text
    .split("\n")
    .map((l: string) => l.trimEnd())
    .filter((l: string) => l.trim());

  // Potong sebelum summary section
  const summaryMarkers = [
    "Saldo Awal",
    "Opening Balance",
    "Total Transaksi Debet",
    "Terbilang",
  ];
  let endIdx = allLines.length;
  for (const marker of summaryMarkers) {
    const idx = allLines.findIndex((l) => l.includes(marker));
    if (idx > 0 && idx < endIdx) endIdx = idx;
  }
  const lines = allLines.slice(0, endIdx);

  // Gabungkan baris lanjutan ke baris transaksi sebelumnya.
  // Baris transaksi BRI dimulai dengan "dd/mm/yy HH:MM:SS"
  const DATE_PREFIX = /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/;

  const merged: string[] = [];
  for (const line of lines) {
    if (DATE_PREFIX.test(line)) {
      merged.push(line);
    } else if (merged.length > 0) {
      merged[merged.length - 1] += " " + line.trim();
    }
  }

  const rows: ParsedRow[] = [];

  for (const line of merged) {
    const dateStr = line.slice(0, 17); // "dd/mm/yy HH:MM:SS"
    const rest    = line.slice(17).trim();

    // 3 angka terakhir = debit, credit, balance
    const allNums = [...rest.matchAll(/([\d,]+\.\d{2})/g)];
    if (allNums.length < 3) continue;

    const balanceMatch = allNums[allNums.length - 1];
    const creditMatch  = allNums[allNums.length - 2];
    const debitMatch   = allNums[allNums.length - 3];

    const balanceStr = balanceMatch[0];
    const creditStr  = creditMatch[0];
    const debitStr   = debitMatch[0];

    // Teks sebelum debit → pisahkan desc dan ref
    const beforeDebit = rest.slice(0, debitMatch.index!).trimEnd();
    const refSplit    = beforeDebit.match(/^(.*?)\s{2,}(\S+)$/);

    let desc: string;
    let ref: string;
    if (refSplit) {
      desc = refSplit[1].trim();
      ref  = refSplit[2].trim();
    } else {
      desc = beforeDebit.trim();
      ref  = "";
    }

    if (!desc) continue;

    const parseAmt = (v: string) => Math.abs(Number(v.replace(/[^0-9.]/g, "")) || 0);
    const sign = parseAmt(creditStr) > 0 ? "Cr" : "Db";

    rows.push({
      date:           dateStr,
      valueDate:      "",
      description:    desc,
      debit:          debitStr,
      credit:         creditStr,
      openingBalance: "",
      balance:        balanceStr,
      reference:      ref,
      sign,
    });
  }

  return rows;
}
