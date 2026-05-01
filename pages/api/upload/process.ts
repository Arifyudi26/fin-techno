/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import {
  TransactionType,
  UploadStatus,
  EStatementStatus,
} from "@prisma/client";
import crypto from "crypto";
import { parseDate } from "@lib/dateUtils";
import { parseAmount } from "@lib/formatters";
import { loadCategories, resolveCategoryIds } from "@lib/categoryMatcher";
import { ParsedRow, parseCSV, parseRows, detectType } from "@lib/upload/parsers/shared";
import { parseBriCSV, parseBriPDF } from "@lib/upload/parsers/bri";
import { parseBniPDF } from "@lib/upload/parsers/bni";

// Vercel: set maxDuration agar tidak timeout saat proses file besar
export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

// ─── Routing parser berdasarkan provider & format ────────────────────────────
async function parseFile(
  fileBuffer: Buffer,
  fileContent: string,
  fileFormat: string,
  bankProvider: string,
  pdfPassword?: string,
): Promise<ParsedRow[]> {
  const provider = bankProvider.toUpperCase();
  const format   = fileFormat.toUpperCase();

  // ── BNI ──────────────────────────────────────────────────────────────────
  if (provider === "BNI") {
    if (format === "PDF") {
      if (!pdfPassword) {
        throw new Error("PDF e-Statement BNI membutuhkan password.");
      }
      return parseBniPDF(fileBuffer, pdfPassword);
    }
    // BNI CSV — gunakan parser generik (kolom dideteksi otomatis)
    return parseRows(parseCSV(fileContent));
  }

  // ── BRI ──────────────────────────────────────────────────────────────────
  if (provider === "BRI") {
    if (format === "PDF") return parseBriPDF(fileBuffer);
    return parseBriCSV(fileContent);
  }

  // ── Provider lain (BCA, Mandiri, CIMB, dll.) — parser generik ────────────
  if (format === "PDF") {
    // Gunakan parser BRI PDF sebagai fallback generik
    return parseBriPDF(fileBuffer);
  }
  return parseRows(parseCSV(fileContent));
}

// ─── Core processing logic ───────────────────────────────────────────────────
export type ProcessLog = { ts: string; step: string; detail?: string };

export async function processUpload(payload: {
  uploadId: string;
  sourceType: string;
  accountId: string;
  fileUrl: string;
  fileFormat: string;
  userId: string;
  bankProvider?: string;
  pdfPassword?: string;
}): Promise<{ logs: ProcessLog[] }> {
  const { uploadId, sourceType, accountId, fileUrl, fileFormat, pdfPassword } = payload;
  // bankProvider bisa tidak ada untuk wallet — default ke string kosong
  const bankProvider = payload.bankProvider ?? "";
  const db = prisma as any;
  const logs: ProcessLog[] = [];
  const log = (step: string, detail?: string) => {
    const entry: ProcessLog = { ts: new Date().toISOString(), step, detail };
    logs.push(entry);
    console.log(`[processUpload] ${step}${detail ? " | " + detail : ""}`);
  };

  try {
    log("START", `uploadId=${uploadId} format=${fileFormat} provider=${bankProvider} sourceType=${sourceType}`);

    // Download file dari Vercel Blob
    const blobUrl = fileUrl.split("#")[0];
    log("DOWNLOAD_START", blobUrl);
    const response = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!response.ok) throw new Error(`Gagal download file: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer  = Buffer.from(arrayBuffer);
    const fileContent = fileFormat !== "PDF" ? fileBuffer.toString("utf-8") : "";
    log("DOWNLOAD_OK", `size=${fileBuffer.length} bytes`);

    // Parse file — routing ke parser yang sesuai
    let parsedRows: ParsedRow[] = [];
    let parseError: string | null = null;

    try {
      log("PARSE_START", `provider=${bankProvider} format=${fileFormat}`);
      parsedRows = await parseFile(fileBuffer, fileContent, fileFormat, bankProvider, pdfPassword);
      if (parsedRows.length === 0) {
        parseError = "Tidak ada transaksi yang berhasil dibaca dari file.";
        log("PARSE_EMPTY");
      } else {
        log("PARSE_OK", `rows=${parsedRows.length}`);
      }
    } catch (e: any) {
      parseError = e.message ?? "Gagal membaca file.";
      log("PARSE_ERROR", parseError ?? undefined);
    }

    if (parseError) {
      const updateData = { status: UploadStatus.FAILED, errorMessage: parseError };
      if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: updateData });
      else await db.walletStatementUpload.update({ where: { id: uploadId }, data: updateData });
      log("DONE_FAILED", parseError);
      return { logs };
    }

    // Auto-detect period
    const allDates = parsedRows.map((r) => parseDate(r.date)).filter((d): d is Date => d !== null);
    const detectedStart = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
    const detectedEnd   = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

    if (sourceType === "BANK") {
      await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    } else {
      await db.walletStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    }

    // Load kategori sekali saja
    const categories = await loadCategories(payload.userId);
    log("CATEGORIES_LOADED", `count=${categories.length}`);

    type TxRecord = {
      hash: string;
      txDate: Date;
      valueDate: Date | null;
      description: string;
      reference: string | null;
      amount: number;
      type: TransactionType;
      balance: number | null;
      catIds: string[];
    };

    const validTx: TxRecord[] = [];
    let failCount = 0;

    for (const row of parsedRows) {
      if (!row.description && !row.date) { failCount++; continue; }
      const txDate = parseDate(row.date);
      if (!txDate) { failCount++; continue; }
      const creditAmt = parseAmount(row.credit);
      const debitAmt  = parseAmount(row.debit);
      const amount    = creditAmt > 0 ? creditAmt : debitAmt;
      if (amount === 0) { failCount++; continue; }
      const type      = detectType(row.description, row.debit, row.credit, row.sign);
      const balance   = parseAmount(row.balance);
      const valueDate = parseDate(row.valueDate);
      const catIds    = resolveCategoryIds(row.description, categories);
      const hash      = crypto
        .createHash("md5")
        .update(`${accountId}|${txDate.toISOString()}|${amount}|${balance}`)
        .digest("hex");
      validTx.push({
        hash, txDate, valueDate,
        description: row.description,
        reference: row.reference || null,
        amount, type,
        balance: balance || null,
        catIds,
      });
    }

    // Cek hash yang sudah ada di DB (satu query)
    const existingHashes = new Set<string>();
    if (validTx.length > 0) {
      const hashes = validTx.map((t) => t.hash);
      if (sourceType === "BANK") {
        const existing = await prisma.bankTransaction.findMany({
          where: { hash: { in: hashes } },
          select: { hash: true },
        });
        existing.forEach((e) => existingHashes.add(e.hash!));
      } else {
        const existing = await db.walletTransaction.findMany({
          where: { hash: { in: hashes } },
          select: { hash: true },
        });
        existing.forEach((e: any) => existingHashes.add(e.hash));
      }
    }

    const newTx = validTx.filter((t) => !existingHashes.has(t.hash));
    log("DEDUP_OK", `valid=${validTx.length} existing=${existingHashes.size} new=${newTx.length}`);

    // Batch insert dalam chunk 100
    const BATCH_SIZE = 100;
    let insertFailed = 0;

    for (let i = 0; i < newTx.length; i += BATCH_SIZE) {
      const chunk = newTx.slice(i, i + BATCH_SIZE);
      try {
        if (sourceType === "BANK") {
          await prisma.bankTransaction.createMany({
            data: chunk.map((t) => ({
              bankAccountId: accountId,
              uploadId,
              transactionDate: t.txDate,
              valueDate: t.valueDate ?? undefined,
              description: t.description,
              reference: t.reference,
              amount: t.amount,
              type: t.type,
              balance: t.balance,
              status: EStatementStatus.VERIFIED,
              hash: t.hash,
            })),
            skipDuplicates: true,
          });
          // Insert junction rows untuk kategori
          const inserted = await prisma.bankTransaction.findMany({
            where: { hash: { in: chunk.map((t) => t.hash) } },
            select: { id: true, hash: true },
          });
          const hashToId = Object.fromEntries(inserted.map((r) => [r.hash!, r.id]));
          const junctionRows = chunk
            .flatMap((t) => t.catIds.map((catId) => ({ transactionId: hashToId[t.hash], categoryId: catId })))
            .filter((r) => r.transactionId);
          if (junctionRows.length > 0) {
            await (prisma as any).bankTransactionCategory.createMany({ data: junctionRows, skipDuplicates: true });
          }
        } else {
          await db.walletTransaction.createMany({
            data: chunk.map((t) => ({
              walletId: accountId,
              uploadId,
              transactionDate: t.txDate,
              description: t.description,
              reference: t.reference,
              amount: t.amount,
              type: t.type,
              balance: t.balance,
              status: EStatementStatus.VERIFIED,
              hash: t.hash,
            })),
            skipDuplicates: true,
          });
          const inserted = await db.walletTransaction.findMany({
            where: { hash: { in: chunk.map((t) => t.hash) } },
            select: { id: true, hash: true },
          });
          const hashToId = Object.fromEntries(inserted.map((r: any) => [r.hash!, r.id]));
          const junctionRows = chunk
            .flatMap((t) => t.catIds.map((catId) => ({ transactionId: hashToId[t.hash], categoryId: catId })))
            .filter((r) => r.transactionId);
          if (junctionRows.length > 0) {
            await db.walletTransactionCategory.createMany({ data: junctionRows, skipDuplicates: true });
          }
        }
      } catch {
        insertFailed += chunk.length;
      }
    }

    // Hitung summary dari DB
    let actualCredit = 0;
    let actualDebit  = 0;
    let actualCount  = 0;

    if (sourceType === "BANK") {
      const agg = await prisma.bankTransaction.aggregate({
        where: { uploadId },
        _sum: { amount: true },
        _count: { id: true },
      });
      const creditAgg = await prisma.bankTransaction.aggregate({
        where: { uploadId, type: TransactionType.CREDIT },
        _sum: { amount: true },
      });
      actualCount  = agg._count.id;
      actualCredit = Number(creditAgg._sum.amount ?? 0);
      actualDebit  = Number(agg._sum.amount ?? 0) - actualCredit;
    } else {
      const agg = await db.walletTransaction.aggregate({
        where: { uploadId },
        _sum: { amount: true },
        _count: { id: true },
      });
      const creditAgg = await db.walletTransaction.aggregate({
        where: { uploadId, type: TransactionType.CREDIT },
        _sum: { amount: true },
      });
      actualCount  = agg._count.id;
      actualCredit = Number(creditAgg._sum.amount ?? 0);
      actualDebit  = Number(agg._sum.amount ?? 0) - actualCredit;
    }

    failCount += insertFailed;
    const successCount    = actualCount;
    const duplicateCount  = validTx.length - newTx.length;
    const newCount        = newTx.length - insertFailed;
    const overlapNotes    = `new:${newCount},duplicate:${duplicateCount},failed:${failCount}`;

    const finalStatus =
      failCount === 0
        ? UploadStatus.SUCCESS
        : successCount === 0 && newCount === 0
          ? UploadStatus.FAILED
          : UploadStatus.PARTIAL;

    const summaryData = {
      status: finalStatus,
      totalRows: parsedRows.length,
      parsedRows: successCount,
      failedRows: failCount,
      totalCredit: actualCredit,
      totalDebit: actualDebit,
      notes: overlapNotes,
    };

    if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: summaryData });
    else await db.walletStatementUpload.update({ where: { id: uploadId }, data: summaryData });

    log("DONE_OK", `status=${finalStatus} parsed=${successCount} new=${newCount} dup=${duplicateCount} failed=${failCount}`);

    // Hapus file dari Blob setelah selesai
    try {
      const { del } = await import("@vercel/blob");
      await del(blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      log("BLOB_DELETED");
    } catch { /* tidak fatal */ }

    return { logs };

  } catch (error: any) {
    console.error("processUpload error:", error);
    log("FATAL_ERROR", error.message);
    const errData = { status: UploadStatus.FAILED, errorMessage: "Internal error: " + error.message };
    try {
      if (sourceType === "BANK") await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: errData });
      else await (prisma as any).walletStatementUpload.update({ where: { id: uploadId }, data: errData });
    } catch { /* ignore */ }
    throw error;
  }
}

// ─── HTTP handler (dipanggil oleh QStash) ────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Baca raw body untuk verifikasi signature QStash
  const rawBody = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  // Verifikasi signature dari QStash
  const qstashSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (qstashSigningKey) {
    const signature = req.headers["upstash-signature"] as string;
    if (!signature) {
      console.error("[process] Missing QStash signature header");
      return res.status(401).json({ message: "Missing QStash signature" });
    }
    try {
      const { Receiver } = await import("@upstash/qstash");
      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
        nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY!,
      });
      const isValid = await receiver.verify({ signature, body: rawBody });
      if (!isValid) {
        console.error("[process] Invalid QStash signature");
        return res.status(401).json({ message: "Invalid QStash signature" });
      }
    } catch (e: any) {
      console.error("[process] Signature verification failed:", e.message);
      return res.status(401).json({ message: "Signature verification failed: " + e.message });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  if (!payload?.uploadId) return res.status(400).json({ message: "Missing uploadId" });

  console.log("[process] Starting processUpload for uploadId:", payload.uploadId);

  try {
    await processUpload(payload);
    console.log("[process] processUpload completed for uploadId:", payload.uploadId);
    return res.status(200).json({ message: "Processing completed" });
  } catch (e: any) {
    console.error("[process] processUpload failed:", e.message);
    return res.status(500).json({ message: "Processing failed: " + e.message });
  }
}
