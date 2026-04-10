/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { FileFormat, UploadStatus } from "@prisma/client";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { Client } from "@upstash/qstash";

export const config = { api: { bodyParser: false } };

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
      const accountId = fields.accountId?.[0];
      const notes = fields.notes?.[0] ?? "";

      if (!accountId) return res.status(400).json({ message: "accountId wajib diisi" });

      const fileArr = files.file;
      const file: FormidableFile | undefined = Array.isArray(fileArr) ? fileArr[0] : (fileArr as FormidableFile | undefined);
      if (!file) return res.status(400).json({ message: "File tidak ditemukan" });

      const ext = path.extname(file.originalFilename ?? "").toLowerCase().replace(".", "").toUpperCase();
      const allowedFormats = ["CSV", "XLSX", "XLS", "PDF"];
      if (!allowedFormats.includes(ext)) {
        return res.status(400).json({ message: `Format ${ext} tidak didukung. Gunakan CSV, XLSX, XLS, atau PDF.` });
      }

      const fileFormat = ext as FileFormat;
      const fileBuffer = fs.readFileSync(file.filepath);
      const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
      const fileSize = file.size;
      const fileName = file.originalFilename ?? `upload_${Date.now()}.${ext.toLowerCase()}`;

      const db = prisma as any;

      // Verify account belongs to user
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

      // ── Cek duplikat nama file ───────────────────────────────────────────
      const baseNameWithoutExt = fileName.replace(/\.[^/.]+$/, "").toLowerCase();
      if (sourceType === "BANK") {
        const existingByName = await prisma.bankStatementUpload.findFirst({
          where: { bankAccountId: accountId, fileName: { contains: baseNameWithoutExt, mode: "insensitive" } },
          select: { id: true, fileName: true },
        });
        if (existingByName) {
          return res.status(409).json({
            message: `File "${existingByName.fileName}" sudah pernah diupload.`,
            code: "DUPLICATE_FILENAME",
          });
        }
      } else {
        const existingByName = await db.walletStatementUpload.findFirst({
          where: { walletId: accountId, fileName: { contains: baseNameWithoutExt, mode: "insensitive" } },
          select: { id: true, fileName: true },
        });
        if (existingByName) {
          return res.status(409).json({
            message: `File "${existingByName.fileName}" sudah pernah diupload.`,
            code: "DUPLICATE_FILENAME",
          });
        }
      }

      // ── Cek duplikat konten (hash MD5) ───────────────────────────────────
      const fileUrlSuffix = fileHash;
      if (sourceType === "BANK") {
        const existingByHash = await prisma.bankStatementUpload.findFirst({
          where: { bankAccountId: accountId, fileUrl: { endsWith: fileUrlSuffix } },
          select: { id: true, fileName: true },
        });
        if (existingByHash) {
          return res.status(409).json({
            message: `Konten file identik dengan "${existingByHash.fileName}" yang sudah diupload.`,
            code: "DUPLICATE_CONTENT",
          });
        }
      } else {
        const existingByHash = await db.walletStatementUpload.findFirst({
          where: { walletId: accountId, fileUrl: { endsWith: fileUrlSuffix } },
          select: { id: true, fileName: true },
        });
        if (existingByHash) {
          return res.status(409).json({
            message: `Konten file identik dengan "${existingByHash.fileName}" yang sudah diupload.`,
            code: "DUPLICATE_CONTENT",
          });
        }
      }

      // ── Upload file ke Vercel Blob ────────────────────────────────────────
      const blobPath = `statements/${userId}/${crypto.randomUUID()}_${fileName}`;
      const blob = await put(blobPath, fileBuffer, {
        access: "private",
        contentType: fileFormat === "PDF" ? "application/pdf" : "text/plain",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const fileUrl = `${blob.url}#${fileHash}`;

      // ── Buat upload record (PROCESSING) ──────────────────────────────────
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

      // ── Kirim job ke QStash (background processing) ──────────────────────
      const appUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, "");

      const qstashToken = process.env.QSTASH_TOKEN;
      const isLocal = !process.env.VERCEL_URL;

      // Respond dulu ke client, baru trigger background process
      res.status(202).json({
        uploadId,
        status: "PROCESSING",
        message: "File sedang diproses di background. Cek status secara berkala.",
      });

      // Background process — jalan setelah response dikirim
      if (!qstashToken || isLocal) {
        // Fallback: proses langsung di local dev (QStash tidak bisa hit localhost)
        setImmediate(() => {
          triggerProcessDirect(uploadId, sourceType, accountId, blob.url, fileFormat, userId);
        });
      } else {
        setImmediate(async () => {
          try {
            const qstash = new Client({
              token: qstashToken,
              baseUrl: process.env.QSTASH_URL,
            });
            await qstash.publishJSON({
              url: `${appUrl}/api/upload/process`,
              body: { uploadId, sourceType, accountId, fileUrl: blob.url, fileFormat, userId },
              retries: 2,
            });
          } catch (e) {
            console.error("QStash publish error:", e);
            // Fallback ke direct process jika QStash gagal
            triggerProcessDirect(uploadId, sourceType, accountId, blob.url, fileFormat, userId);
          }
        });
      }
    } catch (error: any) {
      console.error("upload submit error:", error);
      return res.status(500).json({ message: "Internal server error: " + error.message });
    }
  });
}

// Fallback untuk dev/local: import dan jalankan langsung (fire-and-forget)
function triggerProcessDirect(
  uploadId: string,
  sourceType: string,
  accountId: string,
  fileUrl: string,
  fileFormat: string,
  userId: string,
) {
  import("./process")
    .then(({ processUpload }) =>
      processUpload({ uploadId, sourceType, accountId, fileUrl, fileFormat, userId })
    )
    .catch((e) => console.error("process error:", e));
}
