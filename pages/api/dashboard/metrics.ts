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
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [currentMonthTx, bankAccounts] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          bankAccount: { ownerId: userId },
          transactionDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { type: true, amount: true },
      }),
      prisma.bankAccount.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true },
      }),
    ]);

    const totalIncome = currentMonthTx
      .filter((t) => t.type === "CREDIT")
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalExpense = currentMonthTx
      .filter((t) => t.type === "DEBIT")
      .reduce((s, t) => s + Number(t.amount), 0);

    // Total balance: last transaction balance per account
    const balances = await Promise.all(
      bankAccounts.map((acc) =>
        prisma.bankTransaction.findFirst({
          where: { bankAccountId: acc.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        })
      )
    );
    const totalBalance = balances.reduce((s, b) => s + Number(b?.balance ?? 0), 0);

    return res.status(200).json({
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense,
      totalBalance,
      transactionCount: currentMonthTx.length,
    });
  } catch (error) {
    console.error("metrics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
