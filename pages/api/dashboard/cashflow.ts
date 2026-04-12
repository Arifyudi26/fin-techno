/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const db = prisma as any;
    const now = new Date();

    // Filter params
    const accountId = req.query.accountId as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;
    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const categoryId = req.query.categoryId as string | undefined;

    const lookbackMs = Math.max(months, 12) * 31 * 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - lookbackMs);

    const skipBank = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      transactionDate: { gte: startDate },
      ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
    };
    const walletWhere: any = {
      wallet: { ownerId: userId },
      transactionDate: { gte: startDate },
      ...(accountId && !skipWallet ? { walletId: accountId } : {}),
    };

    // Filter by category via junction table
    if (categoryId) {
      bankWhere.categories = { some: { categoryId } };
      walletWhere.categories = { some: { categoryId } };
    }

    const [bankTx, walletTx] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
        where: bankWhere,
        select: { type: true, amount: true, transactionDate: true },
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
        where: walletWhere,
        select: { type: true, amount: true, transactionDate: true },
      }),
    ]);

    const transactions = [...bankTx, ...walletTx];

    const cashFlow = [];
    const netFlowTrend = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const monthTx = transactions.filter(
        (t: any) => t.transactionDate >= monthStart && t.transactionDate <= monthEnd,
      );

      const credit = monthTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const debit = monthTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const month = monthDate.toLocaleDateString("id-ID", { year: "numeric", month: "short" });

      cashFlow.push({ month, credit, debit });
      netFlowTrend.push({ month, netFlow: credit - debit });
    }

    return res.status(200).json({ cashFlow, netFlowTrend });
  } catch (error) {
    console.error("cashflow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
