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

  try {
    const db = prisma as any;
    const now = new Date();

    // Filter params
    const accountId = req.query.accountId as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const txType = req.query.type as "CREDIT" | "DEBIT" | undefined;
    const qDateFrom = req.query.dateFrom as string | undefined;
    const qDateTo = req.query.dateTo as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Tentukan range tanggal
    let dateStart: Date;
    let dateEnd: Date;
    if (qDateFrom || qDateTo) {
      dateStart = qDateFrom
        ? new Date(qDateFrom + "T00:00:00")
        : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateEnd = qDateTo ? new Date(qDateTo + "T23:59:59") : now;
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
      ...(search
        ? { description: { contains: search, mode: "insensitive" } }
        : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };
    const walletWhere: any = {
      wallet: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipWallet ? { walletId: accountId } : {}),
      ...(txType ? { type: txType } : {}),
      ...(search
        ? { description: { contains: search, mode: "insensitive" } }
        : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };

    const [recentBankTx, recentWalletTx] = await Promise.all([
      skipBank
        ? Promise.resolve([])
        : prisma.bankTransaction.findMany({
            where: bankWhere,
            include: {
              categories: {
                include: { category: { select: { id: true, name: true } } },
              },
              bankAccount: { select: { bankProvider: true } },
            },
            orderBy: { transactionDate: "desc" },
            take: limit * 2,
          }),
      skipWallet
        ? Promise.resolve([])
        : db.walletTransaction.findMany({
            where: walletWhere,
            include: {
              categories: {
                include: { category: { select: { id: true, name: true } } },
              },
              wallet: { select: { walletProvider: true } },
            },
            orderBy: { transactionDate: "desc" },
            take: limit * 2,
          }),
    ]);

    const recentTx = [
      ...recentBankTx.map((t: any) => ({
        ...t,
        _source: "BANK",
        _provider: t.bankAccount.bankProvider,
      })),
      ...recentWalletTx.map((t: any) => ({
        ...t,
        _source: "WALLET",
        _provider: t.wallet.walletProvider,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      )
      .slice(0, limit);

    // Helper: aggregate category rows by type
    const catDateWhere = { gte: dateStart, lte: dateEnd };

    const buildCatRows = async (type: "DEBIT" | "CREDIT") => {
      const [bankRows, walletRows] = await Promise.all([
        skipBank
          ? Promise.resolve([])
          : prisma.bankTransactionCategory.findMany({
              where: {
                transaction: {
                  bankAccount: { ownerId: userId },
                  type,
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
        skipWallet
          ? Promise.resolve([])
          : db.walletTransactionCategory.findMany({
              where: {
                transaction: {
                  wallet: { ownerId: userId },
                  type,
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

      const merge: Record<string, { name: string; amount: number; count: number }> = {};
      for (const row of [...bankRows, ...walletRows]) {
        const key = row.category.id;
        if (!merge[key]) merge[key] = { name: row.category.name, amount: 0, count: 0 };
        merge[key].amount += Number(row.transaction.amount);
        merge[key].count += 1;
      }

      // Transaksi tanpa kategori → "Lainnya"
      const [uncatBank, uncatWallet] = await Promise.all([
        skipBank
          ? Promise.resolve([])
          : prisma.bankTransaction.findMany({
              where: {
                bankAccount: { ownerId: userId },
                type,
                transactionDate: catDateWhere,
                ...(accountId && !skipBank ? { bankAccountId: accountId } : {}),
                categories: { none: {} },
              },
              select: { amount: true },
            }),
        skipWallet
          ? Promise.resolve([])
          : db.walletTransaction.findMany({
              where: {
                wallet: { ownerId: userId },
                type,
                transactionDate: catDateWhere,
                ...(accountId && !skipWallet ? { walletId: accountId } : {}),
                categories: { none: {} },
              },
              select: { amount: true },
            }),
      ]);

      const uncatTotal = [...uncatBank, ...uncatWallet].reduce(
        (s: number, t: { amount: unknown }) => s + Number(t.amount), 0,
      );
      const uncatCount = uncatBank.length + uncatWallet.length;
      if (uncatTotal > 0 && !categoryId) {
        merge["__lainnya__"] = { name: "Lainnya", amount: uncatTotal, count: uncatCount };
      }

      return Object.entries(merge)
        .map(([id, v]) => ({ id, category: v.name, amount: v.amount, count: v.count }))
        .sort((a, b) => b.amount - a.amount);
    };

    const [spendingByCategory, incomeByCategory] = await Promise.all([
      buildCatRows("DEBIT"),
      buildCatRows("CREDIT"),
    ]);

    const recentTransactions = recentTx.map((t: any) => ({
      id: t.id,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      type: t.type,
      amount: Number(t.amount),
      categories: t.categories.map((c: any) => ({
        id: c.category.id,
        name: c.category.name,
      })),
      category: t.categories[0]?.category?.name ?? "Lainnya",
      bankAccount: t._provider,
      source: t._source,
      status: t.status,
      reference: t.reference,
    }));

    return res.status(200).json({ recentTransactions, spendingByCategory, incomeByCategory });
  } catch (error) {
    console.error("transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
