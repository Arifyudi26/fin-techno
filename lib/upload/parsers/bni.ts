/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Parser e-Statement BNI
 *
 * Struktur baris per transaksi (dari pdfjs):
 *   "01 Dec 2025"          - tanggal
 *   "08:02:06 WIB"         - waktu
 *   "Pembayaran Qris"      - jenis transaksi
 *   "KUE SUBUH JUARA - DEPOK" - keterangan
 *   "-20,0001,023,097"     - nominal+saldo nempel (tanpa spasi)
 *
 * Catatan:
 * - "Saldo Akhir" muncul dua kali (header & akhir tabel), pakai yang terakhir.
 * - pdf-parse tidak meneruskan password ke pdfjs, jadi pdfjs dipanggil langsung.
 */

import { ParsedRow } from "./shared";

// Buka PDF via pdfjs langsung (support password)
async function extractLines(buffer: Buffer, password?: string): Promise<string[]> {
  const PDFJS = require("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js");
  PDFJS.disableWorker = true;

  const doc = await PDFJS.getDocument({
    data: new Uint8Array(buffer),
    ...(password ? { password } : {}),
  }).promise;

  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc   = await page.getTextContent();

    let lastY: number | null = null;
    let lineText = "";

    for (const item of (tc.items as Array<{ str: string; transform: number[] }>)) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 1) {
        if (lineText.trim()) lines.push(lineText.trim());
        lineText = item.str;
      } else {
        lineText += item.str;
      }
      lastY = y;
    }
    if (lineText.trim()) lines.push(lineText.trim());
  }

  return lines;
}

export async function isBniPdfPasswordProtected(buffer: Buffer): Promise<boolean> {
  try {
    await extractLines(buffer);
    return false;
  } catch (e: any) {
    const name: string = e?.name ?? "";
    const msg: string  = e?.message ?? "";
    if (
      name === "PasswordException" ||
      msg.includes("No password given") ||
      msg.includes("password") ||
      msg.includes("encrypted")
    ) {
      return true;
    }
    return false;
  }
}

// Validasi format angka IDR: grup digit dipisah koma, tiap grup setelah pertama = 3 digit
function isValidIDR(s: string): boolean {
  if (!s || !/^[\d,]+$/.test(s)) return false;
  if (s.startsWith(",") || s.endsWith(",")) return false;
  const parts = s.split(",");
  if (parts.length === 1) return /^\d+$/.test(s);
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].length !== 3) return false;
  }
  return true;
}

// Split baris nominal+saldo yang nempel, misal "-20,0001,023,097" -> nominal=20000, balance=1023097
// Cari semua posisi split valid, ambil yang terakhir (nominal terbesar).
function splitAmountBalance(
  raw: string,
): { nominal: number; balance: number; isCredit: boolean } | null {
  const isCredit = raw.startsWith("+");
  const s = raw.replace(/^[+\-]/, "");

  const validSplits: { nominal: number; balance: number }[] = [];

  for (let i = 1; i < s.length; i++) {
    const left  = s.slice(0, i);
    const right = s.slice(i);
    if (!isValidIDR(left) || !isValidIDR(right)) continue;
    const nominal = parseFloat(left.replace(/,/g, ""));
    const balance = parseFloat(right.replace(/,/g, ""));
    if (isNaN(nominal) || isNaN(balance) || nominal <= 0 || balance < 0) continue;
    validSplits.push({ nominal, balance });
  }

  if (validSplits.length === 0) return null;

  const best = validSplits[validSplits.length - 1];
  return { nominal: best.nominal, balance: best.balance, isCredit };
}

export async function parseBniPDF(buffer: Buffer, password: string): Promise<ParsedRow[]> {
  let lines: string[];
  try {
    lines = await extractLines(buffer, password);
  } catch (e: any) {
    const name: string = e?.name ?? "";
    const msg: string  = e?.message ?? "";
    if (
      name === "PasswordException" ||
      msg.includes("PasswordException") ||
      msg.includes("Incorrect password") ||
      msg.includes("No password given")
    ) {
      throw new Error(
        "Password PDF salah atau tidak valid. Periksa kembali password e-Statement BNI Anda.",
      );
    }
    throw e;
  }

  const DATE_LINE   = /^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/;
  const TIME_LINE   = /^\d{2}:\d{2}:\d{2}\s+WIB$/;
  const AMOUNT_LINE = /^[+\-][\d,]+$/;

  // Cari kemunculan TERAKHIR "Saldo Akhir" / "Informasi Lainnya" sebagai batas akhir
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("Saldo Akhir") || lines[i].startsWith("Informasi Lainnya")) {
      endIdx = i;
      break;
    }
  }

  const SKIP_PREFIXES = [
    "Laporan Mutasi",
    "Periode:",
    "PT Bank Negara",
    "peserta penjaminan",
    "Tanggal & Waktu",
    "Saldo Awal",
    "Total Pemasukan",
    "Total Pengeluaran",
    "Kantor Cabang",
    "BNI TAPPA",
  ];

  const workLines: string[] = [];
  let pastFirstHeader = false;

  for (let i = 0; i < endIdx; i++) {
    const l = lines[i];
    if (l.includes("Tanggal & Waktu")) { pastFirstHeader = true; continue; }
    if (!pastFirstHeader) continue;
    if (SKIP_PREFIXES.some((p) => l.startsWith(p))) continue;
    if (/^\d+ dari \d+$/.test(l)) continue;
    workLines.push(l);
  }

  // Kelompokkan baris per transaksi (dimulai dari baris tanggal)
  const groups: string[][] = [];
  let current: string[] = [];

  for (const line of workLines) {
    if (DATE_LINE.test(line)) {
      if (current.length > 0) groups.push(current);
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) groups.push(current);

  const rows: ParsedRow[] = [];

  for (const group of groups) {
    if (group.length < 3) continue;

    const dateStr = group[0];

    const amountIdx = group.findIndex((l, i) => i >= 2 && AMOUNT_LINE.test(l));
    if (amountIdx < 0) continue;

    const parsed = splitAmountBalance(group[amountIdx]);
    if (!parsed) continue;

    const { nominal, balance, isCredit } = parsed;
    if (nominal === 0) continue;

    const desc = group
      .slice(2, amountIdx)
      .filter((l) => !TIME_LINE.test(l))
      .join(" ")
      .trim();
    if (!desc) continue;

    rows.push({
      date:           dateStr,
      valueDate:      "",
      description:    desc,
      debit:          isCredit ? "0" : String(nominal),
      credit:         isCredit ? String(nominal) : "0",
      openingBalance: "",
      balance:        String(balance),
      reference:      "",
      sign:           isCredit ? "Cr" : "Db",
    });
  }

  return rows;
}
