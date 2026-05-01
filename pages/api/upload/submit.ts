/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { FileFormat, UploadStatus } from "@prisma/client";
import crypto from "crypto";
import { put } from "@vercel/blob";
import path from "path";
import { parseMultipart } from "@lib/multipartParser";
import { isBniPdfPasswordProtected, verifyBniPdfPassword } from "@lib/upload/parsers/bni";

export const config = {
  api: { bodyParser: false },
  maxDuration: 30,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const { fields, file } = await parseMultipart(req);

    const sourceType  = (fields.sourceType ?? "BANK").toUpperCase();
    const accountId   = fields.accountId;
    const notes       = fields.notes ?? "";
    const pdfPassword = fields.pdfPassword ?? "";

    if (!accountId) return res.status(400).json({ message: "accountId wajib diisi" });
    if (!file)      return res.status(400).json({ message: "File tidak ditemukan" });

    const ext = path.extname(file.filename).toLowerCase().replace(".", "").toUpperCase();
    if (!["CSV", "XLSX", "XLS", "PDF"].includes(ext)) {
      return res.status(400).json({ message: `Format ${ext} tidak didukung.` });
    }

    const fileFormat = ext as FileFormat;
    const fileHash   = crypto.createHash("md5").update(file.buffer).digest("hex");
    const fileName   = file.filename || `upload_${Date.now()}.${ext.toLowerCase()}`;
    const db         = prisma as any;

    // Verify account & ambil providerName
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

    // ── Khusus BNI PDF: cek password ─────────────────────────────────────────
    if (sourceType === "BANK" && providerName === "BNI" && fileFormat === "PDF") {
      if (!pdfPassword) {
        // Belum ada password — cek apakah file memang butuh password
        const needsPassword = await isBniPdfPasswordProtected(file.buffer);
        if (needsPassword) {
          return res.status(423).json({
            code: "PDF_PASSWORD_REQUIRED",
            message: "File PDF BNI ini dilindungi password. Masukkan password untuk melanjutkan.",
          });
        }
      } else {
        // Password sudah diberikan — verifikasi kebenarannya sebelum lanjut
        const passwordOk = await verifyBniPdfPassword(file.buffer, pdfPassword);
        if (!passwordOk) {
          return res.status(422).json({
            code: "PDF_PASSWORD_WRONG",
            message: "Password PDF salah. Periksa kembali password e-Statement BNI Anda.",
          });
        }
      }
    }

    // Cek duplikat nama
    const baseNameWithoutExt = fileName.replace(/\.[^/.]+$/, "").toLowerCase();
    if (sourceType === "BANK") {
      const existing = await prisma.bankStatementUpload.findFirst({
        where: { bankAccountId: accountId, fileName: { contains: baseNameWithoutExt, mode: "insensitive" } },
        select: { id: true, fileName: true },
      });
      if (existing) return res.status(409).json({ message: `File "${existing.fileName}" sudah pernah diupload.`, code: "DUPLICATE_FILENAME" });
    } else {
      const existing = await db.walletStatementUpload.findFirst({
        where: { walletId: accountId, fileName: { contains: baseNameWithoutExt, mode: "insensitive" } },
        select: { id: true, fileName: true },
      });
      if (existing) return res.status(409).json({ message: `File "${existing.fileName}" sudah pernah diupload.`, code: "DUPLICATE_FILENAME" });
    }

    // Cek duplikat konten
    if (sourceType === "BANK") {
      const existing = await prisma.bankStatementUpload.findFirst({
        where: { bankAccountId: accountId, fileUrl: { endsWith: fileHash } },
        select: { id: true, fileName: true },
      });
      if (existing) return res.status(409).json({ message: `Konten identik dengan "${existing.fileName}".`, code: "DUPLICATE_CONTENT" });
    } else {
      const existing = await db.walletStatementUpload.findFirst({
        where: { walletId: accountId, fileUrl: { endsWith: fileHash } },
        select: { id: true, fileName: true },
      });
      if (existing) return res.status(409).json({ message: `Konten identik dengan "${existing.fileName}".`, code: "DUPLICATE_CONTENT" });
    }

    // Upload ke Vercel Blob
    const blobPath = `statements/${userId}/${crypto.randomUUID()}_${fileName}`;
    const blob = await put(blobPath, file.buffer, {
      access: "private",
      contentType: fileFormat === "PDF" ? "application/pdf" : "text/plain",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const fileUrl = `${blob.url}#${fileHash}`;

    // Buat upload record
    let uploadId: string;
    if (sourceType === "BANK") {
      const upload = await prisma.bankStatementUpload.create({
        data: {
          bankAccountId: accountId, uploadedById: userId, fileName, fileUrl,
          fileFormat, fileSizeBytes: file.size,
          bankProvider: providerName as any,
          periodStart: new Date(), periodEnd: new Date(),
          status: UploadStatus.PROCESSING, notes,
        },
      });
      uploadId = upload.id;
    } else {
      const upload = await db.walletStatementUpload.create({
        data: {
          walletId: accountId, uploadedById: userId, fileName, fileUrl,
          fileFormat, fileSizeBytes: file.size,
          walletProvider: providerName,
          periodStart: new Date(), periodEnd: new Date(),
          status: UploadStatus.PROCESSING, notes,
        },
      });
      uploadId = upload.id;
    }

    const jobPayload = {
      uploadId,
      sourceType,
      accountId,
      fileUrl: blob.url,
      fileFormat,
      userId,
      bankProvider: providerName,
      pdfPassword: pdfPassword || undefined,
    };

    // Trigger background processing via QStash
    const baseUrl    = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const processUrl = `${baseUrl}/api/upload/process`;

    console.log("[submit] Queuing processUpload via QStash for", uploadId, "→", processUrl);

    try {
      const { Client } = await import("@upstash/qstash");
      const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
      await qstash.publishJSON({ url: processUrl, body: jobPayload, retries: 2 });
      console.log("[submit] QStash queued for", uploadId);
    } catch (qErr: any) {
      console.error("[submit] QStash failed, falling back to sync processing:", qErr.message);
      const { processUpload } = await import("./process");
      await processUpload(jobPayload).catch((e: any) =>
        console.error("[submit] Sync fallback also failed:", e.message)
      );
    }

    return res.status(202).json({
      uploadId,
      status: "PROCESSING",
      message: "File berhasil diupload dan sedang diproses di background.",
    });

  } catch (error: any) {
    console.error("[submit] error:", error);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
}
