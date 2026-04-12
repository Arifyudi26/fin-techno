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
    type: "CREDIT",
    transactionDate: { gte: dateStart, lte: dateEnd },
    ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
  };
  const walletWhere: any = {
    wallet: { ownerId: userId },
    type: "CREDIT",
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
    const bestPeriod = monthlyTrend.reduce(
      (best, m) => (m.total > best.total ? m : best),
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
        bestPeriod: { label: bestPeriod.month, total: bestPeriod.total },
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

function buildDateRangeTrend(
  allTx: { date: Date; amount: number }[],
  dateStart: Date,
  dateEnd: Date,
) {
  const diffDays = Math.ceil(
    (dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 31) {
    // Per hari
    const result: {
      month: string;
      monthNum: number;
      total: number;
      count: number;
    }[] = [];
    const cur = new Date(dateStart);
    let i = 1;
    while (cur <= dateEnd) {
      const dayStr = cur.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      const dayTx = allTx.filter(
        (t) => t.date.toDateString() === cur.toDateString(),
      );
      result.push({
        month: dayStr,
        monthNum: i++,
        total: dayTx.reduce((s, t) => s + t.amount, 0),
        count: dayTx.length,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  } else if (diffDays <= 92) {
    // Per minggu
    const result: {
      month: string;
      monthNum: number;
      total: number;
      count: number;
    }[] = [];
    const cur = new Date(dateStart);
    let weekNum = 1;
    while (cur <= dateEnd) {
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > dateEnd) weekEnd.setTime(dateEnd.getTime());
      const weekTx = allTx.filter((t) => t.date >= cur && t.date <= weekEnd);
      result.push({
        month: `Mg ${weekNum}`,
        monthNum: weekNum,
        total: weekTx.reduce((s, t) => s + t.amount, 0),
        count: weekTx.length,
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }
    return result;
  } else {
    // Per bulan
    const months = new Map<
      string,
      { month: string; monthNum: number; total: number; count: number }
    >();
    for (const t of allTx) {
      const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
      const label = t.date.toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      });
      const e = months.get(key) ?? {
        month: label,
        monthNum: t.date.getMonth() + 1,
        total: 0,
        count: 0,
      };
      months.set(key, { ...e, total: e.total + t.amount, count: e.count + 1 });
    }
    return Array.from(months.values());
  }
}
