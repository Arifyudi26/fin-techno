/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { type, category, search, page = "1", limit = "10", dateFrom, dateTo, source = "ALL" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  try {
    const db = prisma as any;

    const includeBank = source === "ALL" || source === "BANK";
    const includeWallet = source === "ALL" || source === "WALLET";

    const dateFilter = (dateFrom || dateTo) ? {
      transactionDate: {
        ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
        ...(dateTo ? { lte: new Date(new Date(dateTo as string).setHours(23, 59, 59, 999)) } : {}),
      }
    } : {};

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      ...(type && type !== "ALL" ? { type } : {}),
      ...(category ? { categories: { some: { categoryId: category } } } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...dateFilter,
    };

    const walletWhere: any = {
      wallet: { ownerId: userId },
      ...(type && type !== "ALL" ? { type } : {}),
      ...(category ? { categories: { some: { categoryId: category } } } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" } } : {}),
      ...dateFilter,
    };

    // Hitung total dulu (untuk pagination)
    const [bankTotal, walletTotal] = await Promise.all([
      includeBank ? prisma.bankTransaction.count({ where: bankWhere }) : Promise.resolve(0),
      includeWallet ? db.walletTransaction.count({ where: walletWhere }) : Promise.resolve(0),
    ]);
    const total = bankTotal + walletTotal;

    // Hitung summary (aggregate) dari semua transaksi yang match filter
    const [bankSummary, walletSummary] = await Promise.all([
      includeBank ? prisma.bankTransaction.groupBy({
        by: ["type"],
        where: bankWhere,
        _sum: { amount: true },
      }) : Promise.resolve([]),
      includeWallet ? db.walletTransaction.groupBy({
        by: ["type"],
        where: walletWhere,
        _sum: { amount: true },
      }) : Promise.resolve([]),
    ]);
    const allSummary = [...bankSummary, ...walletSummary] as { type: string; _sum: { amount: any } }[];
    const totalCredit = allSummary.filter(s => s.type === "CREDIT").reduce((acc, s) => acc + Number(s._sum.amount ?? 0), 0);
    const totalDebit = allSummary.filter(s => s.type === "DEBIT").reduce((acc, s) => acc + Number(s._sum.amount ?? 0), 0);
    const summary = { totalCredit, totalDebit, netFlow: totalCredit - totalDebit };

    // Kalau hanya satu source, pakai DB-level pagination langsung
    if (!includeBank) {
      const walletTx = await db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          wallet: { select: { walletProvider: true, phoneNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: limitNum,
      });
      const mapped = walletTx.map((t: any) => mapWallet(t));
      return res.status(200).json(buildResponse(mapped, total, pageNum, limitNum, summary));
    }

    if (!includeWallet) {
      const bankTx = await prisma.bankTransaction.findMany({
        where: bankWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          bankAccount: { select: { bankProvider: true, accountNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: limitNum,
      });
      const mapped = bankTx.map((t: any) => mapBank(t));
      return res.status(200).json(buildResponse(mapped, total, pageNum, limitNum, summary));
    }

    // Kedua source: fetch semua lalu merge-sort-slice
    const fetchCount = skip + limitNum;

    const [bankTx, walletTx] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: bankWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          bankAccount: { select: { bankProvider: true, accountNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        take: fetchCount,
      }),
      db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          categories: { include: { category: { select: { name: true, code: true } } } },
          wallet: { select: { walletProvider: true, phoneNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        take: fetchCount,
      }),
    ]);

    const combined = [
      ...bankTx.map((t: any) => mapBank(t)),
      ...walletTx.map((t: any) => mapWallet(t)),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(skip, skip + limitNum);

    return res.status(200).json(buildResponse(combined, total, pageNum, limitNum, summary));

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

function mapBank(t: any) {
  return {
    id: t.id,
    source: "BANK",
    date: t.transactionDate.toISOString().split("T")[0],
    description: t.description,
    reference: t.reference,
    type: t.type,
    amount: Number(t.amount),
    balance: t.balance != null ? Number(t.balance) : null,
    categories: t.categories.map((c: any) => ({ name: c.category.name, code: c.category.code })),
    category: t.categories[0]?.category?.name ?? "Lainnya",
    categoryCode: t.categories[0]?.category?.code ?? "LNY",
    accountName: t.bankAccount.accountName,
    provider: t.bankAccount.bankProvider,
    status: t.status,
  };
}

function mapWallet(t: any) {
  return {
    id: t.id,
    source: "WALLET",
    date: t.transactionDate.toISOString().split("T")[0],
    description: t.description,
    reference: t.reference,
    type: t.type,
    amount: Number(t.amount),
    balance: t.balance != null ? Number(t.balance) : null,
    categories: t.categories.map((c: any) => ({ name: c.category.name, code: c.category.code })),
    category: t.categories[0]?.category?.name ?? "Lainnya",
    categoryCode: t.categories[0]?.category?.code ?? "LNY",
    accountName: t.wallet.accountName,
    provider: t.wallet.walletProvider,
    status: t.status,
  };
}

function buildResponse(transactions: any[], total: number, page: number, limit: number, summary: { totalCredit: number; totalDebit: number; netFlow: number }) {
  return {
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary,
  };
}
