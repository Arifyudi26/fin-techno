import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

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

    // Bulan ini
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Bulan lalu
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisTx, prevTx, bankAccounts] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, transactionDate: { gte: thisStart, lte: thisEnd } },
        select: { type: true, amount: true },
      }),
      prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, transactionDate: { gte: prevStart, lte: prevEnd } },
        select: { type: true, amount: true },
      }),
      prisma.bankAccount.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true },
      }),
    ]);

    // Bulan ini
    const thisIncome  = thisTx.filter(t => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
    const thisExpense = thisTx.filter(t => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);
    const thisCount   = thisTx.length;

    // Bulan lalu
    const prevIncome  = prevTx.filter(t => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
    const prevExpense = prevTx.filter(t => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);
    const prevCount   = prevTx.length;

    // Total balance dari saldo terakhir tiap rekening
    const balances = await Promise.all(
      bankAccounts.map(acc =>
        prisma.bankTransaction.findFirst({
          where: { bankAccountId: acc.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        })
      )
    );
    const totalBalance = balances.reduce((s, b) => s + Number(b?.balance ?? 0), 0);

    return res.status(200).json({
      totalIncome:      thisIncome,
      totalExpense:     thisExpense,
      netFlow:          thisIncome - thisExpense,
      totalBalance,
      transactionCount: thisCount,
      changes: {
        income:       pctChange(thisIncome,  prevIncome),
        expense:      pctChange(thisExpense, prevExpense),
        netFlow:      pctChange(thisIncome - thisExpense, prevIncome - prevExpense),
        transactions: pctChange(thisCount,   prevCount),
      },
      isUp: {
        income:       thisIncome  >= prevIncome,
        expense:      thisExpense <= prevExpense, // pengeluaran turun = bagus
        netFlow:      (thisIncome - thisExpense) >= (prevIncome - prevExpense),
        transactions: thisCount   >= prevCount,
      },
    });
  } catch (error) {
    console.error("metrics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
