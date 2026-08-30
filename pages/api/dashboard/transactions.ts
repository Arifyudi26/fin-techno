/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";
import { st } from "@lib/server-i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: st(req, "unauthorized") }); }

  try {
    const db  = prisma as any;
    const now = new Date();

    const accountId   = req.query.accountId   as string | undefined;
    const accountType = req.query.accountType as "BANK" | "WALLET" | undefined;
    const categoryId  = req.query.categoryId  as string | undefined;
    const txType      = req.query.type        as "CREDIT" | "DEBIT" | undefined;
    const qDateFrom   = req.query.dateFrom    as string | undefined;
    const qDateTo     = req.query.dateTo      as string | undefined;
    const search      = req.query.search      as string | undefined;
    const limit       = Math.min(50, parseInt((req.query.limit as string) || "10"));

    const dateStart = qDateFrom ? new Date(qDateFrom + "T00:00:00") : new Date(now.getTime() - 90 * 86400000);
    const dateEnd   = qDateTo   ? new Date(qDateTo   + "T23:59:59") : now;

    const skipBank   = accountType === "WALLET";
    const skipWallet = accountType === "BANK";

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipBank   ? { bankAccountId: accountId } : {}),
      ...(txType                   ? { type: txType }             : {}),
      ...(search                   ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId               ? { categories: { some: { categoryId } } } : {}),
    };

    const walletWhere: any = {
      wallet: { ownerId: userId },
      transactionDate: { gte: dateStart, lte: dateEnd },
      ...(accountId && !skipWallet ? { walletId: accountId } : {}),
      ...(txType                   ? { type: txType }         : {}),
      ...(search                   ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId               ? { categories: { some: { categoryId } } } : {}),
    };

    // Recent transactions + category aggregation — all parallel 
    const [recentBankTx, recentWalletTx] = await Promise.all([
        // Recent tx — use select (not include) to avoid N+1
        skipBank ? [] : prisma.bankTransaction.findMany({
          where: bankWhere,
          select: {
            id: true, transactionDate: true, type: true, amount: true,
            description: true, reference: true, status: true,
            bankAccount: { select: { bankProvider: true, accountName: true } },
            categories: { select: { category: { select: { id: true, name: true } } } },
          },
          orderBy: { transactionDate: "desc" },
          take: limit * 2,
        }),
        skipWallet ? [] : db.walletTransaction.findMany({
          where: walletWhere,
          select: {
            id: true, transactionDate: true, type: true, amount: true,
            description: true, reference: true, status: true,
            wallet: { select: { walletProvider: true, accountName: true } },
            categories: { select: { category: { select: { id: true, name: true } } } },
          },
          orderBy: { transactionDate: "desc" },
          take: limit * 2,
        }),
      ]);

    // Map recent transactions 
    const recentTransactions = [
      ...recentBankTx.map((t: any) => ({
        id: t.id,
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        categories: t.categories.map((c: any) => ({ id: c.category.id, name: c.category.name })),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        bankAccount: t.bankAccount.bankProvider,
        source: "BANK",
        status: t.status,
        reference: t.reference ?? null,
      })),
      ...recentWalletTx.map((t: any) => ({
        id: t.id,
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        categories: t.categories.map((c: any) => ({ id: c.category.id, name: c.category.name })),
        category: t.categories[0]?.category?.name ?? "Lainnya",
        bankAccount: t.wallet.walletProvider,
        source: "WALLET",
        status: t.status,
        reference: t.reference ?? null,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    // Category aggregation — fetch amounts via raw SQL (2 simple queries) 
    // groupBy only gives count, not sum — use raw for amounts
    const buildCatAmounts = async (type: "DEBIT" | "CREDIT") => {
      const params: unknown[] = [userId, dateStart, dateEnd];
      const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

      const acctBankC   = accountId && !skipBank   ? `AND bt."bankAccountId" = ${p(accountId)}` : "";
      const acctWalletC = accountId && !skipWallet ? `AND wt."walletId" = ${p(accountId)}`      : "";
      const catBankC    = categoryId ? `AND btc."categoryId" = ${p(categoryId)}` : "";
      const catWalletC  = categoryId ? `AND wtc."categoryId" = $${params.length}` : "";
      const typeStr     = type;

      const parts: string[] = [];

      if (!skipBank) {
        parts.push(`
          SELECT COALESCE(tc.id, '__lainnya__') AS cat_id,
                 COALESCE(tc.name, 'Lainnya')   AS cat_name,
                 bt.amount::numeric
          FROM "BankTransaction" bt
          JOIN "BankAccount" ba ON ba.id = bt."bankAccountId"
          LEFT JOIN "BankTransactionCategory" btc ON btc."transactionId" = bt.id ${catBankC}
          LEFT JOIN "TransactionCategory" tc ON tc.id = btc."categoryId"
          WHERE ba."ownerId" = $1
            AND bt.type = '${typeStr}'
            AND bt."transactionDate" BETWEEN $2 AND $3
            ${acctBankC}
        `);
      }

      if (!skipWallet) {
        parts.push(`
          SELECT COALESCE(tc.id, '__lainnya__') AS cat_id,
                 COALESCE(tc.name, 'Lainnya')   AS cat_name,
                 wt.amount::numeric
          FROM "WalletTransaction" wt
          JOIN "DigitalWallet" dw ON dw.id = wt."walletId"
          LEFT JOIN "WalletTransactionCategory" wtc ON wtc."transactionId" = wt.id ${catWalletC}
          LEFT JOIN "TransactionCategory" tc ON tc.id = wtc."categoryId"
          WHERE dw."ownerId" = $1
            AND wt.type = '${typeStr}'
            AND wt."transactionDate" BETWEEN $2 AND $3
            ${acctWalletC}
        `);
      }

      if (parts.length === 0) return [];

      const sql = `
        SELECT cat_id, cat_name, SUM(amount)::text AS total, COUNT(*) AS cnt
        FROM (${parts.join(" UNION ALL ")}) t
        GROUP BY cat_id, cat_name
        ORDER BY SUM(amount) DESC
      `;

      const rows = await prisma.$queryRawUnsafe<
        { cat_id: string; cat_name: string; total: string; cnt: bigint }[]
      >(sql, ...params);

      return rows.map((r) => ({
        id:       r.cat_id,
        category: r.cat_name,
        amount:   Number(r.total),
        count:    Number(r.cnt),
      }));
    };

    const [spendingByCategory, incomeByCategory] = await Promise.all([
      buildCatAmounts("DEBIT"),
      buildCatAmounts("CREDIT"),
    ]);

    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res.status(200).json({ recentTransactions, spendingByCategory, incomeByCategory });
  } catch (error) {
    console.error("dashboard/transactions error:", error);
    return res.status(500).json({ message: st(req, "serverError") });
  }
}
