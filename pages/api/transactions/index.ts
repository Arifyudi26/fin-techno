/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { type, category, search, page = "1", limit = "50", dateFrom, dateTo, source = "ALL" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const skip = (pageNum - 1) * limitNum;

  try {
    const db = prisma as any;

    const bankWhere: any = {
      bankAccount: { ownerId: userId },
      ...(type && type !== "ALL" ? { type: type as string } : {}),
      ...(category ? { categoryId: category as string } : {}),
      ...(search ? { description: { contains: search as string, mode: "insensitive" } } : {}),
      ...(dateFrom || dateTo ? {
        transactionDate: {
          ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
          ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
        }
      } : {}),
    };

    const walletWhere: any = {
      wallet: { ownerId: userId },
      ...(type && type !== "ALL" ? { type: type as string } : {}),
      ...(category ? { categoryId: category as string } : {}),
      ...(search ? { description: { contains: search as string, mode: "insensitive" } } : {}),
      ...(dateFrom || dateTo ? {
        transactionDate: {
          ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
          ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
        }
      } : {}),
    };

    const includeBank = source === "ALL" || source === "BANK";
    const includeWallet = source === "ALL" || source === "WALLET";

    const [bankTx, walletTx, bankTotal, walletTotal] = await Promise.all([
      includeBank ? prisma.bankTransaction.findMany({
        where: bankWhere,
        include: {
          category: { select: { name: true, code: true } },
          bankAccount: { select: { bankProvider: true, accountNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        skip: includeWallet ? 0 : skip,
        take: includeWallet ? limitNum * 2 : limitNum,
      }) : Promise.resolve([]),
      includeWallet ? db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          category: { select: { name: true, code: true } },
          wallet: { select: { walletProvider: true, phoneNumber: true, accountName: true } },
        },
        orderBy: { transactionDate: "desc" },
        skip: includeBank ? 0 : skip,
        take: includeBank ? limitNum * 2 : limitNum,
      }) : Promise.resolve([]),
      includeBank ? prisma.bankTransaction.count({ where: bankWhere }) : Promise.resolve(0),
      includeWallet ? db.walletTransaction.count({ where: walletWhere }) : Promise.resolve(0),
    ]);

    const bankMapped = bankTx.map((t: any) => ({
      id: t.id,
      source: "BANK",
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balance: t.balance ? Number(t.balance) : null,
      category: t.category?.name ?? "Lainnya",
      categoryCode: t.category?.code ?? "LNY",
      accountName: t.bankAccount.accountName,
      provider: t.bankAccount.bankProvider,
      status: t.status,
    }));

    const walletMapped = walletTx.map((t: any) => ({
      id: t.id,
      source: "WALLET",
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.description,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balance: t.balance ? Number(t.balance) : null,
      category: t.category?.name ?? "Lainnya",
      categoryCode: t.category?.code ?? "LNY",
      accountName: t.wallet.accountName,
      provider: t.wallet.walletProvider,
      status: t.status,
    }));

    const combined = [...bankMapped, ...walletMapped]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(skip, skip + limitNum);

    const total = bankTotal + walletTotal;
    const totalCredit = combined.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalDebit = combined.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

    return res.status(200).json({
      transactions: combined,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      summary: { totalCredit, totalDebit, netFlow: totalCredit - totalDebit },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
