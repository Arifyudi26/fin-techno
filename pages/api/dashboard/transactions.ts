import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const [recentTx, categoryExpenses] = await Promise.all([
      // Recent 10 transactions
      prisma.bankTransaction.findMany({
        where: {
          bankAccount: { ownerId: userId },
          transactionDate: { gte: ninetyDaysAgo },
        },
        include: { category: true, bankAccount: { select: { bankProvider: true } } },
        orderBy: { transactionDate: "desc" },
        take: 10,
      }),
      // Spending by category (last 90 days, DEBIT only)
      prisma.bankTransaction.groupBy({
        by: ["categoryId"],
        where: {
          bankAccount: { ownerId: userId },
          type: "DEBIT",
          transactionDate: { gte: ninetyDaysAgo },
        },
        _sum: { amount: true },
      }),
    ]);

    // Resolve category names
    const categoryIds = categoryExpenses
      .filter((c) => c.categoryId !== null)
      .map((c) => c.categoryId as string);

    const categories = await prisma.transactionCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const spendingByCategory = categoryExpenses
      .filter((c) => c.categoryId !== null)
      .map((item) => ({
        category: catMap[item.categoryId!] ?? "Lainnya",
        amount: Number(item._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount);

    const recentTransactions = recentTx.map((t) => ({
      id: t.id,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      type: t.type,
      amount: Number(t.amount),
      category: t.category?.name ?? "Lainnya",
      bankAccount: t.bankAccount.bankProvider,
      status: t.status,
      reference: t.reference,
    }));

    return res.status(200).json({ recentTransactions, spendingByCategory });
  } catch (error) {
    console.error("transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
