/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const db = prisma as any;

  if (req.method === "GET") {
    try {
      const wallets = await db.digitalWallet.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      });

      const result = await Promise.all(wallets.map(async (w: any) => {
        const creditAgg = await db.walletTransaction.aggregate({
          where: { walletId: w.id, type: "CREDIT" },
          _sum: { amount: true },
          _count: { id: true },
        });
        const debitAgg = await db.walletTransaction.aggregate({
          where: { walletId: w.id, type: "DEBIT" },
          _sum: { amount: true },
        });
        const uploads = await db.walletStatementUpload.findMany({
          where: { walletId: w.id },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        const uploadCount = await db.walletStatementUpload.count({ where: { walletId: w.id } });

        return {
          id: w.id,
          walletProvider: w.walletProvider,
          phoneNumber: w.phoneNumber,
          accountName: w.accountName,
          isActive: w.isActive,
          createdAt: w.createdAt.toISOString(),
          totalUploads: uploadCount,
          totalTransactions: creditAgg._count.id,
          totalCredit: Number(creditAgg._sum.amount ?? 0),
          totalDebit: Number(debitAgg._sum.amount ?? 0),
          lastUploadDate: uploads[0]?.createdAt?.toISOString() ?? null,
        };
      }));

      return res.status(200).json({ wallets: result });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { walletProvider, phoneNumber, accountName } = req.body;
    if (!walletProvider || !phoneNumber || !accountName) {
      return res.status(400).json({ message: "walletProvider, phoneNumber, accountName wajib diisi" });
    }
    try {
      const wallet = await db.digitalWallet.create({
        data: { walletProvider, phoneNumber, accountName, ownerId: userId },
      });
      return res.status(201).json({ wallet });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).end();
}
