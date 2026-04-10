/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import {
  FileFormat,
  UploadStatus,
  TransactionType,
  EStatementStatus,
} from "@prisma/client";
import crypto from "crypto";
// pdf-parse uses CommonJS exports with PDFParse class
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
  };
};

export const config = { api: { bodyParser: false } };

// CSV parser
function parseCSV(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuote = !inQuote;
          continue;
        }
        if (ch === "," && !inQuote) {
          cols.push(cur.trim());
          cur = "";
          continue;
        }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
}

// Column mapping — covers BRI, BCA, Mandiri, BNI, CIMB, GoPay, OVO, etc.
// Each field lists candidate column names in priority order (first match wins).
const COLUMN_CANDIDATES = {
  date: [
    "tgl_tran", // BRImo: transaction datetime
    "tanggal transaksi", // BCA, Mandiri
    "tanggal", // generic
    "transaction date",
    "date",
    "tgl",
  ],
  valueDate: [
    "tgl_efektif", // BRImo: effective/value date
    "tanggal efektif",
    "value date",
    "tgl valuta",
  ],
  description: [
    "remark_custom", // BRImo: human-readable (preferred)
    "desk_tran", // BRImo: fallback
    "keterangan", // BCA, Mandiri, BNI
    "description",
    "deskripsi",
    "ket",
    "narasi",
    "detail transaksi",
  ],
  debit: [
    "mutasi_debet", // BRImo
    "debet", // BCA
    "debit",
    "pengeluaran",
    "keluar",
    "db",
  ],
  credit: [
    "mutasi_kredit", // BRImo
    "kredit", // BCA
    "credit",
    "pemasukan",
    "masuk",
    "cr",
  ],
  openingBalance: [
    "saldo_awal_mutasi", // BRImo: balance before transaction
    "saldo awal",
  ],
  balance: [
    "saldo_akhir_mutasi", // BRImo: balance after transaction
    "saldo akhir", // BCA
    "saldo",
    "balance",
    "saldo setelah",
  ],
  reference: [
    "seq", // BRImo
    "no. referensi", // BCA
    "referensi",
    "reference",
    "no. transaksi",
    "nomor referensi",
    "ref",
  ],
  sign: [
    "glsign", // BRImo: "Db" | "Cr"
    "dc", // some banks: "D" | "C"
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

// Detect transaction type
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
  if (creditVal && Number(creditVal.replace(/[^0-9.-]/g, "")) > 0)
    return TransactionType.CREDIT;
  if (debitVal && Number(debitVal.replace(/[^0-9.-]/g, "")) > 0)
    return TransactionType.DEBIT;
  // Description keywords
  const lower = desc.toLowerCase();
  if (
    lower.includes("masuk") ||
    lower.includes("kredit") ||
    lower.includes("top up") ||
    lower.includes("terima")
  )
    return TransactionType.CREDIT;
  return TransactionType.DEBIT;
}

// Auto-categorize
async function autoCategory(desc: string): Promise<string | null> {
  const lower = desc.toLowerCase();
  const categories = await prisma.transactionCategory.findMany({
    select: { id: true, name: true, code: true },
  });

  const rules: Record<string, string[]> = {
    GAJ: ["gaji", "salary", "thr", "bonus", "payroll"],
    UTL: [
      "listrik",
      "pln",
      "pdam",
      "air",
      "internet",
      "telkom",
      "indihome",
      "wifi",
      "bpjs",
    ],
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

// Parse rows from CSV
function parseRows(rows: string[][]): Array<{
  date: string;
  valueDate: string;
  description: string;
  debit: string;
  credit: string;
  openingBalance: string;
  balance: string;
  reference: string;
  sign: string;
}> {
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
    openingBalance:
      idx.openingBalance >= 0 ? (row[idx.openingBalance] ?? "") : "",
    balance: idx.balance >= 0 ? (row[idx.balance] ?? "") : "",
    reference: idx.ref >= 0 ? (row[idx.ref] ?? "") : "",
    sign: idx.sign >= 0 ? (row[idx.sign] ?? "") : "",
  }));
}

function parseAmount(val: string): number {
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")) || 0);
}

// Date parser — handles all common formats + datetime variants
function parseDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.trim();

  // Datetime with space or T: "2026-03-01 08:10:47" | "2026-03-01T08:10:47"
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ][\d:]+/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YY HH:MM:SS — BRI PDF format e.g. "01/03/26 08:10:47"
  const briPdfMatch = clean.match(
    /^(\d{2})\/(\d{2})\/(\d{2})\s+\d{2}:\d{2}:\d{2}/,
  );
  if (briPdfMatch) {
    const [, dd, mm, yy] = briPdfMatch;
    const d = new Date(`20${yy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Date-only patterns
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(\d{4})-(\d{2})-(\d{2})$/, ([, y, m, d]) => `${y}-${m}-${d}`], // YYYY-MM-DD
    [/^(\d{2})\/(\d{2})\/(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`], // DD/MM/YYYY
    [/^(\d{2})-(\d{2})-(\d{4})$/, ([, d, m, y]) => `${y}-${m}-${d}`], // DD-MM-YYYY
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

// PDF parser — BRI e-Statement format
// Columns: Tanggal Transaksi | Uraian Transaksi | Teller/User ID | Debet | Kredit | Saldo
// Date format: DD/MM/YY HH:MM:SS  (e.g. "01/03/26 08:10:47")
// Numbers use comma as thousands separator: "1,394,102.00"
type ParsedRow = ReturnType<typeof parseRows>[number];

async function parsePDF(buffer: Buffer): Promise<ParsedRow[]> {
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  // Normalize: collapse tabs/spaces but keep newlines for now
  const text = data.text.replace(/\r/g, "").replace(/[ \t]+/g, " ");

  const rows: ParsedRow[] = [];

  // Strategy: split on every transaction date occurrence.
  // This handles multi-line descriptions naturally since each chunk
  // starts with a date and ends just before the next date.
  const DATE_SPLIT = /(?=\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/g;
  const chunks = text
    .split(DATE_SPLIT)
    .filter((c) => /^\d{2}\/\d{2}\/\d{2}/.test(c.trim()));

  for (const chunk of chunks) {
    // Flatten newlines within each chunk into spaces
    const clean = chunk.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    // Extract date+time at start: "DD/MM/YY HH:MM:SS"
    const dateMatch = clean.match(/^(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) /);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const rest = clean.slice(dateMatch[0].length).trim();

    // Find all numbers in the chunk — last 3 are debit, credit, balance
    const allNums = [...rest.matchAll(/[\d,]+\.\d{2}/g)];
    if (allNums.length < 3) continue;

    const balanceStr = allNums[allNums.length - 1][0];
    const creditStr = allNums[allNums.length - 2][0];
    const debitStr = allNums[allNums.length - 3][0];

    // Description = everything before the first of the last-3 numbers
    const firstNumIdx = allNums[allNums.length - 3].index!;
    let descRaw = rest.slice(0, firstNumIdx).trim();

    // Strip trailing teller ID: all-digit 4+ chars, or known alpha codes (BRIMDBT, CMSPYRL, etc.)
    descRaw = descRaw.replace(/\s+(\d{4,}|[A-Z]{3,}[A-Z0-9]*)$/, "").trim();

    if (!descRaw) continue;

    const sign = parseAmount(debitStr) > 0 ? "Db" : "Cr";

    rows.push({
      date: dateStr,
      valueDate: "",
      description: descRaw,
      debit: debitStr,
      credit: creditStr,
      openingBalance: "",
      balance: balanceStr,
      reference: "",
      sign,
    });
  }

  return rows;
}

// Main handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const form = new IncomingForm({
    maxFileSize: 10 * 1024 * 1024,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err)
      return res
        .status(400)
        .json({ message: "Gagal membaca file: " + err.message });

    try {
      const sourceType = (fields.sourceType?.[0] ?? "BANK").toUpperCase();
      const accountId = fields.accountId?.[0];
      const notes = fields.notes?.[0] ?? "";

      if (!accountId) {
        return res.status(400).json({ message: "accountId wajib diisi" });
      }

      const fileArr = files.file;
      const file: FormidableFile | undefined = Array.isArray(fileArr)
        ? fileArr[0]
        : (fileArr as FormidableFile | undefined);
      if (!file)
        return res.status(400).json({ message: "File tidak ditemukan" });

      const ext = path
        .extname(file.originalFilename ?? "")
        .toLowerCase()
        .replace(".", "")
        .toUpperCase();
      const allowedFormats = ["CSV", "XLSX", "XLS", "PDF"];
      if (!allowedFormats.includes(ext)) {
        return res.status(400).json({
          message: `Format ${ext} tidak didukung. Gunakan CSV, XLSX, XLS, atau PDF.`,
        });
      }

      const fileFormat = ext as FileFormat;
      const fileBuffer = fs.readFileSync(file.filepath);
      const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
      const fileContent =
        fileFormat !== "PDF" ? fileBuffer.toString("utf-8") : "";
      const fileSize = file.size;
      const fileName =
        file.originalFilename ?? `upload_${Date.now()}.${ext.toLowerCase()}`;
      const fileUrl = `/uploads/${fileName}#${fileHash}`; // hash disimpan di suffix untuk dedup check

      const db = prisma as any;

      // Verify account belongs to user
      let providerName: string;
      if (sourceType === "BANK") {
        const acc = await prisma.bankAccount.findFirst({
          where: { id: accountId, ownerId: userId },
        });
        if (!acc)
          return res.status(404).json({ message: "Rekening tidak ditemukan" });
        providerName = acc.bankProvider;
      } else {
        const wallet = await db.digitalWallet.findFirst({
          where: { id: accountId, ownerId: userId },
        });
        if (!wallet)
          return res.status(404).json({ message: "Dompet tidak ditemukan" });
        providerName = wallet.walletProvider;
      }

      // Validasi 1: nama file tidak boleh sama
      const baseNameWithoutExt = fileName.replace(/\.[^/.]+$/, "").toLowerCase();
      if (sourceType === "BANK") {
        const existingByName = await prisma.bankStatementUpload.findFirst({
          where: {
            bankAccountId: accountId,
            fileName: { contains: baseNameWithoutExt, mode: "insensitive" },
          },
          select: { id: true, fileName: true },
        });
        if (existingByName) {
          return res.status(409).json({
            message: `File dengan nama "${existingByName.fileName}" sudah pernah diupload sebelumnya. Gunakan nama file yang berbeda.`,
            code: "DUPLICATE_FILENAME",
          });
        }
      } else {
        const existingByName = await db.walletStatementUpload.findFirst({
          where: {
            walletId: accountId,
            fileName: { contains: baseNameWithoutExt, mode: "insensitive" },
          },
          select: { id: true, fileName: true },
        });
        if (existingByName) {
          return res.status(409).json({
            message: `File dengan nama "${existingByName.fileName}" sudah pernah diupload sebelumnya. Gunakan nama file yang berbeda.`,
            code: "DUPLICATE_FILENAME",
          });
        }
      }

      // Validasi 2: konten file tidak boleh duplikat (hash MD5)
      if (sourceType === "BANK") {
        const existingByHash = await prisma.bankStatementUpload.findFirst({
          where: { bankAccountId: accountId, fileUrl: { endsWith: fileHash } },
          select: { id: true, fileName: true },
        });
        if (existingByHash) {
          return res.status(409).json({
            message: `Konten file ini identik dengan "${existingByHash.fileName}" yang sudah diupload sebelumnya.`,
            code: "DUPLICATE_CONTENT",
          });
        }
      } else {
        const existingByHash = await db.walletStatementUpload.findFirst({
          where: { walletId: accountId, fileUrl: { endsWith: fileHash } },
          select: { id: true, fileName: true },
        });
        if (existingByHash) {
          return res.status(409).json({
            message: `Konten file ini identik dengan "${existingByHash.fileName}" yang sudah diupload sebelumnya.`,
            code: "DUPLICATE_CONTENT",
          });
        }
      }

      // Create upload record
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

      // Parse file
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
        try {
          parsedRows = await parsePDF(fileBuffer);
          if (parsedRows.length === 0)
            parseError = "Tidak ada transaksi yang berhasil dibaca dari PDF.";
        } catch (e: any) {
          parseError = "Gagal membaca PDF: " + e.message;
        }
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

      // Auto-detect period from transaction dates
      const allDates = parsedRows
        .map((r) => parseDate(r.date))
        .filter((d): d is Date => d !== null);

      const detectedStart =
        allDates.length > 0
          ? new Date(Math.min(...allDates.map((d) => d.getTime())))
          : new Date();
      const detectedEnd =
        allDates.length > 0
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

      // Insert transactions
      let successCount = 0;
      let failCount = 0;
      let totalCredit = 0;
      let totalDebit = 0;

      for (const row of parsedRows) {
        if (!row.description && !row.date) {
          failCount++;
          continue;
        }

        const txDate = parseDate(row.date);
        if (!txDate) {
          failCount++;
          continue;
        }

        const creditAmt = parseAmount(row.credit);
        const debitAmt = parseAmount(row.debit);
        const amount = creditAmt > 0 ? creditAmt : debitAmt;
        if (amount === 0) {
          failCount++;
          continue;
        }
        const type = detectType(
          row.description,
          row.debit,
          row.credit,
          row.sign,
        );
        const balance = parseAmount(row.balance);
        const valueDate = parseDate(row.valueDate);
        const catId = await autoCategory(row.description);
        // Hash key: accountId + date + amount + balance (closing)
        // Using balance instead of description/reference makes hash consistent
        // across CSV and PDF uploads of the same statement (descriptions may differ slightly)
        const hash = crypto
          .createHash("md5")
          .update(`${accountId}|${txDate.toISOString()}|${amount}|${balance}`)
          .digest("hex");

        try {
          if (sourceType === "BANK") {
            await prisma.bankTransaction.upsert({
              where: { hash },
              create: {
                bankAccountId: accountId,
                uploadId,
                transactionDate: txDate,
                valueDate: valueDate ?? undefined,
                description: row.description,
                reference: row.reference || null,
                amount,
                type,
                balance: balance || null,
                status: EStatementStatus.VERIFIED,
                categoryId: catId,
                hash,
              },
              update: {}, // already exists — keep original, just count as success
            });
          } else {
            await db.walletTransaction.upsert({
              where: { hash },
              create: {
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
              update: {},
            });
          }
          if (type === TransactionType.CREDIT) totalCredit += amount;
          else totalDebit += amount;
          successCount++;
        } catch {
          failCount++;
        }
      }

      // Update upload summary
      const finalStatus =
        failCount === 0
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
      return res
        .status(500)
        .json({ message: "Internal server error: " + error.message });
    }
  });
}
