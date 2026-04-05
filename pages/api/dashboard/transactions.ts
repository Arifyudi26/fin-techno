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

    const [recentBankTx, recentWalletTx, bankCatExpenses, walletCatExpenses] =
      await Promise.all([
        prisma.bankTransaction.findMany({
          where: {
            bankAccount: { ownerId: userId },
            transactionDate: { gte: ninetyDaysAgo },
          },
          include: {
            category: true,
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
            category: true,
            wallet: { select: { walletProvider: true } },
          },
          orderBy: { transactionDate: "desc" },
          take: 20,
        }),
        prisma.bankTransaction.groupBy({
          by: ["categoryId"],
          where: {
            bankAccount: { ownerId: userId },
            type: "DEBIT",
            transactionDate: { gte: ninetyDaysAgo },
          },
          _sum: { amount: true },
        }),
        db.walletTransaction.groupBy({
          by: ["categoryId"],
          where: {
            wallet: { ownerId: userId },
            type: "DEBIT",
            transactionDate: { gte: ninetyDaysAgo },
          },
          _sum: { amount: true },
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

    // Merge category expenses
    const catMerge: Record<string, number> = {};
    for (const c of [...bankCatExpenses, ...walletCatExpenses]) {
      const key = c.categoryId ?? "__none__";
      catMerge[key] = (catMerge[key] ?? 0) + Number(c._sum.amount ?? 0);
    }

    const categoryIds = Object.keys(catMerge).filter((k) => k !== "__none__");
    const categories = await prisma.transactionCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const spendingByCategory = Object.entries(catMerge)
      .filter(([k]) => k !== "__none__")
      .map(([id, amount]) => ({ category: catMap[id] ?? "Lainnya", amount }))
      .sort((a, b) => b.amount - a.amount);

    const recentTransactions = recentTx.map((t: any) => ({
      id: t.id,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      type: t.type,
      amount: Number(t.amount),
      category: t.category?.name ?? "Lainnya",
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
