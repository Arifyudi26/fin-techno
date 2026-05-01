/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Parser e-Statement BNI
 *
 * Format yang didukung:
 *  - PDF terenkripsi : dibuka dengan password lalu diekstrak teksnya.
 *                      Password biasanya tanggal lahir nasabah (DDMMYYYY).
 *
 * Struktur baris transaksi BNI PDF:
 *   <tanggal>  <keterangan>  <nominal debet>  <nominal kredit>  <saldo>
 *   Tanggal format: DD/MM/YYYY atau DD MMM YYYY
 *
 * Catatan: BNI tidak menyediakan e-Statement CSV publik, sehingga
 * hanya parser PDF yang diimplementasikan di sini.
 */

import { ParsedRow } from "./shared";

// ─── Cek apakah PDF butuh password (tanpa membaca isinya) ────────────────────
export async function isBniPdfPasswordProtected(buffer: Buffer): Promise<boolean> {
  const pdfParse = require("pdf-parse");
  try {
    // max:0 → hanya baca metadata, tidak parse semua halaman (lebih cepat)
    await pdfParse(buffer, { max: 0 });
    return false; // berhasil dibuka → tidak terenkripsi
  } catch (e: any) {
    const msg: string = e?.message ?? "";
    if (
      msg.includes("PasswordException") ||
      msg.includes("password") ||
      msg.includes("encrypted") ||
      msg.includes("No password given")
    ) {
      return true;
    }
    // Error lain (bukan password) → anggap tidak terenkripsi, biarkan proses lanjut
    return false;
  }
}

// ─── BNI PDF ─────────────────────────────────────────────────────────────────
export async function parseBniPDF(buffer: Buffer, password: string): Promise<ParsedRow[]> {
  const pdfParse = require("pdf-parse");

  let data: { text: string };
  try {
    data = await pdfParse(buffer, { password });
  } catch (e: any) {
    const msg: string = e?.message ?? "";
    if (
      msg.includes("PasswordException") ||
      msg.includes("password") ||
      msg.includes("encrypted") ||
      msg.includes("No password given") ||
      msg.includes("Incorrect password")
    ) {
      throw new Error(
        "Password PDF salah atau tidak valid. Periksa kembali password e-Statement BNI Anda.",
      );
    }
    throw e;
  }

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
    "TOTAL MUTASI",
  ];
  let endIdx = allLines.length;
  for (const marker of summaryMarkers) {
    const idx = allLines.findIndex((l) => l.toUpperCase().includes(marker.toUpperCase()));
    if (idx > 0 && idx < endIdx) endIdx = idx;
  }
  const lines = allLines.slice(0, endIdx);

  // Pola tanggal BNI: "DD/MM/YYYY" atau "DD MMM YYYY" (mis. "01 Jan 2025")
  const DATE_DD_MM_YYYY = /^\d{2}\/\d{2}\/\d{4}/;
  const DATE_DD_MMM_YYYY = /^\d{2}\s+[A-Za-z]{3}\s+\d{4}/;

  const isTxLine = (l: string) =>
    DATE_DD_MM_YYYY.test(l) || DATE_DD_MMM_YYYY.test(l);

  // Gabungkan baris lanjutan ke baris transaksi sebelumnya
  const merged: string[] = [];
  for (const line of lines) {
    if (isTxLine(line)) {
      merged.push(line);
    } else if (merged.length > 0) {
      merged[merged.length - 1] += " " + line.trim();
    }
  }

  const rows: ParsedRow[] = [];

  for (const line of merged) {
    // Ambil tanggal (10 karakter: DD/MM/YYYY atau DD MMM YYYY)
    const dateStr = line.slice(0, 10).trim();
    const rest    = line.slice(10).trim();

    // Semua angka format ribuan: [\d.]+,\d{2} (format Indonesia) atau [\d,]+\.\d{2}
    // BNI menggunakan titik sebagai pemisah ribuan dan koma sebagai desimal
    // Contoh: 1.500.000,00
    const NUM_PATTERN = /([\d.]+,\d{2})/g;
    const allNums = [...rest.matchAll(NUM_PATTERN)];

    // Minimal 2 angka: nominal + saldo
    if (allNums.length < 2) continue;

    const balanceMatch = allNums[allNums.length - 1];
    const amountMatch  = allNums[allNums.length - 2];

    const balanceRaw = balanceMatch[0];
    const amountRaw  = amountMatch[0];

    // Teks sebelum angka pertama dari 2 terakhir → deskripsi
    const beforeAmount = rest.slice(0, amountMatch.index!).trimEnd();

    // Deteksi DB/CR dari teks (BNI biasanya ada "DB" atau "CR" di baris)
    const upperRest = rest.toUpperCase();
    let sign = "Db";
    if (upperRest.includes(" CR ") || upperRest.endsWith(" CR")) sign = "Cr";
    if (upperRest.includes(" DB ") || upperRest.endsWith(" DB")) sign = "Db";

    // Bersihkan tanda DB/CR dari deskripsi
    const desc = beforeAmount
      .replace(/\s+(DB|CR)\s*$/i, "")
      .trim();

    if (!desc) continue;

    // Konversi format angka BNI (1.500.000,00) ke format standar (1500000.00)
    const toStd = (v: string) => v.replace(/\./g, "").replace(",", ".");

    const debitStr  = sign === "Db" ? toStd(amountRaw) : "0";
    const creditStr = sign === "Cr" ? toStd(amountRaw) : "0";

    rows.push({
      date:           dateStr,
      valueDate:      "",
      description:    desc,
      debit:          debitStr,
      credit:         creditStr,
      openingBalance: "",
      balance:        toStd(balanceRaw),
      reference:      "",
      sign,
    });
  }

  return rows;
}
