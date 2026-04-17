/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/db";
import { verifyToken } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  let userId: string;
  try { userId = verifyToken(req).id; }
  catch { return res.status(401).json({ message: "Unauthorized" }); }

  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) return res.status(400).json({ message: "dateFrom and dateTo required" });

  const gte = new Date(dateFrom as string);
  const lte = new Date(new Date(dateTo as string).setHours(23, 59, 59, 999));

  try {
    const db = prisma as any;

    const [bankTx, walletTx] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: { bankAccount: { ownerId: userId }, transactionDate: { gte, lte } },
        select: { id: true, transactionDate: true, type: true, amount: true, description: true },
      }),
      db.walletTransaction.findMany({
        where: { wallet: { ownerId: userId }, transactionDate: { gte, lte } },
        select: { id: true, transactionDate: true, type: true, amount: true, description: true },
      }),
    ]);

    // Group by date — summary + list transaksi per tanggal
    const map: Record<string, {
      date: string;
      totalCredit: number;
      totalDebit: number;
      count: number;
      transactions: { id: string; datetime: string; type: string; amount: number; description: string }[];
    }> = {};

    const add = (t: any) => {
      const dt: Date = t.transactionDate;
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!map[date]) map[date] = { date, totalCredit: 0, totalDebit: 0, count: 0, transactions: [] };
      map[date].count++;
      if (t.type === "CREDIT") map[date].totalCredit += Number(t.amount);
      else map[date].totalDebit += Number(t.amount);
      map[date].transactions.push({
        id: t.id,
        datetime: dt.toISOString(),
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
      });
    };

    bankTx.forEach(add);
    walletTx.forEach(add);

    return res.status(200).json(Object.values(map));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
