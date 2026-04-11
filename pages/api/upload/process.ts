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

// Category rules (tanpa DB query per-row) 
const CATEGORY_RULES: Record<string, string[]> = {
  GAJ: ["gaji", "salary", "thr", "bonus", "payroll"],
  UTL: ["listrik", "pln", "pdam", "air", "internet", "telkom", "indihome", "wifi", "bpjs"],
  PAJ: ["pajak", "pph", "ppn", "bphtb"],
  INV: ["investasi", "deposito", "saham", "reksa", "obligasi"],
  OPS: ["operasional", "supplier", "vendor", "pembelian", "bahan"],
};

type CategoryMap = Map<string, string>; // code -> id

// Load semua kategori sekali, kembalikan Map untuk lookup O(1)
async function loadCategories(): Promise<CategoryMap> {
  const cats = await prisma.transactionCategory.findMany({
    select: { id: true, code: true },
  });
  return new Map(cats.map((c) => [c.code, c.id]));
}

function resolveCategoryId(desc: string, categoryMap: CategoryMap): string | null {
  const lower = desc.toLowerCase();
  for (const [code, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some((k) => lower.includes(k))) {
      return categoryMap.get(code) ?? null;
    }
  }
  return categoryMap.get("LNY") ?? null;
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
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const data = await parser.getText();

  // Strip footer/summary section — BRI PDF selalu punya "Saldo Awal" di akhir
  // Potong teks sebelum baris summary agar tidak ikut ter-parse
  let text = data.text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const summaryMarkers = [
    "Saldo Awal",
    "Opening Balance",
    "Total Transaksi Debet",
    "Terbilang",
  ];
  for (const marker of summaryMarkers) {
    const idx = text.indexOf(marker);
    if (idx > 0) {
      text = text.slice(0, idx);
      break;
    }
  }

  const rows: ParsedRow[] = [];
  const DATE_SPLIT = /(?=\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/g;
  const chunks = text.split(DATE_SPLIT).filter((c: string) => /^\d{2}\/\d{2}\/\d{2}/.test(c.trim()));

  for (const chunk of chunks) {
    const clean = chunk.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    const dateMatch = clean.match(/^(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) /);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const rest = clean.slice(dateMatch[0].length).trim();

    // Cari semua angka format ribuan: 1,234.00 atau 0.00
    const allNums = [...rest.matchAll(/[\d,]+\.\d{2}/g)];
    // Butuh minimal 3 angka: debit, kredit, saldo
    if (allNums.length < 3) continue;

    const balanceStr = allNums[allNums.length - 1][0];
    const creditStr = allNums[allNums.length - 2][0];
    const debitStr = allNums[allNums.length - 3][0];
    const firstNumIdx = allNums[allNums.length - 3].index!;

    // Deskripsi = teks sebelum angka pertama, strip Teller ID di akhir
    let descRaw = rest.slice(0, firstNumIdx).trim();
    // Hapus Teller ID (angka 7+ digit atau kode huruf kapital) di akhir deskripsi
    descRaw = descRaw.replace(/\s+(\d{5,}|[A-Z]{3,}[A-Z0-9]*)$/, "").trim();
    if (!descRaw) continue;

    // Tentukan sign dari nilai debit/kredit
    const parseAmt = (v: string) => Math.abs(Number(v.replace(/[^0-9.-]/g, "")) || 0);
    const sign = parseAmt(creditStr) > 0 ? "Cr" : "Db";

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

// Core processing logic 
export type ProcessLog = { ts: string; step: string; detail?: string };

export async function processUpload(payload: {
  uploadId: string;
  sourceType: string;
  accountId: string;
  fileUrl: string;
  fileFormat: string;
  userId: string;
}): Promise<{ logs: ProcessLog[] }> {
  const { uploadId, sourceType, accountId, fileUrl, fileFormat } = payload;
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
        parsedRows = await parsePDF(fileBuffer);
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
    const categoryMap = await loadCategories();
    log("CATEGORIES_LOADED", `count=${categoryMap.size}`);
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
      catId: string | null;
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
      const catId = resolveCategoryId(row.description, categoryMap);
      const hash = crypto.createHash("md5").update(`${accountId}|${txDate.toISOString()}|${amount}|${balance}`).digest("hex");
      validTx.push({ hash, txDate, valueDate, description: row.description, reference: row.reference || null, amount, type, balance: balance || null, catId });
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
              categoryId: t.catId,
              hash: t.hash,
            })),
            skipDuplicates: true,
          });
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
              categoryId: t.catId,
              hash: t.hash,
            })),
            skipDuplicates: true,
          });
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
