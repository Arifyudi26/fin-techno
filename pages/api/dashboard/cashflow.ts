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
    const ninetyDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccount: { ownerId: userId },
        transactionDate: { gte: ninetyDaysAgo },
      },
      select: { type: true, amount: true, transactionDate: true },
    });

    // Build 12-month cashflow
    const cashFlow = [];
    const netFlowTrend = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const monthTx = transactions.filter(
        (t) => t.transactionDate >= monthStart && t.transactionDate <= monthEnd
      );

      const credit = monthTx.filter((t) => t.type === "CREDIT").reduce((s, t) => s + Number(t.amount), 0);
      const debit  = monthTx.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0);
      const month  = monthDate.toLocaleDateString("id-ID", { year: "numeric", month: "short" });

      cashFlow.push({ month, credit, debit });
      netFlowTrend.push({ month, netFlow: credit - debit });
    }

    return res.status(200).json({ cashFlow, netFlowTrend });
  } catch (error) {
    console.error("cashflow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
