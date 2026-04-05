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

// ── Detect transaction type from description ─────────────────────────────────
function detectType(desc: string, debitCol: string, creditCol: string): TransactionType {
  if (creditCol && Number(creditCol.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.CREDIT;
  if (debitCol && Number(debitCol.replace(/[^0-9.-]/g, "")) > 0) return TransactionType.DEBIT;
  const lower = desc.toLowerCase();
  if (lower.includes("masuk") || lower.includes("kredit") || lower.includes("cr") || lower.includes("top up")) return TransactionType.CREDIT;
  return TransactionType.DEBIT;
}

// ── Auto-categorize ──────────────────────────────────────────────────────────
async function autoCategory(desc: string): Promise<string | null> {
  const lower = desc.toLowerCase();
  const categories = await prisma.transactionCategory.findMany({ select: { id: true, name: true, code: true } });

  const rules: Record<string, string[]> = {
    GAJ: ["gaji", "salary", "thr", "bonus"],
    UTL: ["listrik", "pln", "pdam", "air", "internet", "telkom", "indihome", "wifi"],
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
  date: string; description: string; debit: string; credit: string; balance: string; reference: string;
}> {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase());

  const idx = {
    date:    header.findIndex((h) => h.includes("tanggal") || h.includes("date") || h.includes("tgl")),
    desc:    header.findIndex((h) => h.includes("keterangan") || h.includes("deskripsi") || h.includes("description") || h.includes("ket")),
    debit:   header.findIndex((h) => h.includes("debit") || h.includes("keluar") || h.includes("db")),
    credit:  header.findIndex((h) => h.includes("kredit") || h.includes("masuk") || h.includes("cr")),
    balance: header.findIndex((h) => h.includes("saldo") || h.includes("balance")),
    ref:     header.findIndex((h) => h.includes("ref") || h.includes("no.") || h.includes("nomor")),
  };

  return rows.slice(1).map((row) => ({
    date:        idx.date >= 0 ? row[idx.date] ?? "" : "",
    description: idx.desc >= 0 ? row[idx.desc] ?? "" : row[1] ?? "",
    debit:       idx.debit >= 0 ? row[idx.debit] ?? "" : "",
    credit:      idx.credit >= 0 ? row[idx.credit] ?? "" : "",
    balance:     idx.balance >= 0 ? row[idx.balance] ?? "" : "",
    reference:   idx.ref >= 0 ? row[idx.ref] ?? "" : "",
  }));
}

function parseAmount(val: string): number {
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")) || 0);
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  // Try common formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const clean = val.trim();
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
  ];
  for (const fmt of formats) {
    const m = clean.match(fmt);
    if (m) {
      const [, a, b, c] = m;
      const d = fmt === formats[1]
        ? new Date(`${a}-${b}-${c}`)
        : new Date(`${c}-${b}-${a}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
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
      const periodStart = fields.periodStart?.[0];
      const periodEnd   = fields.periodEnd?.[0];
      const notes       = fields.notes?.[0] ?? "";

      if (!accountId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "accountId, periodStart, periodEnd wajib diisi" });
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
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
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
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
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

        const type    = detectType(row.description, row.debit, row.credit);
        const balance = parseAmount(row.balance);
        const catId   = await autoCategory(row.description);
        const hash    = crypto.createHash("md5")
          .update(`${accountId}|${txDate.toISOString()}|${amount}|${row.description}`)
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
                status: EStatementStatus.PENDING,
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
                status: EStatementStatus.PENDING,
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
