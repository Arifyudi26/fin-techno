/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { dateFrom, dateTo, source = "ALL" } = req.query;
  if (!dateFrom || !dateTo) return res.status(400).json({ message: "dateFrom dan dateTo wajib diisi" });

  const start = new Date(dateFrom as string);
  const end = new Date(dateTo as string);
  end.setHours(23, 59, 59, 999);

  const db = prisma as any;
  const includeBank = source === "ALL" || source === "BANK";
  const includeWallet = source === "ALL" || source === "WALLET";

  try {
    const [bankTx, walletTx] = await Promise.all([
      includeBank ? prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, transactionDate: { gte: start, lte: end } },
        include: {
          category: { select: { name: true } },
          bankAccount: { select: { bankProvider: true, accountName: true, accountNumber: true } },
        },
        orderBy: { transactionDate: "asc" },
      }) : Promise.resolve([]),
      includeWallet ? db.walletTransaction.findMany({
        where: { wallet: { ownerId: userId }, transactionDate: { gte: start, lte: end } },
        include: {
          category: { select: { name: true } },
          wallet: { select: { walletProvider: true, accountName: true, phoneNumber: true } },
        },
        orderBy: { transactionDate: "asc" },
      }) : Promise.resolve([]),
    ]);

    const allTx = [
      ...bankTx.map((t: any) => ({
        id: t.id, source: "BANK",
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description, reference: t.reference,
        type: t.type, amount: Number(t.amount), balance: t.balance ? Number(t.balance) : null,
        category: t.category?.name ?? "Lainnya",
        provider: t.bankAccount.bankProvider,
        accountName: t.bankAccount.accountName,
        identifier: t.bankAccount.accountNumber,
      })),
      ...walletTx.map((t: any) => ({
        id: t.id, source: "WALLET",
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description, reference: t.reference,
        type: t.type, amount: Number(t.amount), balance: t.balance ? Number(t.balance) : null,
        category: t.category?.name ?? "Lainnya",
        provider: t.wallet.walletProvider,
        accountName: t.wallet.accountName,
        identifier: t.wallet.phoneNumber,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Summary totals
    const totalCredit = allTx.filter(t => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalDebit = allTx.filter(t => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

    // Per-source breakdown
    const sourceMap: Record<string, { provider: string; accountName: string; source: string; credit: number; debit: number; count: number }> = {};
    for (const t of allTx) {
      const key = `${t.source}:${t.provider}:${t.accountName}`;
      if (!sourceMap[key]) sourceMap[key] = { provider: t.provider, accountName: t.accountName, source: t.source, credit: 0, debit: 0, count: 0 };
      if (t.type === "CREDIT") sourceMap[key].credit += t.amount;
      else sourceMap[key].debit += t.amount;
      sourceMap[key].count++;
    }

    // Per-category breakdown
    const catMap: Record<string, { name: string; credit: number; debit: number; count: number }> = {};
    for (const t of allTx) {
      if (!catMap[t.category]) catMap[t.category] = { name: t.category, credit: 0, debit: 0, count: 0 };
      if (t.type === "CREDIT") catMap[t.category].credit += t.amount;
      else catMap[t.category].debit += t.amount;
      catMap[t.category].count++;
    }

    // Daily cashflow for chart
    const dailyMap: Record<string, { date: string; credit: number; debit: number }> = {};
    for (const t of allTx) {
      if (!dailyMap[t.date]) dailyMap[t.date] = { date: t.date, credit: 0, debit: 0 };
      if (t.type === "CREDIT") dailyMap[t.date].credit += t.amount;
      else dailyMap[t.date].debit += t.amount;
    }

    return res.status(200).json({
      summary: {
        totalCredit, totalDebit, netFlow: totalCredit - totalDebit,
        transactionCount: allTx.length,
        bankCount: bankTx.length, walletCount: walletTx.length,
        periodStart: dateFrom, periodEnd: dateTo,
      },
      bySource: Object.values(sourceMap).sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit)),
      byCategory: Object.values(catMap).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)),
      dailyCashflow: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      transactions: allTx,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
