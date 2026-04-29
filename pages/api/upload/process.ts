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

// Vercel: set maxDuration agar tidak timeout saat proses file besar
export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

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
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
}

// Column mapping 
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

/** Ekstrak teks dari PDF menggunakan pdfjs-dist (mendukung PDF terproteksi password) */
async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password ?? "",
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  let pdf: any;
  try {
    pdf = await loadingTask.promise;
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (msg.includes("No password") || msg.includes("Incorrect Password") || msg.includes("password")) {
      throw new Error(
        password
          ? "Password PDF salah. Periksa kembali password yang dimasukkan."
          : "PDF ini terproteksi password. Masukkan password PDF untuk melanjutkan."
      );
    }
    throw e;
  }

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: Array<{ str: string; y: number; x: number }> = (content.items as any[]).map((item: any) => ({
      str: item.str as string,
      y: item.transform[5] as number,  // keep full precision
      x: item.transform[4] as number,
    })).filter((item) => item.str.trim());

    if (items.length === 0) continue;

    // Sort by Y descending (top of page first), then X ascending
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group into lines using Y tolerance of 3 units
    const TOLERANCE = 3;
    const lineGroups: Array<{ y: number; items: Array<{ str: string; x: number }> }> = [];
    for (const item of items) {
      const lastGroup = lineGroups[lineGroups.length - 1];
      if (lastGroup && Math.abs(item.y - lastGroup.y) <= TOLERANCE) {
        lastGroup.items.push({ str: item.str, x: item.x });
      } else {
        lineGroups.push({ y: item.y, items: [{ str: item.str, x: item.x }] });
      }
    }

    for (const group of lineGroups) {
      group.items.sort((a, b) => a.x - b.x);
      pageTexts.push(group.items.map((i) => i.str).join("  "));
    }
  }
  return pageTexts.join("\n");
}

/** Parser BNI PDF — format per transaksi (3 baris):
 *  Line 1: " DD Mon YYYY  <TipeTransaksi>"
 *  Line 2: "<+/->Nominal   Saldo"
 *  Line 3: "HH:MM:SS WIB  <Keterangan>"
 */
function parseBniPdfText(text: string, debugLog?: (msg: string) => void): ParsedRow[] {
  const log = debugLog ?? (() => {});
  const allLines = text.split("\n").map((l) => l.trim()).filter((l) => l.trim());
  log(`parseBniPdfText: total lines=${allLines.length}`);

  // BNI date line: "DD Mon YYYY <TipeTransaksi>"
  // e.g. "01 Dec 2025 Pembayaran Qris"
  const DATE_LINE = /^(\d{2}\s+\w{3}\s+\d{4})\s+(.+)$/;
  // Amount+balance line: "-20,000   1,023,097" or "+900,000   1,903,749"
  const AMOUNT_LINE = /^([+-][\d,]+)\s+([\d,]+)$/;
  // Time+desc line: "08:02:06 WIB KUE SUBUH JUARA - DEPOK"
  const TIME_LINE = /^(\d{2}:\d{2}:\d{2})\s+WIB\s+(.*)$/;

  // Month name → number
  const MONTHS: Record<string, string> = {
    Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
    Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
  };

  const rows: ParsedRow[] = [];
  let i = 0;

  while (i < allLines.length) {
    const line = allLines[i];
    const dateMatch = line.match(DATE_LINE);

    if (dateMatch) {
      const rawDate = dateMatch[1]; // "01 Dec 2025"
      const txType  = dateMatch[2]; // "Pembayaran Qris"

      // Parse date → DD/MM/YYYY
      const [dd, mon, yyyy] = rawDate.split(/\s+/);
      const mm = MONTHS[mon] ?? "01";

      // Next line should be amount + balance
      const amtLine = allLines[i + 1] ?? "";
      const amtMatch = amtLine.match(AMOUNT_LINE);

      // Line after that should be time + description
      const timeLine = allLines[i + 2] ?? "";
      const timeMatch = timeLine.match(TIME_LINE);

      if (amtMatch && timeMatch) {
        const nominalRaw = amtMatch[1]; // e.g. "-20,000" or "+900,000"
        const balanceRaw = amtMatch[2]; // e.g. "1,023,097"
        const timeStr    = timeMatch[1]; // "08:02:06"
        const desc       = (timeMatch[2] || txType).trim();

        const nominalNum = Number(nominalRaw.replace(/,/g, ""));
        const balanceNum = Number(balanceRaw.replace(/,/g, ""));
        const isCredit   = nominalNum > 0;
        const amount     = Math.abs(nominalNum);

        rows.push({
          date:           `${dd}/${mm}/${yyyy} ${timeStr}`,
          valueDate:      "",
          description:    desc || txType,
          debit:          isCredit ? "0" : String(amount),
          credit:         isCredit ? String(amount) : "0",
          openingBalance: "",
          balance:        String(balanceNum),
          reference:      "",
          sign:           isCredit ? "Cr" : "Db",
        });

        i += 3;
        continue;
      }
    }
    i++;
  }

  log(`parseBniPdfText rows=${rows.length}`);
  return rows;
}

// parseBniColumnar removed — BNI format is now handled by parseBniPdfText

async function parsePDF(buffer: Buffer, password?: string, debugLog?: (msg: string) => void): Promise<ParsedRow[]> {
  const log = debugLog ?? (() => {});
  const text = await extractPdfText(buffer, password);
  log(`extractPdfText done, length=${text.length}`);
  // Log first 2000 chars of raw text for debugging
  log(`RAW_TEXT_SAMPLE: ${JSON.stringify(text.slice(0, 2000))}`);
  return parseBniPdfText(text, log);
}

// Core processing logic 
export type ProcessLog = { ts: string; step: string; detail?: string };

export async function processUpload(payload: {
  uploadId: string;
  sourceType: string;
  accountId: string;
  fileUrl: string;
  fileFormat: string;
  userId: string;
  pdfPassword?: string;
}): Promise<{ logs: ProcessLog[] }> {
  const { uploadId, sourceType, accountId, fileUrl, fileFormat, pdfPassword } = payload;
  const db = prisma as any;
  const logs: ProcessLog[] = [];
  const log = (step: string, detail?: string) => {
    const entry: ProcessLog = { ts: new Date().toISOString(), step, detail };
    logs.push(entry);
    console.log(`[processUpload] ${step}${detail ? " | " + detail : ""}`);
  };

  try {
    log("START", `uploadId=${uploadId} format=${fileFormat} sourceType=${sourceType}`);

    // Download file dari Vercel Blob
    const blobUrl = fileUrl.split("#")[0];
    log("DOWNLOAD_START", blobUrl);
    const response = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!response.ok) throw new Error(`Gagal download file: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileContent = fileFormat !== "PDF" ? fileBuffer.toString("utf-8") : "";
    log("DOWNLOAD_OK", `size=${fileBuffer.length} bytes`);

    // Parse file
    let parsedRows: ParsedRow[] = [];
    let parseError: string | null = null;

    if (fileFormat === "CSV") {
      try {
        parsedRows = parseRows(parseCSV(fileContent));
        log("PARSE_CSV_OK", `rows=${parsedRows.length}`);
      } catch (e: any) {
        parseError = "Gagal membaca CSV: " + e.message;
        log("PARSE_CSV_ERROR", parseError);
      }
    } else if (fileFormat === "PDF") {
      try {
        log("PARSE_PDF_START");
        parsedRows = await parsePDF(fileBuffer, pdfPassword, (msg) => log("PDF_DEBUG", msg));
        if (parsedRows.length === 0) {
          parseError = "Tidak ada transaksi yang berhasil dibaca dari PDF.";
          log("PARSE_PDF_EMPTY");
        } else {
          log("PARSE_PDF_OK", `rows=${parsedRows.length}`);
        }
      } catch (e: any) {
        parseError = "Gagal membaca PDF: " + e.message;
        log("PARSE_PDF_ERROR", parseError);
      }
    } else {
      try {
        parsedRows = parseRows(parseCSV(fileContent));
        log("PARSE_OTHER_OK", `rows=${parsedRows.length}`);
      } catch {
        parseError = "Gagal membaca file. Pastikan format sesuai template.";
        log("PARSE_OTHER_ERROR", parseError);
      }
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
    const detectedEnd = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

    if (sourceType === "BANK") {
      await prisma.bankStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    } else {
      await db.walletStatementUpload.update({ where: { id: uploadId }, data: { periodStart: detectedStart, periodEnd: detectedEnd } });
    }

    // Load kategori sekali saja (bukan per-row)
    const categories = await loadCategories(payload.userId);
    log("CATEGORIES_LOADED", `count=${categories.length}`);
    // Build semua transaksi valid terlebih dahulu
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
      const debitAmt = parseAmount(row.debit);
      const amount = creditAmt > 0 ? creditAmt : debitAmt;
      if (amount === 0) { failCount++; continue; }
      const type = detectType(row.description, row.debit, row.credit, row.sign);
      const balance = parseAmount(row.balance);
      const valueDate = parseDate(row.valueDate);
      const catIds = resolveCategoryIds(row.description, categories);
      const hash = crypto.createHash("md5").update(`${accountId}|${txDate.toISOString()}|${amount}|${balance}`).digest("hex");
      validTx.push({ hash, txDate, valueDate, description: row.description, reference: row.reference || null, amount, type, balance: balance || null, catIds });
    }

    // Cek hash yang sudah ada di DB (satu query, bukan N queries)
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

    // Filter hanya transaksi baru (belum ada di DB)
    const newTx = validTx.filter((t) => !existingHashes.has(t.hash));
    log("DEDUP_OK", `valid=${validTx.length} existing=${existingHashes.size} new=${newTx.length}`);

    // Batch insert dalam chunk 100 agar tidak overload DB
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
          // Insert junction rows for categories
          const inserted = await prisma.bankTransaction.findMany({
            where: { hash: { in: chunk.map((t) => t.hash) } },
            select: { id: true, hash: true },
          });
          const hashToId = Object.fromEntries(inserted.map((r) => [r.hash!, r.id]));
          const junctionRows = chunk.flatMap((t) =>
            t.catIds.map((catId) => ({ transactionId: hashToId[t.hash], categoryId: catId }))
          ).filter((r) => r.transactionId);
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
          // Insert junction rows for categories
          const inserted = await db.walletTransaction.findMany({
            where: { hash: { in: chunk.map((t) => t.hash) } },
            select: { id: true, hash: true },
          });
          const hashToId = Object.fromEntries(inserted.map((r: any) => [r.hash!, r.id]));
          const junctionRows = chunk.flatMap((t) =>
            t.catIds.map((catId) => ({ transactionId: hashToId[t.hash], categoryId: catId }))
          ).filter((r) => r.transactionId);
          if (junctionRows.length > 0) {
            await db.walletTransactionCategory.createMany({ data: junctionRows, skipDuplicates: true });
          }
        }
      } catch {
        insertFailed += chunk.length;
      }
    }

    // Hitung summary langsung dari DB — sumber kebenaran tunggal
    // Ini menangani kasus duplikat (semua skip) maupun insert sebagian
    let actualCredit = 0;
    let actualDebit = 0;
    let actualCount = 0;

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
      actualCount = agg._count.id;
      actualCredit = Number(creditAgg._sum.amount ?? 0);
      actualDebit = Number(agg._sum.amount ?? 0) - actualCredit;
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
      actualCount = agg._count.id;
      actualCredit = Number(creditAgg._sum.amount ?? 0);
      actualDebit = Number(agg._sum.amount ?? 0) - actualCredit;
    }

    const successCount = actualCount;
    const totalCredit = actualCredit;
    const totalDebit = actualDebit;
    // failCount = baris yang tidak bisa di-parse (bukan duplikat)
    // insertFailed = baris yang gagal masuk DB karena error teknis
    failCount += insertFailed;

    // Hitung berapa baris yang overlap (sudah ada di DB dari upload lain)
    const duplicateCount = validTx.length - newTx.length;
    const newCount = newTx.length - insertFailed;

    // Simpan info overlap di notes agar UI bisa menampilkan dengan jelas
    // Format: "new:38,duplicate:52,failed:0" 
    const overlapNotes = `new:${newCount},duplicate:${duplicateCount},failed:${failCount}`;

    // Update summary
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
      totalCredit,
      totalDebit,
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

// HTTP handler (dipanggil oleh QStash) 
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
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
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

  // Di Vercel serverless, JANGAN respond dulu lalu proses di background
  // karena function akan di-kill setelah res.end().
  // QStash menunggu response, jadi proses dulu baru respond.
  try {
    await processUpload(payload);
    console.log("[process] processUpload completed for uploadId:", payload.uploadId);
    return res.status(200).json({ message: "Processing completed" });
  } catch (e: any) {
    console.error("[process] processUpload failed:", e.message);
    // Return 500 agar QStash retry
    return res.status(500).json({ message: "Processing failed: " + e.message });
  }
}
