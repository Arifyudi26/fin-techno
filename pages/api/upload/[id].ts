/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "DELETE") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id, type } = req.query;
  const sourceType = (type as string)?.toUpperCase() ?? "BANK";

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      if (sourceType === "WALLET") {
        const upload = await (prisma as any).walletStatementUpload.findFirst({
          where: { id: id as string, uploadedById: userId },
        });
        if (!upload) return res.status(404).json({ message: "Upload tidak ditemukan" });

        await (prisma as any).walletTransaction.deleteMany({ where: { uploadId: id as string } });
        await (prisma as any).walletStatementUpload.delete({ where: { id: id as string } });
      } else {
        const upload = await prisma.bankStatementUpload.findFirst({
          where: { id: id as string, uploadedById: userId },
        });
        if (!upload) return res.status(404).json({ message: "Upload tidak ditemukan" });

        // hapus mergeItems dulu karena ada relasi ke BankTransaction
        await prisma.mergeReportItem.deleteMany({
          where: { transaction: { uploadId: id as string } },
        });
        await prisma.bankTransaction.deleteMany({ where: { uploadId: id as string } });
        await prisma.bankStatementUpload.delete({ where: { id: id as string } });
      }

      return res.status(200).json({ message: "Upload berhasil dihapus" });
    } catch (error) {
      console.error("upload delete error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  try {
    if (sourceType === "WALLET") {
      const upload = await (prisma as any).walletStatementUpload.findFirst({
        where: { id: id as string, uploadedById: userId },
        include: {
          wallet: {
            select: {
              walletProvider: true,
              phoneNumber: true,
              accountName: true,
            },
          },
          uploadedBy: { select: { name: true } },
          transactions: {
            include: { category: { select: { name: true } } },
            orderBy: { transactionDate: "desc" },
            take: 50,
          },
        },
      });

      if (!upload)
        return res.status(404).json({ message: "Upload tidak ditemukan" });

      return res.status(200).json({
        id: upload.id,
        sourceType: "WALLET",
        provider: upload.wallet.walletProvider,
        accountIdentifier: upload.wallet.phoneNumber,
        accountName: upload.wallet.accountName,
        fileName: upload.fileName,
        fileFormat: upload.fileFormat,
        fileSizeBytes: upload.fileSizeBytes,
        periodStart: upload.periodStart.toISOString().split("T")[0],
        periodEnd: upload.periodEnd.toISOString().split("T")[0],
        status: upload.status,
        errorMessage: upload.errorMessage,
        totalRows: upload.totalRows,
        parsedRows: upload.parsedRows,
        failedRows: upload.failedRows,
        totalCredit: Number(upload.totalCredit),
        totalDebit: Number(upload.totalDebit),
        uploadedAt: upload.createdAt.toISOString(),
        uploadedBy: upload.uploadedBy.name,
        transactions: upload.transactions.map(
          (t: {
            id: string;
            transactionDate: Date;
            description: string;
            reference: string | null;
            type: string;
            amount: { toString(): string };
            balance: { toString(): string } | null;
            category: { name: string } | null;
            status: string;
          }) => ({
            id: t.id,
            date: t.transactionDate.toISOString().split("T")[0],
            description: t.description,
            reference: t.reference,
            type: t.type,
            amount: Number(t.amount),
            balance: t.balance ? Number(t.balance) : null,
            category: t.category?.name ?? "Lainnya",
            status: t.status,
          }),
        ),
      });
    }

    // BANK
    const upload = await prisma.bankStatementUpload.findFirst({
      where: { id: id as string, uploadedById: userId },
      include: {
        bankAccount: {
          select: {
            bankProvider: true,
            accountNumber: true,
            accountName: true,
          },
        },
        uploadedBy: { select: { name: true } },
        transactions: {
          include: { category: { select: { name: true } } },
          orderBy: { transactionDate: "desc" },
          take: 50,
        },
      },
    });

    if (!upload)
      return res.status(404).json({ message: "Upload tidak ditemukan" });

    return res.status(200).json({
      id: upload.id,
      sourceType: "BANK",
      provider: upload.bankAccount.bankProvider,
      accountIdentifier: upload.bankAccount.accountNumber,
      accountName: upload.bankAccount.accountName,
      fileName: upload.fileName,
      fileFormat: upload.fileFormat,
      fileSizeBytes: upload.fileSizeBytes,
      periodStart: upload.periodStart.toISOString().split("T")[0],
      periodEnd: upload.periodEnd.toISOString().split("T")[0],
      status: upload.status,
      errorMessage: upload.errorMessage,
      totalRows: upload.totalRows,
      parsedRows: upload.parsedRows,
      failedRows: upload.failedRows,
      totalCredit: Number(upload.totalCredit),
      totalDebit: Number(upload.totalDebit),
      uploadedAt: upload.createdAt.toISOString(),
      uploadedBy: upload.uploadedBy.name,
      transactions: upload.transactions.map((t) => ({
        id: t.id,
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description,
        reference: t.reference,
        type: t.type,
        amount: Number(t.amount),
        balance: t.balance ? Number(t.balance) : null,
        category: t.category?.name ?? "Lainnya",
        status: t.status,
      })),
    });
  } catch (error) {
    console.error("upload detail error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
