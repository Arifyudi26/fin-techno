/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { FileFormat, UploadStatus } from "@prisma/client";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { Client } from "@upstash/qstash";
import path from "path";

export const config = { api: { bodyParser: false } };

// Parse multipart via busboy — stream ke memory, tanpa disk I/O
function parseMultipart(req: NextApiRequest): Promise<{
  fields: Record<string, string>;
  file: { buffer: Buffer; filename: string; size: number } | null;
}> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Busboy = require("busboy");
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
    const fields: Record<string, string> = {};
    let fileResult: { buffer: Buffer; filename: string; size: number } | null = null;

    bb.on("field", (name: string, val: string) => { fields[name] = val; });
    bb.on("file", (_field: string, stream: any, info: any) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        fileResult = { buffer, filename: info.filename, size: buffer.length };
      });
      stream.on("error", reject);
    });
    bb.on("finish", () => resolve({ fields, file: fileResult }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}

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

    // Upload ke Vercel Blob (server-side, private store)
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

    // Kirim ke QStash atau proses lokal
    const appUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const qstashToken = process.env.QSTASH_TOKEN;
    const isLocal = !process.env.VERCEL_URL;
    const jobPayload = { uploadId, sourceType, accountId, fileUrl: blob.url, fileFormat, userId };

    if (!qstashToken || isLocal) {
      res.status(202).json({ uploadId, status: "PROCESSING", message: "File sedang diproses." });
      import("./process")
        .then(({ processUpload }) => processUpload(jobPayload))
        .catch((e) => console.error("process error:", e));
    } else {
      const qstash = new Client({ token: qstashToken, baseUrl: process.env.QSTASH_URL });
      await qstash.publishJSON({
        url: `${appUrl}/api/upload/process`,
        body: jobPayload,
        retries: 3,
        delay: 1,
      });
      return res.status(202).json({ uploadId, status: "PROCESSING", message: "File sedang diproses di background." });
    }
  } catch (error: any) {
    console.error("upload submit error:", error);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
}
