/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  try {
    const db = prisma as any;

    const [bankUploads, walletUploads] = await Promise.all([
      prisma.bankStatementUpload.findMany({
        where: { uploadedById: userId },
        include: { bankAccount: { select: { bankProvider: true, accountNumber: true, accountName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.walletStatementUpload.findMany({
        where: { uploadedById: userId },
        include: { wallet: { select: { walletProvider: true, phoneNumber: true, accountName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const bank = bankUploads.map((u: any) => ({
      id: u.id,
      sourceType: "BANK",
      provider: u.bankAccount.bankProvider,
      accountIdentifier: `***${u.bankAccount.accountNumber.slice(-4)}`,
      accountName: u.bankAccount.accountName,
      fileName: u.fileName,
      fileFormat: u.fileFormat,
      fileSizeBytes: u.fileSizeBytes,
      periodStart: u.periodStart.toISOString().split("T")[0],
      periodEnd: u.periodEnd.toISOString().split("T")[0],
      status: u.status,
      errorMessage: u.errorMessage,
      totalRows: u.totalRows,
      parsedRows: u.parsedRows,
      failedRows: u.failedRows,
      totalCredit: Number(u.totalCredit),
      totalDebit: Number(u.totalDebit),
      uploadedAt: u.createdAt.toISOString(),
      notes: u.notes ?? null,
    }));

    const wallet = walletUploads.map((u: any) => ({
      id: u.id,
      sourceType: "WALLET",
      provider: u.wallet.walletProvider,
      accountIdentifier: `***${u.wallet.phoneNumber.slice(-4)}`,
      accountName: u.wallet.accountName,
      fileName: u.fileName,
      fileFormat: u.fileFormat,
      fileSizeBytes: u.fileSizeBytes,
      periodStart: u.periodStart.toISOString().split("T")[0],
      periodEnd: u.periodEnd.toISOString().split("T")[0],
      status: u.status,
      errorMessage: u.errorMessage,
      totalRows: u.totalRows,
      parsedRows: u.parsedRows,
      failedRows: u.failedRows,
      totalCredit: Number(u.totalCredit),
      totalDebit: Number(u.totalDebit),
      uploadedAt: u.createdAt.toISOString(),
      notes: u.notes ?? null,
    }));

    const all = [...bank, ...wallet].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return res.status(200).json({ uploads: all, total: all.length });
  } catch (error) {
    console.error("upload list error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
