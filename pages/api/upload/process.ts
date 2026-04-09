/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import {
  TransactionType,
  UploadStatus,
  EStatementStatus,
} from "@prisma/client";
import crypto from "crypto";

// Vercel Pro/Hobby: max duration 60s, tapi QStash bisa retry
// Set maxDuration ke 300 untuk Vercel Pro, atau biarkan default 60s untuk free
export const config = { api: { bodyParser: true } };

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
}

// ── Column mapping ────────────────────────────────────────────────────────────
const COLUMN_CANDIDATES = {
  date: ["tgl_tran", "tanggal transaksi", "tanggal", "transaction date", "date", "tgl"],
  valueDate: ["tgl_efektif", "tanggal efektif", "value date", "tgl valuta"],
  description: ["remark_custom", "desk_tran", "keterangan", "description", "deskripsi", "ket", "narasi", "detail transaksi"],
  debit: ["mutasi_debet", "debet", "debit", "pengeluaran", "keluar", "db"],
  credit: ["mutasi_kredit", "kredit", "credit", "pemasukan", "masuk", "cr"],
  openingBalance: ["saldo_awal_mutasi", "saldo awal"],
  balance: ["saldo_akhir_mutasi", "saldo akhir", "saldo", "balance", "saldo setelah"],
  reference: ["seq", "no. referensi", "referensi", "reference", "no. transaksi", "nomor referensi", "ref"],
  sign: ["glsign", "dc", "type", "jenis"],
} as const;

function findColIdx(header: string[], candidates: readonly string[]): number {
  for (const candidate of candidates) {
    const exact = header.indexOf(candidate);
    if (exact >= 0) return exact;
    const partial = header.findIndex((h) => h.includes(candidate));
    if (partial >= 0) return partial;
  }
  return -1;
}

function detectType(desc: string, debitVal: string, creditVal: string, signVal?: string): TransactionType {
  if (signVal) {
    const s = signVal.trim().toLowerCase();
    if (s === "cr" || s === "c") return TransactionType.CREDIT;
    if (s === "db" || s === "d") return TransactionType.DEBIT;
  }
  if (creditVal && Number(creditVal.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.CREDIT;
  if (debitVal && Number(debitVal.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.DEBIT;
  const lower = desc.toLowerCase();
  if (lower.includes("masuk") || lower.includes("kredit") || lower.includes("top up") || lower.includes("terima"))
    return TransactionType.CREDIT;
  return TransactionType.DEBIT;
}

async function autoCategory(desc: string): Promise<string | null> {
  const lower = desc.toLowerCase();
  const categories = await prisma.transactionCategory.findMany({ select: { id: true, name: true, code: true } });
  const rules: Record<string, string[]> = {
    GAJ: ["gaji", "salary", "thr", "bonus", "payroll"],
    UTL: ["listrik", "pln", "pdam", "air", "internet", "telkom", "indihome", "wifi", "bpjs"],
    PAJ: ["pajak", "pph", "ppn", "bphtb"],
    INV: ["investasi", "deposito", "saham", "reksa", "obligasi"],
    OPS: ["operasional", "supplier", "vendor", "pembelian", "bahan"],
  };
  for (const [code, keywords] of Object.entries(rules)) {
    if (keywords.some((k) => lower.includes(k))) {
      const cat = categories.find((c) => c.code === code);
      if (cat) return cat.id;
    }
  }
  return categories.find((c) => c.code === "LNY")?.id ?? null;
}

type ParsedRow = {
  date: string; valueDate: string; description: string;
  debit: string; credit: string; openingBalance: string;
  balance: string; reference: string; sign: string;
};

function parseRows(rows: string[][]): ParsedRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = {
    date: findColIdx(header, COLUMN_CANDIDATES.date),
    valueDate: findColIdx(header, COLUMN_CANDIDATES.valueDate),
    desc: findColIdx(header, COLUMN_CANDIDATES.description),
    debit: findColIdx(header, COLUMN_CANDIDATES.debit),
    credit: findColIdx(header, COLUMN_CANDIDATES.credit),
    openingBalance: findColIdx(header, COLUMN_CANDIDATES.openingBalance),
    balance: findColIdx(header, COLUMN_CANDIDATES.balance),
    ref: findColIdx(header, COLUMN_CANDIDATES.reference),
    sign: findColIdx(header, COLUMN_CANDIDATES.sign),
  };
  return rows.slice(1).map((row) => ({
    date: idx.date >= 0 ? (row[idx.date] ?? "") : "",
    valueDate: idx.valueDate >= 0 ? (row[idx.valueDate] ?? "") : "",
    description: idx.desc >= 0 ? (row[idx.desc] ?? "") : (row[1] ?? ""),
    debit: idx.debit >= 0 ? (row[idx.debit] ?? "") : "",
    credit: idx.credit >= 0 ? (row[idx.credit] ?? "") : "",
    openingBalance: idx.openingBalance >= 0 ? (row[idx.openingBalance] ?? "") : "",
    balance: idx.balance >= 0 ? (row[idx.balance] ?? "") : "",
    reference: idx.ref >= 0 ? (row[idx.ref] ?? "") : "",
    sign: idx.sign >= 0 ? (row[idx.sign] ?? "") : "",
  }));
}

function parseAmount(val: string): number {
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")) || 0);
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.trim();
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ][\d:]+/);
  if (isoMatch) { const d = new Date(isoMatch[1]); return isNaN(d.getTime()) ? null : d; }
  const briPdfMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+\d{2}:\d{2}:\d{2}/);
  if (briPdfMatch) {
    const [, dd, mm, yy] = briPdfMatch;
    const d = new Date(`20${yy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(\d{4})-(\d{2})-(\d{2})$/, ([, y, m, d]) => `${y}-${m}-${d}`],
    [/^(\d{2})\/(\d{2})\/(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})-(\d{2})-(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})\.(\d{2})\.(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],
    [/^(\d{2})\/(\d{2})\/(\d{2})$/, ([, d, m, y]) => `20${y}-${m}-${d}`],
  ];
  for (const [regex, builder] of patterns) {
    const m = clean.match(regex);
    if (m) { const d = new Date(builder(m)); if (!isNaN(d.getTime())) return d; }
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

async function parsePDF(buffer: Buffer): Promise<ParsedRow[]> {
  const { PDFParse } = require("pdf-parse") as {
    PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> };
  };
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const text = data.text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const rows: ParsedRow[] = [];
  const DATE_SPLIT = /(?=\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/g;
  const chunks = text.split(DATE_SPLIT).filter((c) => /^\d{2}\/\d{2}\/\d{2}/.test(c.trim()));
  for (const chunk of chunks) {
    const clean = chunk.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    const dateMatch = clean.match(/^(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) /);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const rest = clean.slice(dateMatch[0].length).trim();
    const allNums = [...rest.matchAll(/[\d,]+\.\d{2}/g)];
    if (allNums.length < 3) continue;
    const balanceStr = allNums[allNums.length - 1][0];
    const creditStr = allNums[allNums.length - 2][0];
    const debitStr = allNums[allNums.length - 3][0];
    const firstNumIdx = allNums[allNums.length - 3].index!;
    let descRaw = rest.slice(0, firstNumIdx).trim();
    descRaw = descRaw.replace(/\s+(\d{4,}|[A-Z]{3,}[A-Z0-9]*)$/, "").trim();
    if (!descRaw) continue;
    const sign = parseAmount(debitStr) > 0 ? "Db" : "Cr";
    rows.push({ date: dateStr, valueDate: "", description: descRaw, debit: debitStr, credit: creditStr, openingBalance: "", balance: balanceStr, reference: "", sign });
  }
  return rows;
}

// ── Core processing logic (exported for direct call fallback) ─────────────────
export async function processUpload(payload: {
  uploadId: string;
  sourceType: string;
  accountId: string;
  fileUrl: string;
  fileFormat: string;
  userId: string;
}) {
  const { uploadId, sourceType, accountId, fileUrl, fileFormat } = payload;
  const db = prisma as any;

  try {
    // Download file dari Vercel Blob (authenticated)
    const blobUrl = fileUrl.split("#")[0]; // strip hash suffix
    const response = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    if (!response.ok) throw new Error(`Gagal download file: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileContent = fileFormat !== "PDF" ? fileBuffer.toString("utf-8") : "";

    // Parse file
    let parsedRows: ParsedRow[] = [];
    let parseError: string | null = null;

    if (fileFormat === "CSV") {
      try { parsedRows = parseRows(parseCSV(fileContent)); }
      catch (e: any) { parseError = "Gagal membaca CSV: " + e.message; }
    } else if (fileFormat === "PDF") {
      try {
        parsedRows = await parsePDF(fileBuffer);
        if (parsedRows.length === 0) parseError = "Tidak ada transaksi yang berhasil dibaca dari PDF.";
      } catch (e: any) { parseError = "Gagal membaca PDF: " + e.message; }
    } else {
      try { parsedRows = parseRows(parseCSV(fileContent)); }
      catch { parseError = "Gagal membaca file. Pastikan format sesuai template."; }
    }

    if (parseError) {
      const updateData = { status: UploadStatus.FAILED, errorMessage: parseError };
      if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: updateData });
      else await db.walletStatementUpload.update({ where: { id: uploadId }, data: updateData });
      return;
    }

    // Auto-detect period
    const allDates = parsedRows.map((r) => parseDate(r.date)).filter((d): d is Date => d !== null);
    const detectedStart = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
    const detectedEnd = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

    if (sourceType === "BANK") {
      await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    } else {
      await db.walletStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    }

    // Insert transactions
    let successCount = 0, failCount = 0, totalCredit = 0, totalDebit = 0;

    for (const row of parsedRows) {
      if (!row.description && !row.date) { failCount++; continue; }
      const txDate = parseDate(row.date);
      if (!txDate) { failCount++; continue; }
      const creditAmt = parseAmount(row.credit);
      const debitAmt = parseAmount(row.debit);
      const amount = creditAmt > 0 ? creditAmt : debitAmt;
      if (amount === 0) { failCount++; continue; }
      const type = detectType(row.description, row.debit, row.credit, row.sign);
      const balance = parseAmount(row.balance);
      const valueDate = parseDate(row.valueDate);
      const catId = await autoCategory(row.description);
      const hash = crypto.createHash("md5").update(`${accountId}|${txDate.toISOString()}|${amount}|${balance}`).digest("hex");

      try {
        if (sourceType === "BANK") {
          await prisma.bankTransaction.upsert({
            where: { hash },
            create: { bankAccountId: accountId, uploadId, transactionDate: txDate, valueDate: valueDate ?? undefined, description: row.description, reference: row.reference || null, amount, type, balance: balance || null, status: EStatementStatus.VERIFIED, categoryId: catId, hash },
            update: {},
          });
        } else {
          await db.walletTransaction.upsert({
            where: { hash },
            create: { walletId: accountId, uploadId, transactionDate: txDate, description: row.description, reference: row.reference || null, amount, type, balance: balance || null, status: EStatementStatus.VERIFIED, categoryId: catId, hash },
            update: {},
          });
        }
        if (type === TransactionType.CREDIT) totalCredit += amount;
        else totalDebit += amount;
        successCount++;
      } catch { failCount++; }
    }

    // Update summary
    const finalStatus = failCount === 0 ? UploadStatus.SUCCESS : successCount === 0 ? UploadStatus.FAILED : UploadStatus.PARTIAL;
    const summaryData = { status: finalStatus, totalRows: parsedRows.length, parsedRows: successCount, failedRows: failCount, totalCredit, totalDebit };

    if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: summaryData });
    else await db.walletStatementUpload.update({ where: { id: uploadId }, data: summaryData });

    // Hapus file dari Blob setelah selesai diproses
    try {
      const { del } = await import("@vercel/blob");
      await del(fileUrl.split("#")[0], { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch { /* tidak fatal jika gagal hapus */ }

  } catch (error: any) {
    console.error("processUpload error:", error);
    const errData = { status: UploadStatus.FAILED, errorMessage: "Internal error: " + error.message };
    try {
      if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: errData });
      else await (prisma as any).walletStatementUpload.update({ where: { id: uploadId }, data: errData });
    } catch { /* ignore */ }
    throw error; // re-throw agar QStash bisa retry
  }
}

// ── HTTP handler (dipanggil oleh QStash) ─────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Verifikasi request dari QStash
  const qstashSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (qstashSigningKey) {
    const signature = req.headers["upstash-signature"] as string;
    if (!signature) return res.status(401).json({ message: "Missing QStash signature" });

    try {
      const { Receiver } = await import("@upstash/qstash");
      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
      });
      const body = JSON.stringify(req.body);
      const isValid = await receiver.verify({ signature, body });
      if (!isValid) return res.status(401).json({ message: "Invalid QStash signature" });
    } catch (e: any) {
      return res.status(401).json({ message: "Signature verification failed: " + e.message });
    }
  }

  const payload = req.body;
  if (!payload?.uploadId) return res.status(400).json({ message: "Missing uploadId" });

  // Respond 200 dulu ke QStash agar tidak timeout, lalu proses
  res.status(200).json({ message: "Processing started" });

  // Proses di background (tidak block response)
  processUpload(payload).catch((e) => console.error("Background process error:", e));
}
