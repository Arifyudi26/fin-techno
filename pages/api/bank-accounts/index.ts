import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { BankProvider } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  // GET — list accounts with stats
  if (req.method === "GET") {
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: { ownerId: userId },
        include: {
          uploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { totalCredit: true, totalDebit: true, periodEnd: true, createdAt: true },
          },
          _count: { select: { uploads: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      // aggregate totals per account
      const result = await Promise.all(accounts.map(async (acc) => {
        const agg = await prisma.bankTransaction.aggregate({
          where: { bankAccountId: acc.id },
          _sum: { amount: true },
          _count: { id: true },
        });
        const creditAgg = await prisma.bankTransaction.aggregate({
          where: { bankAccountId: acc.id, type: "CREDIT" },
          _sum: { amount: true },
        });
        const debitAgg = await prisma.bankTransaction.aggregate({
          where: { bankAccountId: acc.id, type: "DEBIT" },
          _sum: { amount: true },
        });

        const lastUpload = acc.uploads[0];
        return {
          id: acc.id,
          bankProvider: acc.bankProvider,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName,
          currency: acc.currency,
          description: acc.description,
          isActive: acc.isActive,
          createdAt: acc.createdAt.toISOString(),
          totalUploads: acc._count.uploads,
          totalTransactions: agg._count.id,
          totalCredit: Number(creditAgg._sum.amount ?? 0),
          totalDebit: Number(debitAgg._sum.amount ?? 0),
          lastUploadDate: lastUpload?.createdAt?.toISOString() ?? null,
          lastPeriodEnd: lastUpload?.periodEnd?.toISOString().split("T")[0] ?? null,
          lastBalance: lastUpload ? Number(lastUpload.totalCredit) - Number(lastUpload.totalDebit) : 0,
        };
      }));

      return res.status(200).json({ accounts: result });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // POST — create account
  if (req.method === "POST") {
    const { bankProvider, accountNumber, accountName, description } = req.body;
    if (!bankProvider || !accountNumber || !accountName) {
      return res.status(400).json({ message: "bankProvider, accountNumber, accountName wajib diisi" });
    }
    try {
      const existing = await prisma.bankAccount.findUnique({ where: { accountNumber } });
      if (existing) return res.status(409).json({ message: "Nomor rekening sudah terdaftar" });

      const account = await prisma.bankAccount.create({
        data: { bankProvider: bankProvider as BankProvider, accountNumber, accountName, description, ownerId: userId },
      });
      return res.status(201).json({ account });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
