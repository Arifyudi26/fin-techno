/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { pctChange } from "@lib/formatters";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: st(req, "unauthorized") }); }

  try {
    const db  = prisma as any;
    const now = new Date();

    const qDateFrom   = req.query.dateFrom    as string | undefined;
    const qDateTo     = req.query.dateTo      as string | undefined;
    const accountId   = req.query.accountId   as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;

    const skipBank   = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    // Determine active period 
    let thisStart: Date, thisEnd: Date;

    if (qDateFrom || qDateTo) {
      thisStart = qDateFrom ? new Date(qDateFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
      thisEnd   = qDateTo   ? new Date(qDateTo   + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      const [latestBank, latestWallet] = await Promise.all([
        skipBank ? null : prisma.bankTransaction.findFirst({
          where: { bankAccount: { ownerId: userId } },
          orderBy: { transactionDate: "desc" },
          select: { transactionDate: true },
        }),
        skipWallet ? null : db.walletTransaction.findFirst({
          where: { wallet: { ownerId: userId } },
          orderBy: { transactionDate: "desc" },
          select: { transactionDate: true },
        }),
      ]);
      const dates = [latestBank?.transactionDate, latestWallet?.transactionDate].filter(Boolean) as Date[];
      const ref   = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : now;
      thisStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
      thisEnd   = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const durationMs = thisEnd.getTime() - thisStart.getTime();
    const prevEnd    = new Date(thisStart.getTime() - 1);
    const prevStart  = new Date(prevEnd.getTime() - durationMs);

    // Build where clauses 
    const bankBase: any   = { bankAccount: { ownerId: userId } };
    const walletBase: any = { wallet: { ownerId: userId } };
    if (accountId) {
      if (!skipBank)   bankBase.bankAccountId = accountId;
      if (!skipWallet) walletBase.walletId    = accountId;
    }

    // Aggregates: groupBy type for current + previous period (4 parallel) 
    const [curBankAgg, prevBankAgg, curWalletAgg, prevWalletAgg] = await Promise.all([
      skipBank ? [] : prisma.bankTransaction.groupBy({
        by: ["type"],
        where: { ...bankBase, transactionDate: { gte: thisStart, lte: thisEnd } },
        _sum: { amount: true }, _count: { id: true },
      }),
      skipBank ? [] : prisma.bankTransaction.groupBy({
        by: ["type"],
        where: { ...bankBase, transactionDate: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true }, _count: { id: true },
      }),
      skipWallet ? [] : db.walletTransaction.groupBy({
        by: ["type"],
        where: { ...walletBase, transactionDate: { gte: thisStart, lte: thisEnd } },
        _sum: { amount: true }, _count: { id: true },
      }),
      skipWallet ? [] : db.walletTransaction.groupBy({
        by: ["type"],
        where: { ...walletBase, transactionDate: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true }, _count: { id: true },
      }),
    ]);

    const sumAgg = (rows: any[], type: string) =>
      rows.filter((r: any) => r.type === type).reduce((s: number, r: any) => s + Number(r._sum.amount ?? 0), 0);
    const countAgg = (rows: any[]) =>
      rows.reduce((s: number, r: any) => s + Number(r._count.id ?? 0), 0);

    const curAll  = [...curBankAgg,  ...curWalletAgg];
    const prevAll = [...prevBankAgg, ...prevWalletAgg];

    const thisIncome  = sumAgg(curAll,  "CREDIT");
    const thisExpense = sumAgg(curAll,  "DEBIT");
    const thisCount   = countAgg(curAll);
    const prevIncome  = sumAgg(prevAll, "CREDIT");
    const prevExpense = sumAgg(prevAll, "DEBIT");
    const prevCount   = countAgg(prevAll);

    // Balance: latest balance per account via raw SQL (safe, simple) 
    // Two separate queries — no UNION, no DISTINCT ON complexity
    const [bankBalRows, walletBalRows] = await Promise.all([
      skipBank ? [{ balance: null }] : prisma.bankTransaction.findMany({
        where: accountId ? { bankAccountId: accountId } : { bankAccount: { ownerId: userId, isActive: true } },
        distinct: ["bankAccountId"],
        orderBy: { transactionDate: "desc" },
        select: { balance: true },
      }),
      skipWallet ? [{ balance: null }] : db.walletTransaction.findMany({
        where: accountId ? { walletId: accountId } : { wallet: { ownerId: userId, isActive: true } },
        distinct: ["walletId"],
        orderBy: { transactionDate: "desc" },
        select: { balance: true },
      }),
    ]);

    const totalBalance =
      [...bankBalRows, ...walletBalRows].reduce((s: number, r: any) => s + Number(r?.balance ?? 0), 0);

    const periodLabel = qDateFrom || qDateTo
      ? `${qDateFrom ?? "..."} – ${qDateTo ?? "..."}`
      : thisStart.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res.status(200).json({
      totalIncome:      thisIncome,
      totalExpense:     thisExpense,
      netFlow:          thisIncome - thisExpense,
      totalBalance,
      transactionCount: thisCount,
      activePeriod: {
        month: thisStart.getMonth() + 1,
        year:  thisStart.getFullYear(),
        label: periodLabel,
      },
      changes: {
        income:       pctChange(thisIncome,  prevIncome),
        expense:      pctChange(thisExpense, prevExpense),
        netFlow:      pctChange(thisIncome - thisExpense, prevIncome - prevExpense),
        transactions: pctChange(thisCount,   prevCount),
      },
      isUp: {
        income:       thisIncome  >= prevIncome,
        expense:      thisExpense <= prevExpense,
        netFlow:      (thisIncome - thisExpense) >= (prevIncome - prevExpense),
        transactions: thisCount   >= prevCount,
      },
    });
  } catch (error) {
    console.error("metrics error:", error);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
