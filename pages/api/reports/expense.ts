/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { buildDateRangeTrend } from "@lib/trendBuilder";

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

  const db = prisma as any;
  const now = new Date();

  const qDateFrom = req.query.dateFrom as string | undefined;
  const qDateTo = req.query.dateTo as string | undefined;
  const accountId = req.query.accountId as string | undefined;
  const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;

  const dateStart = qDateFrom
    ? new Date(qDateFrom + "T00:00:00")
    : new Date(now.getFullYear(), 0, 1);
  const dateEnd = qDateTo
    ? new Date(qDateTo + "T23:59:59")
    : new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const skipBank = accountType === "WALLET";
  const skipWallet = accountType === "BANK";

  const bankWhere: any = {
    bankAccount: { ownerId: userId },
    type: "DEBIT",
    transactionDate: { gte: dateStart, lte: dateEnd },
    ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
  };
  const walletWhere: any = {
    wallet: { ownerId: userId },
    type: "DEBIT",
    transactionDate: { gte: dateStart, lte: dateEnd },
    ...(accountId && !skipWallet ? { walletId: accountId } : {}),
  };

  try {
    const [bankTx, walletTx] = await Promise.all([
      skipBank
        ? Promise.resolve([])
        : prisma.bankTransaction.findMany({
            where: bankWhere,
            include: {
              categories: {
                include: { category: { select: { name: true, code: true } } },
              },
              bankAccount: {
                select: { bankProvider: true, accountName: true },
              },
            },
            orderBy: { transactionDate: "asc" },
          }),
      skipWallet
        ? Promise.resolve([])
        : db.walletTransaction.findMany({
            where: walletWhere,
            include: {
              categories: {
                include: { category: { select: { name: true, code: true } } },
              },
              wallet: { select: { walletProvider: true, accountName: true } },
            },
            orderBy: { transactionDate: "asc" },
          }),
    ]);

    const allTx = [
      ...bankTx.map((t: any) => ({
        date: t.transactionDate as Date,
        amount: Number(t.amount),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        source: "BANK",
        accountName: t.bankAccount.accountName,
        provider: t.bankAccount.bankProvider,
      })),
      ...walletTx.map((t: any) => ({
        date: t.transactionDate as Date,
        amount: Number(t.amount),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        source: "WALLET",
        accountName: t.wallet.accountName,
        provider: t.wallet.walletProvider,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const monthlyTrend = buildDateRangeTrend(allTx, dateStart, dateEnd);

    const catMap = new Map<
      string,
      { name: string; total: number; count: number }
    >();
    for (const t of allTx) {
      const e = catMap.get(t.category) ?? {
        name: t.category,
        total: 0,
        count: 0,
      };
      catMap.set(t.category, {
        name: t.category,
        total: e.total + t.amount,
        count: e.count + 1,
      });
    }
    const byCategory = Array.from(catMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    const sourceMap = new Map<
      string,
      {
        provider: string;
        accountName: string;
        source: string;
        total: number;
        count: number;
      }
    >();
    for (const t of allTx) {
      const key = `${t.source}:${t.provider}:${t.accountName}`;
      const e = sourceMap.get(key) ?? {
        provider: t.provider,
        accountName: t.accountName,
        source: t.source,
        total: 0,
        count: 0,
      };
      sourceMap.set(key, {
        ...e,
        total: e.total + t.amount,
        count: e.count + 1,
      });
    }
    const bySource = Array.from(sourceMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    // Periode sebelumnya: durasi yang sama sebelum dateStart
    const durationMs = dateEnd.getTime() - dateStart.getTime();
    const prevEnd = new Date(dateStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const [prevBankTx, prevWalletTx] = await Promise.all([
      skipBank
        ? Promise.resolve([])
        : prisma.bankTransaction.findMany({
            where: {
              ...bankWhere,
              transactionDate: { gte: prevStart, lte: prevEnd },
            },
            select: { amount: true },
          }),
      skipWallet
        ? Promise.resolve([])
        : db.walletTransaction.findMany({
            where: {
              ...walletWhere,
              transactionDate: { gte: prevStart, lte: prevEnd },
            },
            select: { amount: true },
          }),
    ]);
    const prevTotal = [...prevBankTx, ...prevWalletTx].reduce(
      (s: number, t: any) => s + Number(t.amount),
      0,
    );

    const grandTotal = allTx.reduce((s, t) => s + t.amount, 0);
    const dayCount = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    const avgMonthly = grandTotal / dayCount;
    const pctChange =
      prevTotal === 0 ? null : ((grandTotal - prevTotal) / prevTotal) * 100;
    const highestPeriod = monthlyTrend.reduce(
      (h, m) => (m.total > h.total ? m : h),
      monthlyTrend[0] ?? { month: "-", total: 0 },
    );

    return res.status(200).json({
      filters: { dateFrom: qDateFrom, dateTo: qDateTo, accountId, accountType },
      summary: {
        grandTotal,
        avgMonthly,
        totalTransactions: allTx.length,
        prevTotal,
        pctChange,
        highestPeriod: {
          label: highestPeriod.month,
          total: highestPeriod.total,
        },
      },
      monthlyTrend,
      byCategory,
      bySource,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

