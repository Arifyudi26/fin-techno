/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { FileFormat, UploadStatus } from "@prisma/client";
import crypto from "crypto";
import { put } from "@vercel/blob";
import path from "path";
import { processUpload } from "./process";
import { parseMultipart } from "@lib/multipartParser";

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const { fields, file } = await parseMultipart(req);

    const sourceType = (fields.sourceType ?? "BANK").toUpperCase();
    const accountId = fields.accountId;
    const notes = fields.notes ?? "";
    const pdfPassword = fields.pdfPassword ?? undefined;

    if (!accountId) return res.status(400).json({ message: "accountId wajib diisi" });
    if (!file) return res.status(400).json({ message: "File tidak ditemukan" });

    const ext = path.extname(file.filename).toLowerCase().replace(".", "").toUpperCase();
    if (!["CSV", "XLSX", "XLS", "PDF"].includes(ext)) {
      return res.status(400).json({ message: `Format ${ext} tidak didukung.` });
    }

    const fileFormat = ext as FileFormat;
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");
    const fileName = file.filename || `upload_${Date.now()}.${ext.toLowerCase()}`;
    const db = prisma as any;

    // Verify account
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

    const jobPayload = { uploadId, sourceType, accountId, fileUrl: blob.url, fileFormat, userId, pdfPassword };

    // Await processUpload — on Vercel serverless, fire-and-forget gets killed after res.end()
    try {
      await processUpload(jobPayload);
    } catch (err: any) {
      console.error("[submit] processUpload error:", err);
      // Status already set to FAILED inside processUpload, just return error to client
      return res.status(500).json({ message: "Gagal memproses file: " + err.message });
    }

    // Fetch final upload status to return to client
    let finalStatus = "PROCESSING";
    let parsedRows = 0;
    let totalRows = 0;
    let errorMessage: string | null = null;
    try {
      if (sourceType === "BANK") {
        const up = await prisma.bankStatementUpload.findUnique({ where: { id: uploadId }, select: { status: true, parsedRows: true, totalRows: true, errorMessage: true } });
        finalStatus = up?.status ?? "PROCESSING";
        parsedRows = up?.parsedRows ?? 0;
        totalRows = up?.totalRows ?? 0;
        errorMessage = up?.errorMessage ?? null;
      } else {
        const up = await (prisma as any).walletStatementUpload.findUnique({ where: { id: uploadId }, select: { status: true, parsedRows: true, totalRows: true, errorMessage: true } });
        finalStatus = up?.status ?? "PROCESSING";
        parsedRows = up?.parsedRows ?? 0;
        totalRows = up?.totalRows ?? 0;
        errorMessage = up?.errorMessage ?? null;
      }
    } catch { /* non-fatal */ }

    if (finalStatus === "FAILED") {
      return res.status(422).json({ message: errorMessage ?? "Gagal memproses file.", uploadId, status: finalStatus });
    }

    return res.status(200).json({ uploadId, status: finalStatus, parsedRows, totalRows });

  } catch (error: any) {
    console.error("[submit] error:", error);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
}
