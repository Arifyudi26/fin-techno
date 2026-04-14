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

    const accountId   = req.query.accountId   as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;
    const categoryId  = req.query.categoryId  as string | undefined;
    const qDateFrom   = req.query.dateFrom    as string | undefined;
    const qDateTo     = req.query.dateTo      as string | undefined;

    // Default: 12 bulan terakhir jika tidak ada filter tanggal
    const dateStart = qDateFrom
      ? new Date(qDateFrom + "T00:00:00")
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const dateEnd = qDateTo
      ? new Date(qDateTo + "T23:59:59")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const skipBank   = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };
    const walletWhere: any = {
      wallet: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipWallet ? { walletId: accountId } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };

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

    // Tentukan granularitas: ≤31 hari → per hari, ≤92 hari → per minggu, >92 hari → per bulan
    const diffDays = Math.ceil((dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

    const cashFlow: { month: string; credit: number; debit: number; txCount: number }[] = [];
    const netFlowTrend: { month: string; netFlow: number; balance: number; txCount: number }[] = [];
    let runningBalance = 0;

    if (diffDays <= 31) {
      // Per hari
      const cur = new Date(dateStart);
      while (cur <= dateEnd) {
        const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
        const dayEnd   = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59);
        const dayTx = transactions.filter(
          (t: any) => t.transactionDate >= dayStart && t.transactionDate <= dayEnd,
        );
        const credit = dayTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const debit  = dayTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const txCount = dayTx.length;
        runningBalance += credit - debit;
        const label  = cur.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        cashFlow.push({ month: label, credit, debit, txCount });
        netFlowTrend.push({ month: label, netFlow: credit - debit, balance: runningBalance, txCount });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (diffDays <= 92) {
      // Per minggu
      const cur = new Date(dateStart);
      let weekNum = 1;
      while (cur <= dateEnd) {
        const weekEnd = new Date(cur);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > dateEnd) weekEnd.setTime(dateEnd.getTime());
        const weekTx = transactions.filter(
          (t: any) => t.transactionDate >= cur && t.transactionDate <= weekEnd,
        );
        const credit = weekTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const debit  = weekTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const txCount = weekTx.length;
        runningBalance += credit - debit;
        const label  = `Mg ${weekNum}`;
        cashFlow.push({ month: label, credit, debit, txCount });
        netFlowTrend.push({ month: label, netFlow: credit - debit, balance: runningBalance, txCount });
        cur.setDate(cur.getDate() + 7);
        weekNum++;
      }
    } else {
      // Per bulan
      const cur = new Date(dateStart.getFullYear(), dateStart.getMonth(), 1);
      while (cur <= dateEnd) {
        const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
        const monthEnd   = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
        const monthTx = transactions.filter(
          (t: any) => t.transactionDate >= monthStart && t.transactionDate <= monthEnd,
        );
        const credit = monthTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const debit  = monthTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const txCount = monthTx.length;
        runningBalance += credit - debit;
        const label  = cur.toLocaleDateString("id-ID", { year: "numeric", month: "short" });
        cashFlow.push({ month: label, credit, debit, txCount });
        netFlowTrend.push({ month: label, netFlow: credit - debit, balance: runningBalance, txCount });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return res.status(200).json({ cashFlow, netFlowTrend });
  } catch (error) {
    console.error("cashflow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
