/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()));
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

  const db = prisma as any;

  try {
    const [bankTx, walletTx] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          bankAccount: { ownerId: userId },
          type: "DEBIT",
          transactionDate: { gte: yearStart, lte: yearEnd },
        },
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          bankAccount: { select: { bankProvider: true, accountName: true } },
        },
        orderBy: { transactionDate: "asc" },
      }),
      db.walletTransaction.findMany({
        where: {
          wallet: { ownerId: userId },
          type: "DEBIT",
          transactionDate: { gte: yearStart, lte: yearEnd },
        },
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          wallet: { select: { walletProvider: true, accountName: true } },
        },
        orderBy: { transactionDate: "asc" },
      }),
    ]);

    const allTx = [
      ...bankTx.map((t: any) => ({
        id: t.id,
        date: t.transactionDate as Date,
        amount: Number(t.amount),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        categoryCode: t.categories[0]?.category?.code ?? "LNY",
        categories: t.categories.map((c: any) => c.category.name),
        source: "BANK",
        accountName: t.bankAccount.accountName,
        provider: t.bankAccount.bankProvider,
        description: t.description,
      })),
      ...walletTx.map((t: any) => ({
        id: t.id,
        date: t.transactionDate as Date,
        amount: Number(t.amount),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        categoryCode: t.categories[0]?.category?.code ?? "LNY",
        categories: t.categories.map((c: any) => c.category.name),
        source: "WALLET",
        accountName: t.wallet.accountName,
        provider: t.wallet.walletProvider,
        description: t.description,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Tren bulanan
    const monthlyTrend = Array.from({ length: 12 }, (_, m) => {
      const monthTx = allTx.filter((t) => t.date.getMonth() === m);
      return {
        month: new Date(year, m, 1).toLocaleDateString("id-ID", { month: "short" }),
        monthNum: m + 1,
        total: monthTx.reduce((s, t) => s + t.amount, 0),
        count: monthTx.length,
      };
    });

    // Breakdown per kategori
    const catMap = new Map<string, { name: string; total: number; count: number }>();
    for (const t of allTx) {
      const existing = catMap.get(t.category) ?? { name: t.category, total: 0, count: 0 };
      catMap.set(t.category, { name: t.category, total: existing.total + t.amount, count: existing.count + 1 });
    }
    const byCategory = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

    // Breakdown per sumber
    const sourceMap = new Map<string, { provider: string; accountName: string; source: string; total: number; count: number }>();
    for (const t of allTx) {
      const key = `${t.source}:${t.provider}:${t.accountName}`;
      const existing = sourceMap.get(key) ?? { provider: t.provider, accountName: t.accountName, source: t.source, total: 0, count: 0 };
      sourceMap.set(key, { ...existing, total: existing.total + t.amount, count: existing.count + 1 });
    }
    const bySource = Array.from(sourceMap.values()).sort((a, b) => b.total - a.total);

    // Bulan ini vs bulan lalu
    const now = new Date();
    const thisMonth = allTx.filter((t) => t.date.getMonth() === now.getMonth() && t.date.getFullYear() === year);
    const lastMonth = allTx.filter((t) => t.date.getMonth() === now.getMonth() - 1 && t.date.getFullYear() === year);
    const thisTotal = thisMonth.reduce((s, t) => s + t.amount, 0);
    const lastTotal = lastMonth.reduce((s, t) => s + t.amount, 0);
    const pctChange = lastTotal === 0 ? null : ((thisTotal - lastTotal) / lastTotal) * 100;

    const grandTotal = allTx.reduce((s, t) => s + t.amount, 0);
    const avgMonthly = grandTotal / 12;
    const worstMonth = monthlyTrend.reduce((worst, m) => m.total > worst.total ? m : worst, monthlyTrend[0]);

    return res.status(200).json({
      year,
      summary: {
        grandTotal,
        avgMonthly,
        totalTransactions: allTx.length,
        thisMonthTotal: thisTotal,
        lastMonthTotal: lastTotal,
        pctChange,
        highestMonth: { month: worstMonth.month, total: worstMonth.total },
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
