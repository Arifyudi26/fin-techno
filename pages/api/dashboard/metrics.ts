/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const db = prisma as any;
    const now = new Date();

    // Cari transaksi terbaru untuk menentukan bulan aktif (jika tidak ada filter)
    const latestBankTx = await prisma.bankTransaction.findFirst({
      where: { bankAccount: { ownerId: userId } },
      orderBy: { transactionDate: "desc" },
      select: { transactionDate: true },
    });
    const latestWalletTx = await db.walletTransaction.findFirst({
      where: { wallet: { ownerId: userId } },
      orderBy: { transactionDate: "desc" },
      select: { transactionDate: true },
    });

    const latestDates = [latestBankTx?.transactionDate, latestWalletTx?.transactionDate]
      .filter(Boolean) as Date[];
    const defaultDate = latestDates.length > 0
      ? new Date(Math.max(...latestDates.map((d) => d.getTime())))
      : now;

    // Ambil filter dari query param, fallback ke bulan aktif
    const qMonth = req.query.month ? parseInt(req.query.month as string) : null;
    const qYear = req.query.year ? parseInt(req.query.year as string) : null;
    const accountId = req.query.accountId as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined; // "BANK" | "WALLET"

    const activeYear = qYear ?? defaultDate.getFullYear();
    const activeMonth = qMonth != null ? qMonth - 1 : defaultDate.getMonth(); // 0-indexed

    const thisStart = new Date(activeYear, activeMonth, 1);
    const thisEnd = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(activeYear, activeMonth - 1, 1);
    const prevEnd = new Date(activeYear, activeMonth, 0, 23, 59, 59, 999);

    // Build where clause berdasarkan filter akun
    const bankWhere: any = { bankAccount: { ownerId: userId } };
    const walletWhere: any = { wallet: { ownerId: userId } };
    if (accountId) {
      if (!accountType || accountType === "BANK") bankWhere.bankAccountId = accountId;
      if (!accountType || accountType === "WALLET") walletWhere.walletId = accountId;
    }

    const skipBank = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    const [thisBankTx, prevBankTx, thisWalletTx, prevWalletTx, bankAccounts, wallets] =
      await Promise.all([
        skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
          where: { ...bankWhere, transactionDate: { gte: thisStart, lte: thisEnd } },
          select: { type: true, amount: true },
        }),
        skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
          where: { ...bankWhere, transactionDate: { gte: prevStart, lte: prevEnd } },
          select: { type: true, amount: true },
        }),
        skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
          where: { ...walletWhere, transactionDate: { gte: thisStart, lte: thisEnd } },
          select: { type: true, amount: true },
        }),
        skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
          where: { ...walletWhere, transactionDate: { gte: prevStart, lte: prevEnd } },
          select: { type: true, amount: true },
        }),
        skipBank ? Promise.resolve([]) : prisma.bankAccount.findMany({
          where: { ownerId: userId, isActive: true, ...(accountId && accountType !== ("WALLET" as string) ? { id: accountId } : {}) },
          select: { id: true },
        }),
        skipWallet ? Promise.resolve([]) : db.digitalWallet.findMany({
          where: { ownerId: userId, isActive: true, ...(accountId && accountType !== ("BANK" as string) ? { id: accountId } : {}) },
          select: { id: true },
        }),
      ]);

    const thisTx = [...thisBankTx, ...thisWalletTx];
    const prevTx = [...prevBankTx, ...prevWalletTx];

    const thisIncome = thisTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const thisExpense = thisTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const thisCount = thisTx.length;

    const prevIncome = prevTx.filter((t: any) => t.type === "CREDIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const prevExpense = prevTx.filter((t: any) => t.type === "DEBIT").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const prevCount = prevTx.length;

    // Total balance dari saldo terakhir tiap rekening + wallet
    const bankBalances = await Promise.all(
      bankAccounts.map((acc: { id: string }) =>
        prisma.bankTransaction.findFirst({
          where: { bankAccountId: acc.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        }),
      ),
    );
    const walletBalances = await Promise.all(
      wallets.map((w: { id: string }) =>
        db.walletTransaction.findFirst({
          where: { walletId: w.id },
          orderBy: { transactionDate: "desc" },
          select: { balance: true },
        }),
      ),
    );
    const totalBalance =
      bankBalances.reduce((s: number, b: any) => s + Number(b?.balance ?? 0), 0) +
      walletBalances.reduce((s: number, b: any) => s + Number(b?.balance ?? 0), 0);

    const activeDate = new Date(activeYear, activeMonth, 1);

    return res.status(200).json({
      totalIncome: thisIncome,
      totalExpense: thisExpense,
      netFlow: thisIncome - thisExpense,
      totalBalance,
      transactionCount: thisCount,
      activePeriod: {
        month: activeMonth + 1,
        year: activeYear,
        label: activeDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      },
      changes: {
        income: pctChange(thisIncome, prevIncome),
        expense: pctChange(thisExpense, prevExpense),
        netFlow: pctChange(thisIncome - thisExpense, prevIncome - prevExpense),
        transactions: pctChange(thisCount, prevCount),
      },
      isUp: {
        income: thisIncome >= prevIncome,
        expense: thisExpense <= prevExpense,
        netFlow: thisIncome - thisExpense >= prevIncome - prevExpense,
        transactions: thisCount >= prevCount,
      },
    });
  } catch (error) {
    console.error("metrics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
