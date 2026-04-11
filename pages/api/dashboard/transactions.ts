/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try {
    userId = verifyToken(req).id;
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const db = prisma as any;

    const [recentBankTx, recentWalletTx] = await Promise.all([
        prisma.bankTransaction.findMany({
          where: {
            bankAccount: { ownerId: userId },
            transactionDate: { gte: ninetyDaysAgo },
          },
          include: {
            categories: { include: { category: { select: { id: true, name: true } } } },
            bankAccount: { select: { bankProvider: true } },
          },
          orderBy: { transactionDate: "desc" },
          take: 20,
        }),
        db.walletTransaction.findMany({
          where: {
            wallet: { ownerId: userId },
            transactionDate: { gte: ninetyDaysAgo },
          },
          include: {
            categories: { include: { category: { select: { id: true, name: true } } } },
            wallet: { select: { walletProvider: true } },
          },
          orderBy: { transactionDate: "desc" },
          take: 20,
        }),
      ]);

    // Merge and sort recent transactions
    const recentTx = [
      ...recentBankTx.map((t: any) => ({
        ...t,
        _source: "BANK",
        _provider: t.bankAccount.bankProvider,
      })),
      ...recentWalletTx.map((t: any) => ({
        ...t,
        _source: "WALLET",
        _provider: t.wallet.walletProvider,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      )
      .slice(0, 10);

    // Spending by category — aggregate from junction tables
    const [bankCatRows, walletCatRows] = await Promise.all([
      prisma.bankTransactionCategory.findMany({
        where: {
          transaction: {
            bankAccount: { ownerId: userId },
            type: "DEBIT",
            transactionDate: { gte: ninetyDaysAgo },
          },
        },
        include: {
          transaction: { select: { amount: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      db.walletTransactionCategory.findMany({
        where: {
          transaction: {
            wallet: { ownerId: userId },
            type: "DEBIT",
            transactionDate: { gte: ninetyDaysAgo },
          },
        },
        include: {
          transaction: { select: { amount: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    const catMerge: Record<string, { name: string; amount: number }> = {};
    for (const row of [...bankCatRows, ...walletCatRows]) {
      const key = row.category.id;
      if (!catMerge[key]) catMerge[key] = { name: row.category.name, amount: 0 };
      catMerge[key].amount += Number(row.transaction.amount);
    }

    const spendingByCategory = Object.values(catMerge).sort((a, b) => b.amount - a.amount);

    const recentTransactions = recentTx.map((t: any) => ({
      id: t.id,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      type: t.type,
      amount: Number(t.amount),
      categories: t.categories.map((c: any) => c.category.name),
      category: t.categories[0]?.category?.name ?? "Lainnya",
      bankAccount: t._provider,
      source: t._source,
      status: t.status,
      reference: t.reference,
    }));

    return res.status(200).json({ recentTransactions, spendingByCategory });
  } catch (error) {
    console.error("transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
