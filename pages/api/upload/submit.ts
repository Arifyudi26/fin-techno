/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { FileFormat, UploadStatus, TransactionType, EStatementStatus } from "@prisma/client";
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

// ── CSV parser (minimal, no external dep) ────────────────────────────────────
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

// ── Column mapping — covers BRI, BCA, Mandiri, BNI, CIMB, GoPay, OVO, etc. ──
// Each field lists candidate column names in priority order (first match wins).
const COLUMN_CANDIDATES = {
  date: [
    "tgl_tran",           // BRImo
    "tgl_efektif",        // BRImo (value date)
    "tanggal transaksi",  // BCA, Mandiri
    "tanggal",            // generic
    "transaction date",   // English
    "date",
    "tgl",
  ],
  description: [
    "remark_custom",      // BRImo (human-readable, preferred)
    "desk_tran",          // BRImo (fallback)
    "keterangan",         // BCA, Mandiri, BNI
    "description",        // English
    "deskripsi",
    "ket",
    "narasi",             // some banks
    "detail transaksi",
  ],
  debit: [
    "mutasi_debet",       // BRImo
    "debet",              // BCA
    "debit",              // generic
    "pengeluaran",
    "keluar",
    "db",
  ],
  credit: [
    "mutasi_kredit",      // BRImo
    "kredit",             // BCA
    "credit",             // generic
    "pemasukan",
    "masuk",
    "cr",
  ],
  balance: [
    "saldo_akhir_mutasi", // BRImo
    "saldo akhir",        // BCA
    "saldo",              // generic
    "balance",
    "saldo setelah",
  ],
  reference: [
    "seq",                // BRImo
    "no. referensi",      // BCA
    "referensi",
    "reference",
    "no. transaksi",
    "nomor referensi",
    "ref",
  ],
  // GLSIGN / type hint column (Db/Cr) — used when present for reliable type detection
  sign: [
    "glsign",             // BRImo: "Db" | "Cr"
    "dc",                 // some banks: "D" | "C"
    "type",
    "jenis",
  ],
} as const;

function findColIdx(header: string[], candidates: readonly string[]): number {
  for (const candidate of candidates) {
    const exact = header.indexOf(candidate);
    if (exact >= 0) return exact;
    // partial match fallback
    const partial = header.findIndex((h) => h.includes(candidate));
    if (partial >= 0) return partial;
  }
  return -1;
}

// ── Detect transaction type ───────────────────────────────────────────────────
function detectType(
  desc: string,
  debitVal: string,
  creditVal: string,
  signVal?: string,
): TransactionType {
  // Most reliable: explicit sign column (BRImo GLSIGN, etc.)
  if (signVal) {
    const s = signVal.trim().toLowerCase();
    if (s === "cr" || s === "c") return TransactionType.CREDIT;
    if (s === "db" || s === "d") return TransactionType.DEBIT;
  }
  // Amount columns
  if (creditVal && Number(creditVal.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.CREDIT;
  if (debitVal  && Number(debitVal.replace(/[^0-9.-]/g, ""))  > 0) return TransactionType.DEBIT;
  // Description keywords
  const lower = desc.toLowerCase();
  if (lower.includes("masuk") || lower.includes("kredit") || lower.includes("top up") || lower.includes("terima")) return TransactionType.CREDIT;
  return TransactionType.DEBIT;
}

// ── Auto-categorize ──────────────────────────────────────────────────────────
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
  const lny = categories.find((c) => c.code === "LNY");
  return lny?.id ?? null;
}

// ── Parse rows from CSV ──────────────────────────────────────────────────────
function parseRows(rows: string[][]): Array<{
  date: string; description: string; debit: string; credit: string;
  balance: string; reference: string; sign: string;
}> {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const idx = {
    date:    findColIdx(header, COLUMN_CANDIDATES.date),
    desc:    findColIdx(header, COLUMN_CANDIDATES.description),
    debit:   findColIdx(header, COLUMN_CANDIDATES.debit),
    credit:  findColIdx(header, COLUMN_CANDIDATES.credit),
    balance: findColIdx(header, COLUMN_CANDIDATES.balance),
    ref:     findColIdx(header, COLUMN_CANDIDATES.reference),
    sign:    findColIdx(header, COLUMN_CANDIDATES.sign),
  };

  return rows.slice(1).map((row) => ({
    date:        idx.date    >= 0 ? row[idx.date]    ?? "" : "",
    description: idx.desc    >= 0 ? row[idx.desc]    ?? "" : row[1] ?? "",
    debit:       idx.debit   >= 0 ? row[idx.debit]   ?? "" : "",
    credit:      idx.credit  >= 0 ? row[idx.credit]  ?? "" : "",
    balance:     idx.balance >= 0 ? row[idx.balance] ?? "" : "",
    reference:   idx.ref     >= 0 ? row[idx.ref]     ?? "" : "",
    sign:        idx.sign    >= 0 ? row[idx.sign]    ?? "" : "",
  }));
}

function parseAmount(val: string): number {
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")) || 0);
}

// ── Date parser — handles all common formats + datetime variants ──────────────
function parseDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.trim();

  // Datetime with space or T: "2026-03-01 08:10:47" | "2026-03-01T08:10:47"
  const dtMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ][\d:]+/);
  if (dtMatch) {
    const d = new Date(dtMatch[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // Date-only patterns
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(\d{4})-(\d{2})-(\d{2})$/, ([, y, m, d]) => `${y}-${m}-${d}`],   // YYYY-MM-DD
    [/^(\d{2})\/(\d{2})\/(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`], // DD/MM/YYYY
    [/^(\d{2})-(\d{2})-(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`],   // DD-MM-YYYY
    [/^(\d{2})\.(\d{2})\.(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`], // DD.MM.YYYY
    [/^(\d{2})\/(\d{2})\/(\d{2})$/, ([, d, m, y]) => `20${y}-${m}-${d}`], // DD/MM/YY
  ];

  for (const [regex, builder] of patterns) {
    const m = clean.match(regex);
    if (m) {
      const d = new Date(builder(m));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Last resort: native Date parse
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ message: "Gagal membaca file: " + err.message });

    try {
      const sourceType = (fields.sourceType?.[0] ?? "BANK").toUpperCase();
      const accountId  = fields.accountId?.[0];
      const notes      = fields.notes?.[0] ?? "";

      if (!accountId) {
        return res.status(400).json({ message: "accountId wajib diisi" });
      }

      const fileArr = files.file;
      const file: FormidableFile | undefined = Array.isArray(fileArr) ? fileArr[0] : (fileArr as FormidableFile | undefined);
      if (!file) return res.status(400).json({ message: "File tidak ditemukan" });

      const ext = path.extname(file.originalFilename ?? "").toLowerCase().replace(".", "").toUpperCase();
      const allowedFormats = ["CSV", "XLSX", "XLS", "PDF"];
      if (!allowedFormats.includes(ext)) {
        return res.status(400).json({ message: `Format ${ext} tidak didukung. Gunakan CSV, XLSX, XLS, atau PDF.` });
      }

      const fileFormat = ext as FileFormat;
      const fileContent = fs.readFileSync(file.filepath, "utf-8");
      const fileSize = file.size;
      const fileName = file.originalFilename ?? `upload_${Date.now()}.${ext.toLowerCase()}`;
      const fileUrl  = `/uploads/${fileName}`; // placeholder — production: upload ke storage

      const db = prisma as any;

      // ── Verify account belongs to user ──────────────────────────────────
      let providerName: string;
      if (sourceType === "BANK") {
        const acc = await prisma.bankAccount.findFirst({ where: { id: accountId, ownerId: userId } });
        if (!acc) return res.status(404).json({ message: "Rekening tidak ditemukan" });
        providerName = acc.bankProvider;
      } else {
        const wallet = await db.digitalWallet.findFirst({ where: { id: accountId, ownerId: userId } });
        if (!wallet) return res.status(404).json({ message: "Dompet tidak ditemukan" });
        providerName = wallet.walletProvider;
      }

      // ── Create upload record (PROCESSING) ───────────────────────────────
      let uploadId: string;
      if (sourceType === "BANK") {
        const upload = await prisma.bankStatementUpload.create({
          data: {
            bankAccountId: accountId,
            uploadedById: userId,
            fileName,
            fileUrl,
            fileFormat,
            fileSizeBytes: fileSize,
            bankProvider: providerName as any,
            periodStart: new Date(),
            periodEnd: new Date(),
            status: UploadStatus.PROCESSING,
            notes,
          },
        });
        uploadId = upload.id;
      } else {
        const upload = await db.walletStatementUpload.create({
          data: {
            walletId: accountId,
            uploadedById: userId,
            fileName,
            fileUrl,
            fileFormat,
            fileSizeBytes: fileSize,
            walletProvider: providerName,
            periodStart: new Date(),
            periodEnd: new Date(),
            status: UploadStatus.PROCESSING,
            notes,
          },
        });
        uploadId = upload.id;
      }

      // ── Parse file ───────────────────────────────────────────────────────
      let parsedRows: ReturnType<typeof parseRows> = [];
      let parseError: string | null = null;

      if (fileFormat === "CSV") {
        try {
          const rows = parseCSV(fileContent);
          parsedRows = parseRows(rows);
        } catch (e: any) {
          parseError = "Gagal membaca CSV: " + e.message;
        }
      } else if (fileFormat === "PDF") {
        parseError = "File PDF memerlukan proses manual. Silakan konversi ke CSV terlebih dahulu.";
      } else {
        // XLSX/XLS — simplified: treat as CSV for now
        try {
          const rows = parseCSV(fileContent);
          parsedRows = parseRows(rows);
        } catch {
          parseError = "Gagal membaca file. Pastikan format sesuai template.";
        }
      }

      if (parseError) {
        if (sourceType === "BANK") {
          await prisma.bankStatementUpload.update({
            where: { id: uploadId },
            data: { status: UploadStatus.FAILED, errorMessage: parseError },
          });
        } else {
          await db.walletStatementUpload.update({
            where: { id: uploadId },
            data: { status: UploadStatus.FAILED, errorMessage: parseError },
          });
        }
        return res.status(422).json({ message: parseError, uploadId });
      }

      // ── Auto-detect period from transaction dates ─────────────────────────
      const allDates = parsedRows
        .map((r) => parseDate(r.date))
        .filter((d): d is Date => d !== null);

      const detectedStart = allDates.length > 0
        ? new Date(Math.min(...allDates.map((d) => d.getTime())))
        : new Date();
      const detectedEnd = allDates.length > 0
        ? new Date(Math.max(...allDates.map((d) => d.getTime())))
        : new Date();

      // Update upload record with detected period
      if (sourceType === "BANK") {
        await prisma.bankStatementUpload.update({
          where: { id: uploadId },
          data: { periodStart: detectedStart, periodEnd: detectedEnd },
        });
      } else {
        await db.walletStatementUpload.update({
          where: { id: uploadId },
          data: { periodStart: detectedStart, periodEnd: detectedEnd },
        });
      }

      // ── Insert transactions ──────────────────────────────────────────────
      let successCount = 0;
      let failCount = 0;
      let totalCredit = 0;
      let totalDebit = 0;

      for (const row of parsedRows) {
        if (!row.description && !row.date) { failCount++; continue; }

        const txDate = parseDate(row.date);
        if (!txDate) { failCount++; continue; }

        const creditAmt = parseAmount(row.credit);
        const debitAmt  = parseAmount(row.debit);
        const amount    = creditAmt > 0 ? creditAmt : debitAmt;
        if (amount === 0) { failCount++; continue; }
        const type    = detectType(row.description, row.debit, row.credit, row.sign);
        const balance = parseAmount(row.balance);
        const catId   = await autoCategory(row.description);
        // Include reference + balance in hash so same-amount same-description rows
        // on the same date (e.g. BI-Fast fee rows) are treated as distinct transactions
        const hash    = crypto.createHash("md5")
          .update(`${accountId}|${txDate.toISOString()}|${amount}|${row.description}|${row.reference}|${balance}`)
          .digest("hex");

        try {
          if (sourceType === "BANK") {
            await prisma.bankTransaction.create({
              data: {
                bankAccountId: accountId,
                uploadId,
                transactionDate: txDate,
                description: row.description,
                reference: row.reference || null,
                amount,
                type,
                balance: balance || null,
                status: EStatementStatus.VERIFIED,
                categoryId: catId,
                hash,
              },
            });
          } else {
            await db.walletTransaction.create({
              data: {
                walletId: accountId,
                uploadId,
                transactionDate: txDate,
                description: row.description,
                reference: row.reference || null,
                amount,
                type,
                balance: balance || null,
                status: EStatementStatus.VERIFIED,
                categoryId: catId,
                hash,
              },
            });
          }
          if (type === TransactionType.CREDIT) totalCredit += amount;
          else totalDebit += amount;
          successCount++;
        } catch {
          failCount++; // duplicate hash or other error
        }
      }

      // ── Update upload summary ────────────────────────────────────────────
      const finalStatus = failCount === 0
        ? UploadStatus.SUCCESS
        : successCount === 0
          ? UploadStatus.FAILED
          : UploadStatus.PARTIAL;

      if (sourceType === "BANK") {
        await prisma.bankStatementUpload.update({
          where: { id: uploadId },
          data: {
            status: finalStatus,
            totalRows: parsedRows.length,
            parsedRows: successCount,
            failedRows: failCount,
            totalCredit,
            totalDebit,
          },
        });
      } else {
        await db.walletStatementUpload.update({
          where: { id: uploadId },
          data: {
            status: finalStatus,
            totalRows: parsedRows.length,
            parsedRows: successCount,
            failedRows: failCount,
            totalCredit,
            totalDebit,
          },
        });
      }

      return res.status(200).json({
        uploadId,
        status: finalStatus,
        totalRows: parsedRows.length,
        parsedRows: successCount,
        failedRows: failCount,
        totalCredit,
        totalDebit,
      });
    } catch (error: any) {
      console.error("upload submit error:", error);
      return res.status(500).json({ message: "Internal server error: " + error.message });
    }
  });
}
