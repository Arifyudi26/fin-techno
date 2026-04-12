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
    const categoryId = req.query.categoryId as string | undefined;
    const txType = req.query.type as "CREDIT" | "DEBIT" | undefined;
    const qMonth = req.query.month ? parseInt(req.query.month as string) : null;
    const qYear = req.query.year ? parseInt(req.query.year as string) : null;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Tentukan range tanggal
    let dateStart: Date;
    let dateEnd: Date;
    if (qMonth != null && qYear != null) {
      dateStart = new Date(qYear, qMonth - 1, 1);
      dateEnd = new Date(qYear, qMonth, 0, 23, 59, 59, 999);
    } else {
      dateStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateEnd = now;
    }

    const skipBank = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
      ...(txType ? { type: txType } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };
    const walletWhere: any = {
      wallet: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipWallet ? { walletId: accountId } : {}),
      ...(txType ? { type: txType } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };

    const [recentBankTx, recentWalletTx] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
        where: bankWhere,
        include: {
          categories: { include: { category: { select: { id: true, name: true } } } },
          bankAccount: { select: { bankProvider: true } },
        },
        orderBy: { transactionDate: "desc" },
        take: limit * 2,
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          categories: { include: { category: { select: { id: true, name: true } } } },
          wallet: { select: { walletProvider: true } },
        },
        orderBy: { transactionDate: "desc" },
        take: limit * 2,
      }),
    ]);

    const recentTx = [
      ...recentBankTx.map((t: any) => ({ ...t, _source: "BANK", _provider: t.bankAccount.bankProvider })),
      ...recentWalletTx.map((t: any) => ({ ...t, _source: "WALLET", _provider: t.wallet.walletProvider })),
    ]
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, limit);

    // Spending by category — aggregate DEBIT transactions
    const catDateWhere = { gte: dateStart, lte: dateEnd };
    const [bankCatRows, walletCatRows] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransactionCategory.findMany({
        where: {
          transaction: {
            bankAccount: { ownerId: userId },
            type: "DEBIT",
            transactionDate: catDateWhere,
            ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
          },
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          transaction: { select: { amount: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransactionCategory.findMany({
        where: {
          transaction: {
            wallet: { ownerId: userId },
            type: "DEBIT",
            transactionDate: catDateWhere,
            ...(accountId && !skipWallet ? { walletId: accountId } : {}),
          },
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          transaction: { select: { amount: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    const catMerge: Record<string, { name: string; amount: number; count: number }> = {};
    for (const row of [...bankCatRows, ...walletCatRows]) {
      const key = row.category.id;
      if (!catMerge[key]) catMerge[key] = { name: row.category.name, amount: 0, count: 0 };
      catMerge[key].amount += Number(row.transaction.amount);
      catMerge[key].count += 1;
    }

    // Hitung transaksi DEBIT yang tidak punya kategori → masuk "Lainnya"
    const [uncatBankRows, uncatWalletRows] = await Promise.all([
      skipBank ? Promise.resolve([]) : prisma.bankTransaction.findMany({
        where: {
          bankAccount: { ownerId: userId },
          type: "DEBIT",
          transactionDate: catDateWhere,
          ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
          categories: { none: {} },
        },
        select: { amount: true },
      }),
      skipWallet ? Promise.resolve([]) : db.walletTransaction.findMany({
        where: {
          wallet: { ownerId: userId },
          type: "DEBIT",
          transactionDate: catDateWhere,
          ...(accountId && !skipWallet ? { walletId: accountId } : {}),
          categories: { none: {} },
        },
        select: { amount: true },
      }),
    ]);

    const uncatTotal = [...uncatBankRows, ...uncatWalletRows]
      .reduce((s: number, t: { amount: unknown }) => s + Number(t.amount), 0);
    const uncatCount = uncatBankRows.length + uncatWalletRows.length;

    if (uncatTotal > 0 && !categoryId) {
      catMerge["__lainnya__"] = { name: "Lainnya", amount: uncatTotal, count: uncatCount };
    }

    const spendingByCategory = Object.entries(catMerge)
      .map(([id, v]) => ({ id, category: v.name, amount: v.amount, count: v.count }))
      .sort((a, b) => b.amount - a.amount);

    const recentTransactions = recentTx.map((t: any) => ({
      id: t.id,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      type: t.type,
      amount: Number(t.amount),
      categories: t.categories.map((c: any) => ({ id: c.category.id, name: c.category.name })),
      category: t.categories[0]?.category?.name ?? "Lainnya",
      bankAccount: t._provider,
      source: t._source,
      status: t.status,
      reference: t.reference,
    }));

    return res.status(200).json({ recentTransactions, spendingByCategory });
  } catch (error) {
    console.error("transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
