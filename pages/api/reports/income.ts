/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const db = prisma as any;
  const now = new Date();

  // Filter params — sama seperti dashboard
  const qYear  = req.query.year  ? parseInt(req.query.year  as string) : null;
  const qMonth = req.query.month ? parseInt(req.query.month as string) : null; // 1-12, null = seluruh tahun
  const accountId   = req.query.accountId   as string | undefined;
  const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;
  const categoryId  = req.query.categoryId  as string | undefined;

  // Tentukan range
  const year = qYear ?? now.getFullYear();
  const dateStart = qMonth != null
    ? new Date(year, qMonth - 1, 1)
    : new Date(year, 0, 1);
  const dateEnd = qMonth != null
    ? new Date(year, qMonth, 0, 23, 59, 59, 999)
    : new Date(year, 11, 31, 23, 59, 59, 999);

  const skipBank   = accountType === "WALLET";
  const skipWallet = accountType === "BANK";

  const bankWhere: any = {
    bankAccount: { ownerId: userId },
    type: "CREDIT",
    transactionDate: { gte: dateStart, lte: dateEnd },
    ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
  };
  const walletWhere: any = {
    wallet: { ownerId: userId },
    type: "CREDIT",
    transactionDate: { gte: dateStart, lte: dateEnd },
    ...(accountId && !skipWallet ? { walletId: accountId } : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
  };

  try {
    const [bankTx, walletTx] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
        where: bankWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          bankAccount: { select: { bankProvider: true, accountName: true } },
        },
        orderBy: { transactionDate: "asc" },
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
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

    // Tren bulanan — kalau filter bulan tertentu, tampilkan per minggu; kalau tahunan per bulan
    const monthlyTrend = qMonth != null
      ? buildWeeklyTrend(allTx, year, qMonth - 1)
      : buildMonthlyTrend(allTx, year);

    // Breakdown per kategori
    const catMap = new Map<string, { name: string; total: number; count: number }>();
    for (const t of allTx) {
      const e = catMap.get(t.category) ?? { name: t.category, total: 0, count: 0 };
      catMap.set(t.category, { name: t.category, total: e.total + t.amount, count: e.count + 1 });
    }
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

    // Breakdown per sumber
    const sourceMap = new Map<string, { provider: string; accountName: string; source: string; total: number; count: number }>();
    for (const t of allTx) {
      const key = `${t.source}:${t.provider}:${t.accountName}`;
      const e = sourceMap.get(key) ?? { provider: t.provider, accountName: t.accountName, source: t.source, total: 0, count: 0 };
      sourceMap.set(key, { ...e, total: e.total + t.amount, count: e.count + 1 });
    }
    const bySource = Array.from(sourceMap.values()).sort((a, b) => b.total - a.total);

    // Periode sebelumnya untuk perbandingan
    const prevStart = qMonth != null
      ? new Date(year, qMonth - 2, 1)
      : new Date(year - 1, 0, 1);
    const prevEnd = qMonth != null
      ? new Date(year, qMonth - 1, 0, 23, 59, 59, 999)
      : new Date(year - 1, 11, 31, 23, 59, 59, 999);

    const [prevBankTx, prevWalletTx] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
        where: { ...bankWhere, transactionDate: { gte: prevStart, lte: prevEnd } },
        select: { amount: true },
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
        where: { ...walletWhere, transactionDate: { gte: prevStart, lte: prevEnd } },
        select: { amount: true },
      }),
    ]);
    const prevTotal = [...prevBankTx, ...prevWalletTx].reduce((s: number, t: any) => s + Number(t.amount), 0);

    const grandTotal = allTx.reduce((s, t) => s + t.amount, 0);
    const periodCount = qMonth != null ? 1 : 12;
    const avgMonthly = grandTotal / periodCount;
    const pctChange = prevTotal === 0 ? null : ((grandTotal - prevTotal) / prevTotal) * 100;
    const bestPeriod = monthlyTrend.reduce((best, m) => m.total > best.total ? m : best, monthlyTrend[0] ?? { month: "-", total: 0 });

    return res.status(200).json({
      year,
      month: qMonth,
      filters: { accountId, accountType, categoryId },
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

function buildMonthlyTrend(allTx: { date: Date; amount: number }[], year: number) {
  return Array.from({ length: 12 }, (_, m) => {
    const monthTx = allTx.filter((t) => t.date.getMonth() === m);
    return {
      month: new Date(year, m, 1).toLocaleDateString("id-ID", { month: "short" }),
      monthNum: m + 1,
      total: monthTx.reduce((s, t) => s + t.amount, 0),
      count: monthTx.length,
    };
  });
}

function buildWeeklyTrend(allTx: { date: Date; amount: number }[], year: number, month: number) {
  const weeks: { month: string; monthNum: number; total: number; count: number }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let weekStart = new Date(firstDay);
  let weekNum = 1;
  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
    const weekTx = allTx.filter((t) => t.date >= weekStart && t.date <= weekEnd);
    weeks.push({
      month: `Mg ${weekNum}`,
      monthNum: weekNum,
      total: weekTx.reduce((s, t) => s + t.amount, 0),
      count: weekTx.length,
    });
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    weekNum++;
  }
  return weeks;
}
